import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type TouchEvent as ReactTouchEvent,
} from "react";
import {
  arePrerequisitesMet,
  computeDestinyPerkPointsSpent,
  getEarnedDestinyPerkPoints,
  getPerkSkillId,
  getStoredSkillLevel,
} from "@/engine/buildEngine";
import type { PerkTree } from "@/data/schemas";
import { PerkNode } from "@/components/PerkNode";
import { useSupportsHover } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { getPerkNodeRequirements } from "@/lib/perkRequirements";
import {
  computePerkTreeEdgesPercentInBounds,
  getPerkAllocationRank,
  getNextRankInStack,
  getPerkPercentPositionInBounds,
  getPerkPositionKey,
  getPerkStackRank,
  getPerkTreeContentBounds,
  getVisiblePerksForTree,
  groupPerksByPosition,
  resolvePerkTakeTarget,
} from "@/lib/perkTreeGrid";
import {
  clampTreeViewTransform,
  computeFitContainSize,
  DEFAULT_TREE_VIEW_TRANSFORM,
  getFitLayoutTuning,
  getTouchDistance,
  getViewportPointFromCenter,
  GRID_UNIT_PX,
  isPerkTreeInteractiveTarget,
  MIN_TREE_ZOOM,
  resolvePerkTooltipScale,
  resolveTreeLayoutMetrics,
  type FitLayoutTuning,
  type TreeViewClampContext,
  type TreeViewTransform,
  zoomTreeViewAtPoint,
} from "@/lib/perkTreeViewLayout";
import { useBuildStore } from "@/store/buildStore";
import { useUiStore } from "@/store/uiStore";
import { usePerkBadgePlacements } from "@/hooks/usePerkBadgePlacements";
import { DEFAULT_PERK_BADGE_PLACEMENT } from "@/lib/perkBadgeLayout";

const EDITOR_NODE_EXTENT = 1.25;
const EDITOR_BOUNDS_PADDING = 1.45;
const DESTINY_SKILL_ID = "destiny";

const DEFAULT_FIT_TUNING: FitLayoutTuning = getFitLayoutTuning(1920, 1080);

function useFitContainArea(enabled: boolean) {
  const areaRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState<{
    width: number;
    height: number;
  } | null>(null);

  useEffect(() => {
    if (!enabled) {
      setContainerSize(null);
      return;
    }

    const element = areaRef.current;
    if (!element) return;

    const update = () => {
      const containerWidth = element.clientWidth;
      const containerHeight = element.clientHeight;
      if (!containerWidth || !containerHeight) return;
      setContainerSize({ width: containerWidth, height: containerHeight });
    };

    const observer = new ResizeObserver(update);
    observer.observe(element);
    update();

    return () => observer.disconnect();
  }, [enabled]);

  return { areaRef, containerSize };
}

interface PerkTreeViewProps {
  tree: PerkTree;
  labels: Record<string, string>;
  conflictPerkIds?: string[];
  playerLevelConflictPerkIds?: string[];
  /** Scale the tree to fit and center within the parent area. */
  fit?: boolean;
  className?: string;
}

function PerkTreeView({
  tree,
  labels,
  conflictPerkIds = [],
  playerLevelConflictPerkIds = [],
  fit = false,
  className,
}: PerkTreeViewProps) {
  const gameData = useBuildStore((s) => s.gameData);
  const build = useBuildStore((s) => s.build);
  const perkPointsRemaining = useBuildStore((s) => s.computed?.perkPointsRemaining ?? 0);
  const tryTakePerk = useBuildStore((s) => s.tryTakePerk);
  const allocatePerk = useBuildStore((s) => s.allocatePerk);
  const removePerk = useBuildStore((s) => s.removePerk);
  const perkBadgeVisibility = useUiStore((s) => s.perkBadgeVisibility);
  const treeCanvasRef = useRef<HTMLDivElement>(null);
  const tookPerkWithLastClickRef = useRef(false);
  const supportsHover = useSupportsHover();
  const [touchTooltip, setTouchTooltip] = useState<{
    positionKey: string;
    anchor: { x: number; y: number };
  } | null>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const panDragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    startPanX: number;
    startPanY: number;
  } | null>(null);
  const pinchStateRef = useRef<{
    distance: number;
    transform: TreeViewTransform;
    pivotX: number;
    pivotY: number;
  } | null>(null);
  const viewTransformRef = useRef(DEFAULT_TREE_VIEW_TRANSFORM);
  const clampContextRef = useRef<TreeViewClampContext | null>(null);
  const [viewTransform, setViewTransform] = useState<TreeViewTransform>(DEFAULT_TREE_VIEW_TRANSFORM);
  const [isPanning, setIsPanning] = useState(false);

  viewTransformRef.current = viewTransform;

  const applyViewTransform = useCallback((next: TreeViewTransform) => {
    const context = clampContextRef.current;
    const resolved =
      context && next.zoom > MIN_TREE_ZOOM
        ? clampTreeViewTransform(next, context)
        : next.zoom <= MIN_TREE_ZOOM
          ? DEFAULT_TREE_VIEW_TRANSFORM
          : next;
    viewTransformRef.current = resolved;
    setViewTransform(resolved);
  }, []);

  useEffect(() => {
    applyViewTransform(DEFAULT_TREE_VIEW_TRANSFORM);
    panDragRef.current = null;
    pinchStateRef.current = null;
    setIsPanning(false);
    setTouchTooltip(null);
  }, [tree.skillId, applyViewTransform]);

  useEffect(() => {
    if (!touchTooltip || supportsHover) return;

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (target instanceof Element && target.closest("[data-perk-node]")) return;
      setTouchTooltip(null);
    };

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [touchTooltip, supportsHover]);

  const openTouchTooltip = useCallback(
    (positionKey: string, anchor: { x: number; y: number }) => {
      setTouchTooltip({ positionKey, anchor });
    },
    [],
  );

  const closeTouchTooltip = useCallback(() => {
    setTouchTooltip(null);
  }, []);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport || !fit) return;

    const handleWheel = (event: WheelEvent) => {
      event.preventDefault();
      const point = getViewportPointFromCenter(viewport, event.clientX, event.clientY);
      const zoomFactor = Math.exp(-event.deltaY * 0.002);
      const current = viewTransformRef.current;
      const next = zoomTreeViewAtPoint(
        current,
        current.zoom * zoomFactor,
        point.x,
        point.y,
      );
      if (
        next.zoom === current.zoom &&
        next.panX === current.panX &&
        next.panY === current.panY
      ) {
        return;
      }
      applyViewTransform(next);
    };

    viewport.addEventListener("wheel", handleWheel, { passive: false });
    return () => viewport.removeEventListener("wheel", handleWheel);
  }, [fit, applyViewTransform]);

  const handleViewportPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!fit || viewTransformRef.current.zoom <= MIN_TREE_ZOOM) return;
    if (event.pointerType === "mouse" && event.button !== 0) return;
    if (isPerkTreeInteractiveTarget(event.target)) return;

    panDragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      startPanX: viewTransformRef.current.panX,
      startPanY: viewTransformRef.current.panY,
    };
    setIsPanning(true);
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handleViewportPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (pinchStateRef.current) return;
    const drag = panDragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;

    applyViewTransform({
      ...viewTransformRef.current,
      panX: drag.startPanX + (event.clientX - drag.startX),
      panY: drag.startPanY + (event.clientY - drag.startY),
    });
  };

  const endPanDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = panDragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    panDragRef.current = null;
    setIsPanning(false);
    event.currentTarget.releasePointerCapture(event.pointerId);
  };

  const handleTouchStart = (event: ReactTouchEvent<HTMLDivElement>) => {
    if (!fit || event.touches.length !== 2 || !viewportRef.current) return;

    const point = getViewportPointFromCenter(
      viewportRef.current,
      (event.touches[0].clientX + event.touches[1].clientX) / 2,
      (event.touches[0].clientY + event.touches[1].clientY) / 2,
    );
    pinchStateRef.current = {
      distance: getTouchDistance(event.touches),
      transform: viewTransformRef.current,
      pivotX: point.x,
      pivotY: point.y,
    };
  };

  const handleTouchMove = (event: ReactTouchEvent<HTMLDivElement>) => {
    if (!fit || event.touches.length !== 2 || !pinchStateRef.current) return;

    const distance = getTouchDistance(event.touches);
    if (!distance || !pinchStateRef.current.distance) return;

    const pinch = pinchStateRef.current;
    const next = zoomTreeViewAtPoint(
      pinch.transform,
      pinch.transform.zoom * (distance / pinch.distance),
      pinch.pivotX,
      pinch.pivotY,
    );
    if (
      next.zoom === viewTransformRef.current.zoom &&
      next.panX === viewTransformRef.current.panX &&
      next.panY === viewTransformRef.current.panY
    ) {
      return;
    }
    applyViewTransform(next);
  };

  const handleTouchEnd = () => {
    pinchStateRef.current = null;
  };

  const isTransformedView =
    viewTransform.zoom !== MIN_TREE_ZOOM ||
    viewTransform.panX !== 0 ||
    viewTransform.panY !== 0;

  const isDestinyTree = tree.skillId === DESTINY_SKILL_ID;

  const { areaRef, containerSize } = useFitContainArea(fit);
  const fitTuning = useMemo(
    () =>
      containerSize
        ? getFitLayoutTuning(containerSize.width, containerSize.height)
        : DEFAULT_FIT_TUNING,
    [containerSize],
  );
  const bounds = useMemo(
    () =>
      getPerkTreeContentBounds(
        tree,
        EDITOR_NODE_EXTENT,
        fit
          ? EDITOR_BOUNDS_PADDING + fitTuning.boundsExtraPadding
          : EDITOR_BOUNDS_PADDING,
      ),
    [tree, fit, fitTuning.boundsExtraPadding],
  );
  const aspect = bounds.width / bounds.height;
  const fitSize = useMemo(() => {
    if (!fit || !containerSize) return null;
    return computeFitContainSize(
      containerSize.width,
      containerSize.height,
      aspect,
      fitTuning.regionInsetRatio,
    );
  }, [fit, containerSize, aspect, fitTuning.regionInsetRatio]);
  const visiblePerks = useMemo(
    () => getVisiblePerksForTree(tree, build.selectedPerkIds),
    [tree, build.selectedPerkIds],
  );
  const { gridUnitPx, nodeDiameterPx, treeEdgePaddingPx } = useMemo(
    () => resolveTreeLayoutMetrics(bounds, fit, fitSize, visiblePerks, fitTuning),
    [bounds, fit, fitSize, visiblePerks, fitTuning],
  );
  const tooltipScale = useMemo(
    () =>
      resolvePerkTooltipScale(
        nodeDiameterPx,
        containerSize ? Math.min(containerSize.width, containerSize.height) : null,
      ),
    [nodeDiameterPx, containerSize],
  );
  const badgeLayoutRevision = useMemo(
    () =>
      [
        viewTransform.zoom,
        viewTransform.panX,
        viewTransform.panY,
        containerSize?.width ?? 0,
        containerSize?.height ?? 0,
        fitSize?.width ?? 0,
        fitSize?.height ?? 0,
        treeEdgePaddingPx,
      ].join(":"),
    [viewTransform, containerSize, fitSize, treeEdgePaddingPx],
  );
  const badgeLayoutRevisionKey = useMemo(
    () =>
      [
        badgeLayoutRevision,
        perkBadgeVisibility.playerLevelReq,
        perkBadgeVisibility.skillLevelReq,
        perkBadgeVisibility.perkName,
        build.selectedPerkIds.join(","),
        visiblePerks.length,
      ].join(":"),
    [badgeLayoutRevision, perkBadgeVisibility, build.selectedPerkIds, visiblePerks.length],
  );
  const badgePlacements = usePerkBadgePlacements(treeCanvasRef, badgeLayoutRevisionKey);

  clampContextRef.current =
    containerSize && fitSize
      ? {
          viewport: containerSize,
          fitSize,
          nodeDiameterPx,
        }
      : null;

  const nodeRadiusGrid = nodeDiameterPx / (2 * gridUnitPx);

  const edges = useMemo(
    () =>
      computePerkTreeEdgesPercentInBounds(tree, build.selectedPerkIds, bounds, {
        nodeRadiusByPerkId: () => nodeRadiusGrid,
      }),
    [tree, build.selectedPerkIds, bounds, nodeRadiusGrid],
  );

  const stacksByPosition = useMemo(() => groupPerksByPosition(tree), [tree]);

  const paintOrderedPerks = useMemo(
    () =>
      [...visiblePerks].sort((a, b) => {
        if (a.position.y !== b.position.y) return b.position.y - a.position.y;
        return b.position.x - a.position.x;
      }),
    [visiblePerks],
  );

  const conflictPositionKeys = useMemo(() => {
    const keys = new Set<string>();
    for (const perkId of conflictPerkIds) {
      const perk = tree.perks.find((candidate) => candidate.id === perkId);
      if (perk) {
        keys.add(getPerkPositionKey(perk.position));
      }
    }
    return keys;
  }, [conflictPerkIds, tree.perks]);

  const playerLevelConflictPositionKeys = useMemo(() => {
    const keys = new Set<string>();
    for (const perkId of playerLevelConflictPerkIds) {
      const perk = tree.perks.find((candidate) => candidate.id === perkId);
      if (perk) {
        keys.add(getPerkPositionKey(perk.position));
      }
    }
    return keys;
  }, [playerLevelConflictPerkIds, tree.perks]);

  if (!gameData) return null;
  const destinyRemaining = isDestinyTree
    ? getEarnedDestinyPerkPoints(gameData.game, build) -
      computeDestinyPerkPointsSpent(gameData.game, build)
    : 0;

  const treeCanvas = (
    <div
      ref={treeCanvasRef}
      data-perk-tree-viewport={fit ? undefined : true}
      className={cn("relative h-full w-full", !fit && "overflow-hidden")}
      style={
        fit
          ? undefined
          : {
              aspectRatio: `${bounds.width} / ${bounds.height}`,
              width: `min(100%, ${bounds.width * GRID_UNIT_PX}px)`,
            }
      }
    >
      <svg className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden>
        {edges.map((edge, i) => (
          <line
            key={i}
            x1={`${edge.x1}%`}
            y1={`${edge.y1}%`}
            x2={`${edge.x2}%`}
            y2={`${edge.y2}%`}
            stroke={edge.active ? "var(--color-accent)" : "var(--color-border)"}
            strokeWidth={edge.active ? 1.25 : 1.5}
            strokeOpacity={
              edge.active ? 0.85 : edge.kind === "any" ? 0.55 : 0.45
            }
            strokeDasharray={edge.kind === "any" ? "4 3" : undefined}
            strokeLinecap="round"
          />
        ))}
      </svg>
      {paintOrderedPerks.map((perk, index) => {
        const positionKey = getPerkPositionKey(perk.position);
        const stack = stacksByPosition.get(positionKey) ?? [perk];
        const stackRank =
          stack.length > 1
            ? getPerkStackRank(stack, build.selectedPerkIds)
            : getPerkAllocationRank(perk, build.selectedPerkIds);
        const nextRank = getNextRankInStack(stack, build.selectedPerkIds);
        const isSelected = build.selectedPerkIds.includes(perk.id);
        const prereqsMet = arePrerequisitesMet(gameData.game, build, perk);
        const isConflict =
          conflictPositionKeys.has(positionKey) ||
          playerLevelConflictPositionKeys.has(positionKey);
        const takeTargetId = resolvePerkTakeTarget(stack, build.selectedPerkIds);
        const takeTargetPerk = stack.find((candidate) => candidate.id === takeTargetId) ?? perk;
        const tooltipPerk = isSelected ? perk : takeTargetPerk;
        const badgePerk = nextRank ?? takeTargetPerk;

        const tooltipRequirements = getPerkNodeRequirements(tooltipPerk);
        const badgeRequirements = getPerkNodeRequirements(badgePerk);
        const requirements = isDestinyTree
          ? { ...tooltipRequirements, skillReq: null }
          : tooltipRequirements;
        const nodeBadgeRequirements = isDestinyTree
          ? { ...badgeRequirements, skillReq: null }
          : badgeRequirements;

        const meetsPlayerLevelReq = (() => {
          const playerLevelReq = getPerkNodeRequirements(takeTargetPerk).playerLevelReq;
          return playerLevelReq == null || build.playerLevel >= playerLevelReq;
        })();

        const meetsPerkReq =
          meetsPlayerLevelReq &&
          (isDestinyTree
            ? !takeTargetPerk.costsPerkPoint || destinyRemaining >= 1
            : (() => {
                const skillId = getPerkSkillId(gameData.game, takeTargetPerk.id);
                const skillLevel = skillId ? getStoredSkillLevel(gameData.game, build, skillId) : 0;
                if (skillLevel < takeTargetPerk.skillReq) return false;
                if (!takeTargetPerk.costsPerkPoint) return true;
                return perkPointsRemaining >= 1;
              })());

        const isAvailable = !isSelected && prereqsMet && meetsPerkReq;
        const isLocked = !isSelected && (!prereqsMet || !meetsPerkReq);
        const canUpgradeRank =
          isSelected && (stackRank?.unbounded ? prereqsMet && meetsPerkReq : nextRank !== undefined);

        return (
          <PerkNode
            key={positionKey}
            perk={perk}
            position={getPerkPercentPositionInBounds(perk.position, bounds)}
            requirements={requirements}
            badgeRequirements={nodeBadgeRequirements}
            takeTargetId={takeTargetId}
            stackRank={stackRank}
            canUpgradeRank={canUpgradeRank}
            nextRank={nextRank}
            isSelected={isSelected}
            isAvailable={isAvailable}
            isLocked={isLocked}
            isConflict={isConflict}
            isInteractive
            paintOrder={20 + index}
            nodeDiameterPx={nodeDiameterPx}
            tookPerkWithLastClickRef={tookPerkWithLastClickRef}
            onTryTake={tryTakePerk}
            onForceTake={allocatePerk}
            onRemove={removePerk}
            labels={labels}
            badgeVisibility={perkBadgeVisibility}
            badgePerkName={badgePerk.name}
            badgePlacement={badgePlacements.get(positionKey) ?? DEFAULT_PERK_BADGE_PLACEMENT}
            positionKey={positionKey}
            tooltipScale={tooltipScale}
            touchTooltipOpen={touchTooltip?.positionKey === positionKey}
            touchAnchor={
              touchTooltip?.positionKey === positionKey ? touchTooltip.anchor : null
            }
            onOpenTouchTooltip={(anchor) => openTouchTooltip(positionKey, anchor)}
            onCloseTouchTooltip={closeTouchTooltip}
          />
        );
      })}
    </div>
  );

  if (fit) {
    return (
      <div ref={areaRef} className={cn("h-full min-h-0 w-full", className)}>
        <div
          ref={viewportRef}
          data-perk-tree-viewport
          className={cn(
            "relative h-full w-full touch-none overflow-hidden",
            isPanning
              ? "cursor-grabbing"
              : viewTransform.zoom > MIN_TREE_ZOOM && "cursor-grab",
          )}
          onPointerDown={handleViewportPointerDown}
          onPointerMove={handleViewportPointerMove}
          onPointerUp={endPanDrag}
          onPointerCancel={endPanDrag}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onTouchCancel={handleTouchEnd}
        >
          <div
            className="pointer-events-none absolute right-2 top-2 z-30"
            aria-live="polite"
            aria-label={`Zoom ${Math.round(viewTransform.zoom * 100)} percent`}
          >
            <span className="rounded-full border border-[var(--color-border)]/70 bg-[var(--color-surface)]/90 px-2 py-0.5 text-[10px] font-semibold tabular-nums text-[var(--color-muted)] shadow-[0_2px_8px_rgba(0,0,0,0.35)] backdrop-blur-sm">
              {Math.round(viewTransform.zoom * 100)}%
            </span>
          </div>
          <div className="flex h-full w-full items-center justify-center">
            {fitSize ? (
              <div
                className="relative shrink-0 box-border"
                style={{
                  width: fitSize.width,
                  height: fitSize.height,
                  padding: treeEdgePaddingPx,
                  ...(isTransformedView
                    ? {
                        transform: `translate(${viewTransform.panX}px, ${viewTransform.panY}px) scale(${viewTransform.zoom})`,
                        transformOrigin: "center center",
                      }
                    : undefined),
                }}
              >
                <div className="relative h-full w-full">{treeCanvas}</div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    );
  }

  return <div className={className}>{treeCanvas}</div>;
}

export { PerkTreeView };
