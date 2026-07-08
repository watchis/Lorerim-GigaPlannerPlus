import type { Perk } from "@/data/schemas";
import {
  getMinDistinctPerkCenterDistanceGrid,
  resolvePerkNodeDiameterPx,
} from "@/lib/perkTreeGrid";

export const GRID_UNIT_PX = 26;
export const BASE_NODE_DIAMETER_PX = 32;
export const MIN_NODE_DIAMETER_PX = 14;
/** Default inner/outer blur radii for perk search glow at {@link BASE_NODE_DIAMETER_PX}. */
export const PERK_SEARCH_MATCH_GLOW_INNER_BLUR_PX = 7;
export const PERK_SEARCH_MATCH_GLOW_OUTER_BLUR_PX = 14;
export const PERK_SEARCH_MATCH_GLOW_INNER_OPACITY = 1;
export const PERK_SEARCH_MATCH_GLOW_OUTER_OPACITY = 0.72;
/** Extra padding between perk tree content and the viewport edge in full-tree view. */
export const TREE_VIEW_EDGE_PADDING_PX = 6;
export const MIN_TREE_ZOOM = 1;
export const MAX_TREE_ZOOM = 2.5;
export const PERK_DOUBLE_TAP_MS = 400;
/** Wait past the double-tap window before showing a touch tooltip. */
export const PERK_TOOLTIP_DELAY_MS = PERK_DOUBLE_TAP_MS + 50;

const FIT_REGION_INSET_RATIO = 0.96;
const PERK_BADGE_ROW_HEIGHT_PX = 16;
const PERK_BADGE_GAP_PX = 2;
const PERK_BADGE_EDGE_MARGIN_PX = 4;

export interface TreeViewTransform {
  zoom: number;
  panX: number;
  panY: number;
}

export const DEFAULT_TREE_VIEW_TRANSFORM: TreeViewTransform = {
  zoom: MIN_TREE_ZOOM,
  panX: 0,
  panY: 0,
};

export interface FitLayoutTuning {
  regionInsetRatio: number;
  boundsExtraPadding: number;
  edgePaddingPx: number;
  nodeBaseDiameterPx: number;
}

const DEFAULT_FIT_TUNING: FitLayoutTuning = {
  regionInsetRatio: FIT_REGION_INSET_RATIO,
  boundsExtraPadding: 0.45,
  edgePaddingPx: TREE_VIEW_EDGE_PADDING_PX,
  nodeBaseDiameterPx: BASE_NODE_DIAMETER_PX,
};

export interface TreeViewClampContext {
  viewport: { width: number; height: number };
  fitSize: { width: number; height: number };
  nodeDiameterPx: number;
}

export function estimatePerkBadgeStackHeight(badgeCount: number): number {
  if (badgeCount <= 0) return 0;
  return (
    badgeCount * PERK_BADGE_ROW_HEIGHT_PX +
    (badgeCount - 1) * PERK_BADGE_GAP_PX +
    PERK_BADGE_EDGE_MARGIN_PX
  );
}

export interface AxisRect {
  top: number;
  left: number;
  right: number;
  bottom: number;
}

export function domRectToAxisRect(rect: DOMRect): AxisRect {
  return { top: rect.top, left: rect.left, right: rect.right, bottom: rect.bottom };
}

export function rectsOverlap(a: AxisRect, b: AxisRect, margin = 0): boolean {
  return !(
    a.right + margin <= b.left ||
    a.left - margin >= b.right ||
    a.bottom + margin <= b.top ||
    a.top - margin >= b.bottom
  );
}

export function overlapArea(a: AxisRect, b: AxisRect): number {
  const left = Math.max(a.left, b.left);
  const right = Math.min(a.right, b.right);
  const top = Math.max(a.top, b.top);
  const bottom = Math.min(a.bottom, b.bottom);
  if (left >= right || top >= bottom) return 0;
  return (right - left) * (bottom - top);
}

export function estimateBadgeStackRect(
  circleRect: AxisRect,
  stackHeight: number,
  stackWidth: number,
  above: boolean,
): AxisRect {
  const centerX = (circleRect.left + circleRect.right) / 2;
  const halfWidth = stackWidth / 2;
  const gap = PERK_BADGE_EDGE_MARGIN_PX;

  if (above) {
    return {
      top: circleRect.top - stackHeight,
      bottom: circleRect.top - gap,
      left: centerX - halfWidth,
      right: centerX + halfWidth,
    };
  }

  return {
    top: circleRect.bottom + gap,
    bottom: circleRect.bottom + stackHeight,
    left: centerX - halfWidth,
    right: centerX + halfWidth,
  };
}

export interface ResolvePerkBadgePlacementOptions {
  circleLeft: number;
  circleRight: number;
  stackWidth: number;
  obstacles?: AxisRect[];
}

function scoreBadgePlacement(
  circleTop: number,
  circleBottom: number,
  circleLeft: number,
  circleRight: number,
  stackHeight: number,
  stackWidth: number,
  above: boolean,
  bounds?: { top: number; bottom: number },
  obstacles: AxisRect[] = [],
): number {
  const circleRect = { top: circleTop, bottom: circleBottom, left: circleLeft, right: circleRight };
  const badgeRect = estimateBadgeStackRect(circleRect, stackHeight, stackWidth, above);

  let score = 0;

  if (bounds) {
    const overflowTop = Math.max(0, bounds.top - badgeRect.top);
    const overflowBottom = Math.max(0, badgeRect.bottom - bounds.bottom);
    score += (overflowTop + overflowBottom) * 10_000;
  }

  for (const obstacle of obstacles) {
    const area = overlapArea(badgeRect, obstacle);
    if (area > 0) {
      score += area + 100;
    }
  }

  if (!above) {
    score -= 0.1;
  }

  return score;
}

export function collectPerkBadgeObstacleRects(
  viewport: HTMLElement,
  excludeNode: HTMLElement,
  includeBadges = false,
): AxisRect[] {
  const obstacles: AxisRect[] = [];

  for (const node of viewport.querySelectorAll("[data-perk-node]")) {
    if (!(node instanceof HTMLElement) || node === excludeNode) continue;

    const circle = node.querySelector("[data-perk-circle]");
    if (circle instanceof HTMLElement) {
      obstacles.push(domRectToAxisRect(circle.getBoundingClientRect()));
    }

    if (includeBadges) {
      const badges = node.querySelector("[data-perk-badges]");
      if (badges instanceof HTMLElement) {
        const rect = badges.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          obstacles.push(domRectToAxisRect(rect));
        }
      }
    }
  }

  return obstacles;
}

export function resolvePerkBadgePlacement(
  circleTop: number,
  circleBottom: number,
  stackHeight: number,
  bounds?: { top: number; bottom: number },
  options?: ResolvePerkBadgePlacementOptions,
): boolean {
  if (!options) {
    const bottomLimit =
      bounds?.bottom ?? (typeof window !== "undefined" ? window.innerHeight : 0);
    const topLimit = bounds?.top ?? 0;
    const spaceBelow = bottomLimit - circleBottom;
    const spaceAbove = circleTop - topLimit;
    const margin = PERK_BADGE_EDGE_MARGIN_PX;

    if (spaceBelow >= stackHeight + margin) return false;
    return spaceAbove >= spaceBelow;
  }

  const belowScore = scoreBadgePlacement(
    circleTop,
    circleBottom,
    options.circleLeft,
    options.circleRight,
    stackHeight,
    options.stackWidth,
    false,
    bounds,
    options.obstacles,
  );
  const aboveScore = scoreBadgePlacement(
    circleTop,
    circleBottom,
    options.circleLeft,
    options.circleRight,
    stackHeight,
    options.stackWidth,
    true,
    bounds,
    options.obstacles,
  );

  return aboveScore < belowScore;
}

export function clampTreeZoom(zoom: number): number {
  return Math.min(MAX_TREE_ZOOM, Math.max(MIN_TREE_ZOOM, zoom));
}

export function zoomTreeViewAtPoint(
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

export function getTouchDistance(
  touches: TouchList | { length: number; 0?: Touch; 1?: Touch },
): number {
  if (touches.length < 2 || !touches[0] || !touches[1]) return 0;
  const dx = touches[0].clientX - touches[1].clientX;
  const dy = touches[0].clientY - touches[1].clientY;
  return Math.hypot(dx, dy);
}

export function isPerkTreeInteractiveTarget(target: EventTarget | null): boolean {
  return target instanceof Element && Boolean(target.closest("[data-perk-node], button"));
}

export function getViewportPointFromCenter(
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

export function getFitLayoutTuning(
  containerWidth: number,
  containerHeight: number,
): FitLayoutTuning {
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

export function resolvePerkTooltipScale(
  nodeDiameterPx: number,
  viewportMinDim: number | null,
): number {
  const nodeFactor = Math.min(1, Math.max(0.82, nodeDiameterPx / BASE_NODE_DIAMETER_PX));
  const screenFactor = viewportMinDim
    ? Math.min(1, Math.max(0.85, viewportMinDim / 460))
    : 1;
  return Math.min(1, Math.max(0.8, nodeFactor * screenFactor));
}

export interface PerkSearchMatchGlow {
  innerBlurPx: number;
  outerBlurPx: number;
  boxShadow: string;
}

export function resolvePerkSearchMatchGlow(nodeDiameterPx: number): PerkSearchMatchGlow {
  const scale = nodeDiameterPx / BASE_NODE_DIAMETER_PX;
  const innerBlurPx = Math.max(1, PERK_SEARCH_MATCH_GLOW_INNER_BLUR_PX * scale);
  const outerBlurPx = Math.max(innerBlurPx + 1, PERK_SEARCH_MATCH_GLOW_OUTER_BLUR_PX * scale);
  const boxShadow =
    `0 0 ${innerBlurPx}px rgba(255,255,255,${PERK_SEARCH_MATCH_GLOW_INNER_OPACITY}), ` +
    `0 0 ${outerBlurPx}px rgba(255,255,255,${PERK_SEARCH_MATCH_GLOW_OUTER_OPACITY})`;
  return { innerBlurPx, outerBlurPx, boxShadow };
}

export function clampTreeViewTransform(
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
    Math.min(nodeDiameterPx * zoom, Math.min(viewport.width, viewport.height) * 0.2),
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

export function resolvePerkNodeMetrics(
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

export function resolveTreeEdgePaddingPx(
  nodeDiameterPx: number,
  edgePaddingPx: number,
): number {
  return Math.ceil(nodeDiameterPx / 2) + edgePaddingPx;
}

export function resolveTreeLayoutMetrics(
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

export function perkAbbreviation(name: string): string {
  const words = name.split(/\s+/).filter((word) => /[A-Za-z]/.test(word));
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }
  const letters = name.replace(/[^A-Za-z]/g, "");
  return (letters.slice(0, 2) || "?").toUpperCase();
}

export function computeFitContainSize(
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
