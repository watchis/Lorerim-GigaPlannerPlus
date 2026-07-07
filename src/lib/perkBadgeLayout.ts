import {
  domRectToAxisRect,
  overlapArea,
  type AxisRect,
} from "@/lib/perkTreeViewLayout";

const PERK_BADGE_EDGE_MARGIN_PX = 4;
const OBSTACLE_INFLATE_PX = 2;

export type PerkBadgeSide = "above" | "below" | "left" | "right";

export interface PerkBadgePlacement {
  side: PerkBadgeSide;
  shiftX: number;
}

export const DEFAULT_PERK_BADGE_PLACEMENT: PerkBadgePlacement = {
  side: "below",
  shiftX: 0,
};

export interface PerkBadgeLayoutNode {
  id: string;
  circleRect: AxisRect;
  stackHeight: number;
  stackWidth: number;
}

export interface PerkBadgeLayoutInput {
  nodes: PerkBadgeLayoutNode[];
  bounds: AxisRect;
}

const PLACEMENT_SIDES: PerkBadgeSide[] = ["below", "above", "right", "left"];
const VERTICAL_SHIFTS_PX = [-48, -32, -16, 0, 16, 32, 48];
const BELOW_CENTER_BONUS = 3;
const HORIZONTAL_SIDE_PENALTY = 150;

function inflateRect(rect: AxisRect, margin: number): AxisRect {
  return {
    top: rect.top - margin,
    left: rect.left - margin,
    right: rect.right + margin,
    bottom: rect.bottom + margin,
  };
}

export function estimateBadgeStackRectForPlacement(
  circleRect: AxisRect,
  stackHeight: number,
  stackWidth: number,
  placement: PerkBadgePlacement,
): AxisRect {
  const gap = PERK_BADGE_EDGE_MARGIN_PX;
  const centerX = (circleRect.left + circleRect.right) / 2 + placement.shiftX;
  const centerY = (circleRect.top + circleRect.bottom) / 2;
  const halfWidth = stackWidth / 2;
  const halfHeight = stackHeight / 2;

  switch (placement.side) {
    case "above":
      return {
        top: circleRect.top - gap - stackHeight,
        bottom: circleRect.top - gap,
        left: centerX - halfWidth,
        right: centerX + halfWidth,
      };
    case "below":
      return {
        top: circleRect.bottom + gap,
        bottom: circleRect.bottom + gap + stackHeight,
        left: centerX - halfWidth,
        right: centerX + halfWidth,
      };
    case "left":
      return {
        top: centerY - halfHeight,
        bottom: centerY + halfHeight,
        left: circleRect.left - gap - stackWidth,
        right: circleRect.left - gap,
      };
    case "right":
      return {
        top: centerY - halfHeight,
        bottom: centerY + halfHeight,
        left: circleRect.right + gap,
        right: circleRect.right + gap + stackWidth,
      };
  }
}

function scorePlacement(
  circleRect: AxisRect,
  stackHeight: number,
  stackWidth: number,
  placement: PerkBadgePlacement,
  bounds: AxisRect,
  obstacles: AxisRect[],
): number {
  const badgeRect = estimateBadgeStackRectForPlacement(
    circleRect,
    stackHeight,
    stackWidth,
    placement,
  );

  let score = 0;

  const overflowTop = Math.max(0, bounds.top - badgeRect.top);
  const overflowBottom = Math.max(0, badgeRect.bottom - bounds.bottom);
  const overflowLeft = Math.max(0, bounds.left - badgeRect.left);
  const overflowRight = Math.max(0, badgeRect.right - bounds.right);
  score += (overflowTop + overflowBottom + overflowLeft + overflowRight) * 10_000;

  for (const obstacle of obstacles) {
    const inflated = inflateRect(obstacle, OBSTACLE_INFLATE_PX);
    const area = overlapArea(badgeRect, inflated);
    if (area > 0) {
      score += area * 2 + 250;
    }
  }

  score += Math.abs(placement.shiftX) * 0.5;

  if (placement.side === "left" || placement.side === "right") {
    score += HORIZONTAL_SIDE_PENALTY;
  }

  if (placement.side === "below" && placement.shiftX === 0) {
    score -= BELOW_CENTER_BONUS;
  }

  return score;
}

export function resolveBestPerkBadgePlacement(
  circleRect: AxisRect,
  stackHeight: number,
  stackWidth: number,
  bounds: AxisRect,
  obstacles: AxisRect[],
): PerkBadgePlacement {
  let best = DEFAULT_PERK_BADGE_PLACEMENT;
  let bestScore = Infinity;

  for (const side of PLACEMENT_SIDES) {
    const shifts =
      side === "above" || side === "below" ? VERTICAL_SHIFTS_PX : [0];
    for (const shiftX of shifts) {
      const placement = { side, shiftX };
      const score = scorePlacement(
        circleRect,
        stackHeight,
        stackWidth,
        placement,
        bounds,
        obstacles,
      );
      if (score < bestScore) {
        bestScore = score;
        best = placement;
      }
    }
  }

  return best;
}

function sortNodesForLayout(nodes: PerkBadgeLayoutNode[]): PerkBadgeLayoutNode[] {
  return [...nodes].sort((a, b) => {
    const aCenterY = (a.circleRect.top + a.circleRect.bottom) / 2;
    const bCenterY = (b.circleRect.top + b.circleRect.bottom) / 2;
    if (aCenterY !== bCenterY) return bCenterY - aCenterY;

    const aCenterX = (a.circleRect.left + a.circleRect.right) / 2;
    const bCenterX = (b.circleRect.left + b.circleRect.right) / 2;
    return aCenterX - bCenterX;
  });
}

export function layoutPerkBadgePlacements(input: PerkBadgeLayoutInput): Map<string, PerkBadgePlacement> {
  const result = new Map<string, PerkBadgePlacement>();
  const sorted = sortNodesForLayout(input.nodes);
  const placedBadgeRects: AxisRect[] = [];

  for (const node of sorted) {
    const circleObstacles = sorted
      .filter((candidate) => candidate.id !== node.id)
      .map((candidate) => candidate.circleRect);

    const placement = resolveBestPerkBadgePlacement(
      node.circleRect,
      node.stackHeight,
      node.stackWidth,
      input.bounds,
      [...circleObstacles, ...placedBadgeRects],
    );

    result.set(node.id, placement);
    placedBadgeRects.push(
      estimateBadgeStackRectForPlacement(
        node.circleRect,
        node.stackHeight,
        node.stackWidth,
        placement,
      ),
    );
  }

  return result;
}

export function collectPerkBadgeLayoutNodes(container: HTMLElement): PerkBadgeLayoutNode[] {
  const nodes: PerkBadgeLayoutNode[] = [];

  for (const nodeEl of container.querySelectorAll("[data-perk-node]")) {
    if (!(nodeEl instanceof HTMLElement)) continue;

    const positionKey = nodeEl.dataset.perkPositionKey;
    if (!positionKey) continue;

    const badges = nodeEl.querySelector("[data-perk-badges]");
    if (!(badges instanceof HTMLElement)) continue;

    const badgeRect = badges.getBoundingClientRect();
    if (badgeRect.width <= 0 || badgeRect.height <= 0) continue;

    const circle = nodeEl.querySelector("[data-perk-circle]");
    if (!(circle instanceof HTMLElement)) continue;

    nodes.push({
      id: positionKey,
      circleRect: domRectToAxisRect(circle.getBoundingClientRect()),
      stackHeight: badgeRect.height,
      stackWidth: badgeRect.width,
    });
  }

  return nodes;
}

export function perkBadgePlacementsEqual(
  a: Map<string, PerkBadgePlacement>,
  b: Map<string, PerkBadgePlacement>,
): boolean {
  if (a.size !== b.size) return false;
  for (const [key, placement] of a) {
    const other = b.get(key);
    if (!other || other.side !== placement.side || other.shiftX !== placement.shiftX) {
      return false;
    }
  }
  return true;
}

export function getPerkBadgeContainerClassName(placement: PerkBadgePlacement): string {
  const base = "absolute flex flex-col gap-0.5";
  switch (placement.side) {
    case "above":
      return `${base} bottom-full left-1/2 mb-0.5 flex-col-reverse items-center`;
    case "below":
      return `${base} left-1/2 top-full mt-0.5 items-center`;
    case "left":
      return `${base} right-full top-1/2 mr-0.5 items-end`;
    case "right":
      return `${base} left-full top-1/2 ml-0.5 items-start`;
  }
}

export function getPerkBadgeContainerStyle(
  placement: PerkBadgePlacement,
): { transform: string } {
  if (placement.side === "above" || placement.side === "below") {
    return { transform: `translateX(calc(-50% + ${placement.shiftX}px))` };
  }
  return { transform: "translateY(-50%)" };
}
