import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent,
  type MutableRefObject,
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
const DESTINY_SKILL_ID = "destiny";
const BASE_NODE_DIAMETER_PX = 32;
const MIN_NODE_DIAMETER_PX = 14;
/** Extra padding between perk tree content and the viewport edge in full-tree view. */
const TREE_VIEW_EDGE_PADDING_PX = 12;
const MIN_TREE_ZOOM = 1;
const MAX_TREE_ZOOM = 2.5;

interface TreeViewTransform {
  zoom: number;
  panX: number;
  panY: number;
}

const DEFAULT_TREE_VIEW_TRANSFORM: TreeViewTransform = {
  zoom: MIN_TREE_ZOOM,
  panX: 0,
  panY: 0,
};

function clampTreeZoom(zoom: number): number {
  return Math.min(MAX_TREE_ZOOM, Math.max(MIN_TREE_ZOOM, zoom));
}

function zoomTreeViewAtPoint(
  transform: TreeViewTransform,
  nextZoom: number,
  pointX: number,
  pointY: number,
): TreeViewTransform {
  const zoom = clampTreeZoom(nextZoom);
  if (zoom <= MIN_TREE_ZOOM) {
    return DEFAULT_TREE_VIEW_TRANSFORM;
  }

  const scale = zoom / transform.zoom;
  return {
    zoom,
    panX: pointX - scale * (pointX - transform.panX),
    panY: pointY - scale * (pointY - transform.panY),
  };
}

function getTouchDistance(touches: TouchList | { length: number; 0?: Touch; 1?: Touch }): number {
  if (touches.length < 2 || !touches[0] || !touches[1]) return 0;
  const dx = touches[0].clientX - touches[1].clientX;
  const dy = touches[0].clientY - touches[1].clientY;
  return Math.hypot(dx, dy);
}

function isPerkTreeInteractiveTarget(target: EventTarget | null): boolean {
  return target instanceof Element && Boolean(target.closest("[data-perk-node], button"));
}

function getViewportPointFromCenter(
  viewport: HTMLElement,
  clientX: number,
  clientY: number,
): { x: number; y: number } {
  const rect = viewport.getBoundingClientRect();
  return {
    x: clientX - rect.left - rect.width / 2,
    y: clientY - rect.top - rect.height / 2,
  };
}

interface FitLayoutTuning {
  regionInsetRatio: number;
  boundsExtraPadding: number;
  edgePaddingPx: number;
  nodeBaseDiameterPx: number;
}

const DEFAULT_FIT_TUNING: FitLayoutTuning = {
  regionInsetRatio: FIT_REGION_INSET_RATIO,
  boundsExtraPadding: 0.6,
  edgePaddingPx: TREE_VIEW_EDGE_PADDING_PX,
  nodeBaseDiameterPx: BASE_NODE_DIAMETER_PX,
};

function getFitLayoutTuning(containerWidth: number, containerHeight: number): FitLayoutTuning {
  const minDim = Math.min(containerWidth, containerHeight);

  if (minDim < 360) {
    return {
      regionInsetRatio: 0.998,
      boundsExtraPadding: 0.15,
      edgePaddingPx: 2,
      nodeBaseDiameterPx: 38,
    };
  }
  if (minDim < 520) {
    return {
      regionInsetRatio: 0.985,
      boundsExtraPadding: 0.3,
      edgePaddingPx: 3,
      nodeBaseDiameterPx: 36,
    };
  }

  return DEFAULT_FIT_TUNING;
}

function resolvePerkTooltipScale(
  nodeDiameterPx: number,
  viewportMinDim: number | null,
): number {
  const nodeFactor = Math.min(1, Math.max(0.82, nodeDiameterPx / BASE_NODE_DIAMETER_PX));
  const screenFactor = viewportMinDim
    ? Math.min(1, Math.max(0.85, viewportMinDim / 460))
    : 1;
  return Math.min(1, Math.max(0.8, nodeFactor * screenFactor));
}

interface TreeViewClampContext {
  viewport: { width: number; height: number };
  fitSize: { width: number; height: number };
  nodeDiameterPx: number;
}

function clampTreeViewTransform(
  transform: TreeViewTransform,
  context: TreeViewClampContext,
): TreeViewTransform {
  const { viewport, fitSize, nodeDiameterPx } = context;
  const zoom = clampTreeZoom(transform.zoom);

  if (zoom <= MIN_TREE_ZOOM) {
    return DEFAULT_TREE_VIEW_TRANSFORM;
  }

  const minVisiblePx = Math.max(
    24,
    Math.min(
      nodeDiameterPx * zoom,
      Math.min(viewport.width, viewport.height) * 0.2,
    ),
  );

  const scaledWidth = fitSize.width * zoom;
  const scaledHeight = fitSize.height * zoom;
  const halfViewportWidth = viewport.width / 2;
  const halfViewportHeight = viewport.height / 2;

  const panXMin = minVisiblePx - halfViewportWidth - scaledWidth / 2;
  const panXMax = halfViewportWidth - minVisiblePx + scaledWidth / 2;
  const panYMin = minVisiblePx - halfViewportHeight - scaledHeight / 2;
  const panYMax = halfViewportHeight - minVisiblePx + scaledHeight / 2;

  const clampAxis = (value: number, min: number, max: number) =>
    min <= max ? Math.min(max, Math.max(min, value)) : (min + max) / 2;

  return {
    zoom,
    panX: clampAxis(transform.panX, panXMin, panXMax),
    panY: clampAxis(transform.panY, panYMin, panYMax),
  };
}

function resolvePerkNodeMetrics(
  gridUnitPx: number,
  visiblePerks: Perk[],
  nodeBaseDiameterPx = BASE_NODE_DIAMETER_PX,
): number {
  return resolvePerkNodeDiameterPx(
    gridUnitPx,
    getMinDistinctPerkCenterDistanceGrid(visiblePerks),
    {
      baseDiameterPx: nodeBaseDiameterPx,
      gridUnitReferencePx: GRID_UNIT_PX,
      minDiameterPx: MIN_NODE_DIAMETER_PX,
    },
  );
}

function resolveTreeEdgePaddingPx(nodeDiameterPx: number, edgePaddingPx: number): number {
  return Math.ceil(nodeDiameterPx / 2) + edgePaddingPx;
}

function resolveTreeLayoutMetrics(
  bounds: { width: number; height: number },
  fit: boolean,
  fitSize: { width: number; height: number } | null,
  visiblePerks: Perk[],
  fitTuning: FitLayoutTuning,
): { gridUnitPx: number; nodeDiameterPx: number; treeEdgePaddingPx: number } {
  if (!fit || !fitSize) {
    const gridUnitPx = GRID_UNIT_PX;
    const nodeDiameterPx = resolvePerkNodeMetrics(
      gridUnitPx,
      visiblePerks,
      fitTuning.nodeBaseDiameterPx,
    );
    return {
      gridUnitPx,
      nodeDiameterPx,
      treeEdgePaddingPx: resolveTreeEdgePaddingPx(nodeDiameterPx, fitTuning.edgePaddingPx),
    };
  }

  const estimateGridUnitPx = Math.min(
    fitSize.width / bounds.width,
    fitSize.height / bounds.height,
  );
  const estimateNodeDiameterPx = resolvePerkNodeMetrics(
    estimateGridUnitPx,
    visiblePerks,
    fitTuning.nodeBaseDiameterPx,
  );
  const edgePaddingPx = resolveTreeEdgePaddingPx(
    estimateNodeDiameterPx,
    fitTuning.edgePaddingPx,
  );

  const innerWidth = Math.max(1, fitSize.width - edgePaddingPx * 2);
  const innerHeight = Math.max(1, fitSize.height - edgePaddingPx * 2);
  const gridUnitPx = Math.min(innerWidth / bounds.width, innerHeight / bounds.height);
  const nodeDiameterPx = resolvePerkNodeMetrics(
    gridUnitPx,
    visiblePerks,
    fitTuning.nodeBaseDiameterPx,
  );

  return {
    gridUnitPx,
    nodeDiameterPx,
    treeEdgePaddingPx: resolveTreeEdgePaddingPx(nodeDiameterPx, fitTuning.edgePaddingPx),
  };
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
  tooltipScale?: number;
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
  tooltipScale = 1,
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
      contentScale={tooltipScale}
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
  className?: string;
}

function computeFitContainSize(
  containerWidth: number,
  containerHeight: number,
  aspect: number,
  regionInsetRatio: number,
): { width: number; height: number } {
  const availableWidth = containerWidth * regionInsetRatio;
  const availableHeight = containerHeight * regionInsetRatio;

  if (availableWidth / availableHeight > aspect) {
    return { width: availableHeight * aspect, height: availableHeight };
  }

  return { width: availableWidth, height: availableWidth / aspect };
}

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

function PerkTreeView({
  tree,
  labels,
  conflictPerkIds = [],
  playerLevelConflictPerkIds = [],
  showSkillRequirements = true,
  fit = false,
  className,
}: PerkTreeViewProps) {
  const gameData = useBuildStore((s) => s.gameData);
  const build = useBuildStore((s) => s.build);
  const perkPointsRemaining = useBuildStore((s) => s.computed?.perkPointsRemaining ?? 0);
  const tryTakePerk = useBuildStore((s) => s.tryTakePerk);
  const allocatePerk = useBuildStore((s) => s.allocatePerk);
  const removePerk = useBuildStore((s) => s.removePerk);
  const tookPerkWithLastClickRef = useRef(false);
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
  }, [tree.skillId, applyViewTransform]);

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
            tooltipScale={tooltipScale}
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
          className={cn(
            "h-full w-full touch-none overflow-hidden",
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
