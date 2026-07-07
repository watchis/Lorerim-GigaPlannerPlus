import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent,
  type MutableRefObject,
  type PointerEvent as ReactPointerEvent,
} from "react";
import {
  arePrerequisitesMet,
  computeDestinyPerkPointsSpent,
  getEarnedDestinyPerkPoints,
  getPerkSkillId,
  getStoredSkillLevel,
} from "@/engine/buildEngine";
import type { Perk, PerkTree } from "@/data/schemas";
import { CursorTooltip, useSupportsHover } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import {
  formatPerkNodeRequirementLabel,
  getPerkNodeRequirements,
} from "@/lib/perkRequirements";
import {
  computePerkTreeEdgesPercentInBounds,
  getNextRankInStack,
  getPerkPercentPositionInBounds,
  getPerkPositionKey,
  getPerkStackRank,
  getPerkTreeContentBounds,
  getMinDistinctPerkCenterDistanceGrid,
  getVisiblePerksForTree,
  groupPerksByPosition,
  resolvePerkNodeDiameterPx,
  resolvePerkTakeTarget,
} from "@/lib/perkTreeGrid";
import { useBuildStore } from "@/store/buildStore";

const EDITOR_NODE_EXTENT = 1.25;
const EDITOR_BOUNDS_PADDING = 1.45;
const GRID_UNIT_PX = 26;
/** Shrink fitted trees so nodes sit inset from the render region edges. */
const FIT_REGION_INSET_RATIO = 0.9;
/** Minimum grid unit when scrolling a tree on narrow viewports. */
const SCROLLABLE_GRID_UNIT_PX = 30;
const DESTINY_SKILL_ID = "destiny";
const BASE_NODE_DIAMETER_PX = 32;
const MIN_NODE_DIAMETER_PX = 14;
/** Extra padding between perk tree content and the viewport edge in full-tree view. */
const TREE_VIEW_EDGE_PADDING_PX = 12;

function getTreeLayoutMetrics(
  bounds: { width: number; height: number },
  fit: boolean,
  fitSize: { width: number; height: number } | null,
  visiblePerks: Perk[],
): { gridUnitPx: number; nodeDiameterPx: number } {
  const gridUnitPx =
    fit && fitSize
      ? Math.min(fitSize.width / bounds.width, fitSize.height / bounds.height)
      : GRID_UNIT_PX;

  const nodeDiameterPx = resolvePerkNodeDiameterPx(
    gridUnitPx,
    getMinDistinctPerkCenterDistanceGrid(visiblePerks),
    {
      baseDiameterPx: BASE_NODE_DIAMETER_PX,
      gridUnitReferencePx: GRID_UNIT_PX,
      minDiameterPx: MIN_NODE_DIAMETER_PX,
    },
  );

  return { gridUnitPx, nodeDiameterPx };
}

function perkAbbreviation(name: string): string {
  const words = name.split(/\s+/).filter((word) => /[A-Za-z]/.test(word));
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }
  const letters = name.replace(/[^A-Za-z]/g, "");
  return (letters.slice(0, 2) || "?").toUpperCase();
}

function renderNextRankSection(nextRank: Perk, labels: Record<string, string>) {
  const nextRankRequirements = getPerkNodeRequirements(nextRank);
  return (
    <div className="mt-2 border-t border-[var(--color-border)]/60 pt-2">
      <p className="text-xs font-medium text-[var(--color-accent-muted)]">
        {labels.nextRank}
      </p>
      {nextRankRequirements.skillReq !== null && (
        <p className="mt-1 text-xs text-[var(--color-muted)]">
          {labels.skillReq}: {nextRankRequirements.skillReq}
        </p>
      )}
      {nextRankRequirements.playerLevelReq !== null && (
        <p
          className={cn(
            "text-xs",
            nextRankRequirements.skillReq !== null ? "mt-0.5" : "mt-1",
            "text-[var(--color-muted)]",
          )}
        >
          {labels.playerLevelReq}: {nextRankRequirements.playerLevelReq}
        </p>
      )}
      <p className="mt-1 text-xs leading-relaxed">{nextRank.description}</p>
    </div>
  );
}

interface PerkNodeProps {
  perk: Perk;
  position: { x: number; y: number };
  requirements: { skillReq: number | null; playerLevelReq: number | null };
  badgeRequirements: { skillReq: number | null; playerLevelReq: number | null };
  takeTargetId: string;
  stackRank: { current: number; total: number } | null;
  nextRank: Perk | undefined;
  isSelected: boolean;
  isAvailable: boolean;
  isLocked: boolean;
  isConflict: boolean;
  isInteractive: boolean;
  paintOrder: number;
  nodeDiameterPx: number;
  tookPerkWithLastClickRef: MutableRefObject<boolean>;
  onTryTake: (perkId: string) => boolean;
  onForceTake: (perkId: string) => boolean;
  onRemove: (perkId: string) => void;
  labels: Record<string, string>;
  showSkillRequirements: boolean;
}

function PerkNode({
  perk,
  position,
  requirements,
  badgeRequirements,
  takeTargetId,
  stackRank,
  nextRank,
  isSelected,
  isAvailable,
  isLocked,
  isConflict,
  isInteractive,
  paintOrder,
  nodeDiameterPx,
  tookPerkWithLastClickRef,
  onTryTake,
  onForceTake,
  onRemove,
  labels,
  showSkillRequirements,
}: PerkNodeProps) {
  const supportsHover = useSupportsHover();
  const longPressTimerRef = useRef<number | null>(null);
  const longPressTriggeredRef = useRef(false);
  const singleTapTimerRef = useRef<number | null>(null);
  const lastTapRef = useRef(0);
  const touchInteractionRef = useRef(false);
  const touchClearRef = useRef<number | null>(null);
  const pointerAnchorRef = useRef({ x: 0, y: 0 });
  const [touchTooltipOpen, setTouchTooltipOpen] = useState(false);
  const [touchAnchor, setTouchAnchor] = useState<{ x: number; y: number } | null>(null);

  const clearLongPressTimer = () => {
    if (longPressTimerRef.current !== null) {
      window.clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const clearSingleTapTimer = () => {
    if (singleTapTimerRef.current !== null) {
      window.clearTimeout(singleTapTimerRef.current);
      singleTapTimerRef.current = null;
    }
  };

  const markTouchInteraction = () => {
    touchInteractionRef.current = true;
    if (touchClearRef.current !== null) {
      window.clearTimeout(touchClearRef.current);
    }
    touchClearRef.current = window.setTimeout(() => {
      touchInteractionRef.current = false;
      touchClearRef.current = null;
    }, 500);
  };

  const clearTouchInteraction = () => {
    if (touchClearRef.current !== null) {
      window.clearTimeout(touchClearRef.current);
      touchClearRef.current = null;
    }
    touchInteractionRef.current = false;
  };

  const showTouchTooltip = (x: number, y: number) => {
    if (supportsHover) return;
    setTouchAnchor({ x, y });
    setTouchTooltipOpen(true);
  };

  useEffect(() => {
    if (!touchTooltipOpen || supportsHover) return;

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (target instanceof Element && target.closest("[data-perk-node]")) return;
      setTouchTooltipOpen(false);
    };

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [touchTooltipOpen, supportsHover]);

  const handleForceAllocate = () => {
    if (!isInteractive || tookPerkWithLastClickRef.current) return false;
    const tookPerk = onForceTake(perk.id);
    tookPerkWithLastClickRef.current = tookPerk;
    return tookPerk;
  };

  const handleMouseDown = (event: MouseEvent<HTMLButtonElement>) => {
    if (!isInteractive) return;
    if (touchInteractionRef.current) {
      event.preventDefault();
      return;
    }

    window.getSelection()?.removeAllRanges();

    if (event.button === 2) {
      event.preventDefault();
      event.stopPropagation();
      onRemove(perk.id);
      return;
    }

    if (event.button !== 0) return;

    if (event.detail > 1) {
      handleForceAllocate();
      return;
    }

    tookPerkWithLastClickRef.current = onTryTake(takeTargetId);
  };

  const handlePointerDown = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (!isInteractive) return;

    longPressTriggeredRef.current = false;
    clearLongPressTimer();

    if (event.pointerType === "mouse") {
      handleMouseDown(event as unknown as MouseEvent<HTMLButtonElement>);
      return;
    }

    markTouchInteraction();
    pointerAnchorRef.current = { x: event.clientX, y: event.clientY };

    longPressTimerRef.current = window.setTimeout(() => {
      longPressTriggeredRef.current = true;
      if (isSelected) {
        onRemove(perk.id);
      } else {
        const selected = handleForceAllocate();
        if (selected) {
          showTouchTooltip(pointerAnchorRef.current.x, pointerAnchorRef.current.y);
        }
      }
    }, 500);
  };

  const handlePointerUp = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (event.pointerType === "mouse") return;

    clearLongPressTimer();
    if (!isInteractive || longPressTriggeredRef.current) {
      if (longPressTriggeredRef.current) {
        longPressTriggeredRef.current = false;
      }
      return;
    }

    const now = Date.now();
    if (now - lastTapRef.current < 300) {
      clearSingleTapTimer();
      lastTapRef.current = 0;
      handleForceAllocate();
      showTouchTooltip(event.clientX, event.clientY);
      return;
    }

    lastTapRef.current = now;
    clearSingleTapTimer();
    const anchor = { x: event.clientX, y: event.clientY };
    singleTapTimerRef.current = window.setTimeout(() => {
      singleTapTimerRef.current = null;
      tookPerkWithLastClickRef.current = onTryTake(takeTargetId);
      showTouchTooltip(anchor.x, anchor.y);
    }, 300);
  };

  const handlePointerCancel = () => {
    clearLongPressTimer();
    clearSingleTapTimer();
    longPressTriggeredRef.current = false;
    clearTouchInteraction();
  };

  useEffect(
    () => () => {
      clearLongPressTimer();
      clearSingleTapTimer();
      clearTouchInteraction();
    },
    [],
  );

  const handleDoubleClick = (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    if (touchInteractionRef.current) return;
    handleForceAllocate();
    showTouchTooltip(event.clientX, event.clientY);
  };

  const isPartialRank =
    isSelected && stackRank !== null && stackRank.current < stackRank.total;

  const labelFontPx = Math.max(8, Math.round(nodeDiameterPx * 0.30));
  const circleClassName = cn(
    "flex shrink-0 items-center justify-center rounded-full border-2 font-semibold leading-none transition-all",
    isConflict &&
      "border-[var(--color-error)] bg-[var(--color-error)]/30 text-[var(--color-foreground)] shadow-[var(--shadow-error-glow)] ring-[3px] ring-[var(--color-error)]/90 ring-offset-2 ring-offset-[var(--color-background)] animate-pulse",
    !isConflict &&
      isPartialRank &&
      "border-[var(--color-perk-partial)] bg-[var(--color-perk-partial)]/30 text-[var(--color-perk-partial)] shadow-[0_0_12px_rgba(78,179,245,0.4)]",
    !isConflict &&
      isSelected &&
      !isPartialRank &&
      "border-[var(--color-perk-selected)] bg-[var(--color-perk-selected)]/30 text-[var(--color-perk-selected)] shadow-[0_0_12px_rgba(212,175,55,0.35)]",
    !isConflict &&
      !isSelected &&
      isAvailable &&
      "border-[var(--color-perk-available)] bg-[var(--color-surface-elevated)] text-[var(--color-foreground)] group-hover:scale-105 group-hover:border-[var(--color-accent)]",
    !isConflict &&
      !isSelected &&
      !isAvailable &&
      !isLocked &&
      "border-[var(--color-perk-prereq)]/80 bg-[var(--color-surface)] text-[var(--color-muted)]",
    !isConflict &&
      isLocked &&
      !isSelected &&
      "border-[var(--color-perk-locked)] bg-[var(--color-surface)]/80 text-[var(--color-muted)] opacity-55 group-hover:opacity-80",
  );

  const requirementLabel = formatPerkNodeRequirementLabel(badgeRequirements);
  const requirementBadgeClassName = cn(
    "whitespace-nowrap rounded border px-1 py-px text-[10px] font-semibold tabular-nums leading-none shadow-[0_1px_4px_rgba(0,0,0,0.45)]",
    "border-[var(--color-border)] bg-[var(--color-surface)]",
    isConflict &&
      "border-[var(--color-error)] bg-[var(--color-error)]/20 text-[var(--color-error)]",
    !isConflict &&
      isPartialRank &&
      "border-[var(--color-perk-partial)]/60 text-[var(--color-perk-partial)]",
    !isConflict &&
      isSelected &&
      !isPartialRank &&
      "border-[var(--color-perk-selected)]/60 text-[var(--color-perk-selected)]",
    !isConflict &&
      !isSelected &&
      isAvailable &&
      "border-[var(--color-perk-available)]/60 text-[var(--color-foreground)]",
    !isConflict && isLocked && !isSelected && "text-[var(--color-foreground)]/75",
    !isConflict &&
      !isSelected &&
      !isAvailable &&
      !isLocked &&
      "text-[var(--color-foreground)]/85",
  );
  const stackRankBadgeClassName = requirementBadgeClassName;

  const tooltipContent = (
    <>
      <p className="font-semibold text-[var(--color-accent)]">{perk.name}</p>
      {stackRank && (
        <p className="mt-0.5 text-xs text-[var(--color-muted)]">
          {labels.perkRank}: {stackRank.current}/{stackRank.total}
        </p>
      )}
      {requirements.skillReq !== null && (
        <p className="mt-1 text-xs text-[var(--color-muted)]">
          {labels.skillReq}: {requirements.skillReq}
        </p>
      )}
      {requirements.playerLevelReq !== null && (
        <p
          className={cn(
            "text-xs",
            requirements.skillReq !== null ? "mt-0.5" : "mt-1",
            isConflict
              ? "font-medium text-[var(--color-error)]"
              : "text-[var(--color-muted)]",
          )}
        >
          {labels.playerLevelReq}: {requirements.playerLevelReq}
        </p>
      )}
      <p className="mt-2 text-xs leading-relaxed">{perk.description}</p>
      {nextRank && isSelected && renderNextRankSection(nextRank, labels)}
      <p className="mt-2 text-xs font-medium text-[var(--color-muted)]">
        {isConflict
          ? labels.buildProblemLegend
          : isSelected
            ? nextRank
              ? labels.upgradeAvailable
              : labels.selected
            : isLocked
              ? labels.locked
              : isAvailable
                ? labels.available
                : labels.locked}
      </p>
    </>
  );

  return (
    <CursorTooltip
      content={tooltipContent}
      open={supportsHover ? undefined : touchTooltipOpen}
      onOpenChange={supportsHover ? undefined : setTouchTooltipOpen}
      touchAnchor={touchAnchor}
      className={cn(
        "absolute -translate-x-1/2 -translate-y-1/2 select-none",
        !isInteractive && "pointer-events-none",
      )}
      style={{ left: `${position.x}%`, top: `${position.y}%`, zIndex: paintOrder }}
    >
      <button
        type="button"
        data-perk-node
        aria-label={perk.name}
        onMouseDown={handleMouseDown}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
        onDoubleClick={handleDoubleClick}
        onContextMenu={(event) => event.preventDefault()}
        className="group relative touch-manipulation border-0 bg-transparent p-0"
      >
        <span
          className={circleClassName}
          style={{ width: nodeDiameterPx, height: nodeDiameterPx, fontSize: labelFontPx }}
        >
          <span className="leading-none">{perkAbbreviation(perk.name)}</span>
        </span>
        {(showSkillRequirements && requirementLabel) || stackRank ? (
          <div className="absolute left-1/2 top-full mt-0.5 flex -translate-x-1/2 flex-col items-center gap-0.5">
            {showSkillRequirements && requirementLabel && (
              <span className={requirementBadgeClassName}>{requirementLabel}</span>
            )}
            {stackRank && (
              <span className={stackRankBadgeClassName}>
                {stackRank.current}/{stackRank.total}
              </span>
            )}
          </div>
        ) : null}
      </button>
    </CursorTooltip>
  );
}

interface PerkTreeViewProps {
  tree: PerkTree;
  labels: Record<string, string>;
  conflictPerkIds?: string[];
  playerLevelConflictPerkIds?: string[];
  showSkillRequirements?: boolean;
  /** Scale the tree to fit and center within the parent area. */
  fit?: boolean;
  /** Render at readable scale inside a scrollable viewport (mobile). */
  scrollable?: boolean;
  className?: string;
}

function useFitContainSize(aspect: number, enabled: boolean) {
  const areaRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState<{ width: number; height: number } | null>(null);

  useEffect(() => {
    if (!enabled) {
      setSize(null);
      return;
    }

    const element = areaRef.current;
    if (!element) return;

    const update = () => {
      const containerWidth = element.clientWidth;
      const containerHeight = element.clientHeight;
      if (!containerWidth || !containerHeight) return;

      const insetRatio =
        containerHeight < 360 || containerWidth < 360 ? 0.96 : FIT_REGION_INSET_RATIO;
      const availableWidth = containerWidth * insetRatio;
      const availableHeight = containerHeight * insetRatio;

      if (availableWidth / availableHeight > aspect) {
        setSize({ width: availableHeight * aspect, height: availableHeight });
      } else {
        setSize({ width: availableWidth, height: availableWidth / aspect });
      }
    };

    const observer = new ResizeObserver(update);
    observer.observe(element);
    update();

    return () => observer.disconnect();
  }, [aspect, enabled]);

  return { areaRef, size };
}

function PerkTreeView({
  tree,
  labels,
  conflictPerkIds = [],
  playerLevelConflictPerkIds = [],
  showSkillRequirements = true,
  fit = false,
  scrollable = false,
  className,
}: PerkTreeViewProps) {
  const gameData = useBuildStore((s) => s.gameData);
  const build = useBuildStore((s) => s.build);
  const perkPointsRemaining = useBuildStore((s) => s.computed?.perkPointsRemaining ?? 0);
  const tryTakePerk = useBuildStore((s) => s.tryTakePerk);
  const allocatePerk = useBuildStore((s) => s.allocatePerk);
  const removePerk = useBuildStore((s) => s.removePerk);
  const tookPerkWithLastClickRef = useRef(false);

  const isDestinyTree = tree.skillId === DESTINY_SKILL_ID;

  const bounds = useMemo(
    () =>
      getPerkTreeContentBounds(
        tree,
        EDITOR_NODE_EXTENT,
        fit && !scrollable ? EDITOR_BOUNDS_PADDING + 0.6 : EDITOR_BOUNDS_PADDING,
      ),
    [tree, fit, scrollable],
  );
  const aspect = bounds.width / bounds.height;
  const useFitLayout = fit && !scrollable;
  const { areaRef, size: fitSize } = useFitContainSize(aspect, useFitLayout);
  const visiblePerks = useMemo(
    () => getVisiblePerksForTree(tree, build.selectedPerkIds),
    [tree, build.selectedPerkIds],
  );
  const scrollGridUnitPx = scrollable ? SCROLLABLE_GRID_UNIT_PX : GRID_UNIT_PX;
  const scrollSize = scrollable
    ? { width: bounds.width * scrollGridUnitPx, height: bounds.height * scrollGridUnitPx }
    : null;
  const { gridUnitPx, nodeDiameterPx } = useMemo(() => {
    if (scrollable && scrollSize) {
      const gridUnitPx = scrollGridUnitPx;
      const nodeDiameterPx = resolvePerkNodeDiameterPx(
        gridUnitPx,
        getMinDistinctPerkCenterDistanceGrid(visiblePerks),
        {
          baseDiameterPx: BASE_NODE_DIAMETER_PX,
          gridUnitReferencePx: SCROLLABLE_GRID_UNIT_PX,
          minDiameterPx: MIN_NODE_DIAMETER_PX,
        },
      );
      return { gridUnitPx, nodeDiameterPx };
    }
    return getTreeLayoutMetrics(bounds, useFitLayout, fitSize, visiblePerks);
  }, [
    bounds,
    useFitLayout,
    fitSize,
    scrollable,
    scrollSize,
    scrollGridUnitPx,
    visiblePerks,
  ]);
  const nodeRadiusGrid = nodeDiameterPx / (2 * gridUnitPx);
  const treeEdgePaddingPx = Math.ceil(nodeDiameterPx / 2) + TREE_VIEW_EDGE_PADDING_PX;

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
      className={cn(
        "relative h-full w-full",
        !fit && !scrollable && "overflow-hidden",
      )}
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
        const stackRank = getPerkStackRank(stack, build.selectedPerkIds);
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

        return (
          <PerkNode
            key={positionKey}
            perk={perk}
            position={getPerkPercentPositionInBounds(perk.position, bounds)}
            requirements={requirements}
            badgeRequirements={nodeBadgeRequirements}
            takeTargetId={takeTargetId}
            stackRank={stackRank}
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
            showSkillRequirements={showSkillRequirements}
          />
        );
      })}
    </div>
  );

  if (scrollable && scrollSize) {
    return (
      <div className={cn("relative h-full min-h-0 w-full", className)}>
        <div
          ref={areaRef}
          className="h-full min-h-0 w-full touch-pan-x touch-pan-y overflow-auto overscroll-contain"
        >
          <div
            className="relative mx-auto shrink-0"
            style={{
              width: scrollSize.width + treeEdgePaddingPx * 2,
              height: scrollSize.height + treeEdgePaddingPx * 2,
              padding: treeEdgePaddingPx,
            }}
          >
            <div
              className="relative"
              style={{ width: scrollSize.width, height: scrollSize.height }}
            >
              {treeCanvas}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (useFitLayout) {
    return (
      <div ref={areaRef} className={cn("h-full min-h-0 w-full", className)}>
        <div className="flex h-full w-full items-center justify-center">
          {fitSize ? (
            <div
              className="relative shrink-0 box-border"
              style={{
                width: fitSize.width,
                height: fitSize.height,
                padding: treeEdgePaddingPx,
              }}
            >
              <div className="relative h-full w-full">{treeCanvas}</div>
            </div>
          ) : null}
        </div>
      </div>
    );
  }

  return <div className={className}>{treeCanvas}</div>;
}

export { PerkTreeView };
