import type { Perk, PerkTree } from "@/data/schemas";

export interface PerkTreeGrid {
  width: number;
  height: number;
}

export interface PerkTreeGridBounds extends PerkTreeGrid {
  origin: GridPoint;
}

export function getPerkTreeGridBounds(tree: Pick<PerkTree, "perks">): PerkTreeGridBounds {
  if (tree.perks.length === 0) {
    return { origin: { x: 0, y: 0 }, width: 1, height: 1 };
  }

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const perk of tree.perks) {
    minX = Math.min(minX, perk.position.x);
    minY = Math.min(minY, perk.position.y);
    maxX = Math.max(maxX, perk.position.x);
    maxY = Math.max(maxY, perk.position.y);
  }

  return {
    origin: { x: minX, y: minY },
    width: maxX - minX + 1,
    height: maxY - minY + 1,
  };
}

export interface GridPoint {
  x: number;
  y: number;
}

export function getPerkGridCenter(position: GridPoint): GridPoint {
  return { x: position.x + 0.5, y: position.y + 0.5 };
}

export interface PerkTreeContentBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function expandPerkTreeContentBounds(
  bounds: PerkTreeContentBounds,
  padding: number,
  frame: PerkTreeGridBounds,
): PerkTreeContentBounds {
  const x = Math.max(frame.origin.x, bounds.x - padding);
  const y = Math.max(frame.origin.y, bounds.y - padding);
  const maxX = Math.min(frame.origin.x + frame.width, bounds.x + bounds.width + padding);
  const maxY = Math.min(frame.origin.y + frame.height, bounds.y + bounds.height + padding);

  return {
    x,
    y,
    width: Math.max(1, maxX - x),
    height: Math.max(1, maxY - y),
  };
}

export function getPerkTreeContentBounds(
  tree: PerkTree,
  nodeExtent = 1,
  extraPadding = 0,
): PerkTreeContentBounds {
  const frame = getPerkTreeGridBounds(tree);

  if (tree.perks.length === 0) {
    return { x: frame.origin.x, y: frame.origin.y, width: frame.width, height: frame.height };
  }

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const perk of tree.perks) {
    const center = getPerkGridCenter(perk.position);
    minX = Math.min(minX, center.x);
    minY = Math.min(minY, center.y);
    maxX = Math.max(maxX, center.x);
    maxY = Math.max(maxY, center.y);
  }

  for (const edge of computePerkTreeEdges(tree, [])) {
    minX = Math.min(minX, edge.x1, edge.x2);
    minY = Math.min(minY, edge.y1, edge.y2);
    maxX = Math.max(maxX, edge.x1, edge.x2);
    maxY = Math.max(maxY, edge.y1, edge.y2);
  }

  const paddedMinX = Math.max(frame.origin.x, minX - nodeExtent);
  const paddedMinY = Math.max(frame.origin.y, minY - nodeExtent);
  const paddedMaxX = Math.min(frame.origin.x + frame.width, maxX + nodeExtent);
  const paddedMaxY = Math.min(frame.origin.y + frame.height, maxY + nodeExtent);

  const bounds = {
    x: paddedMinX,
    y: paddedMinY,
    width: Math.max(1, paddedMaxX - paddedMinX),
    height: Math.max(1, paddedMaxY - paddedMinY),
  };

  if (extraPadding <= 0) {
    return bounds;
  }

  return expandPerkTreeContentBounds(bounds, extraPadding, frame);
}

export function getPerkTreeCompactViewBox(
  tree: PerkTree,
  nodeExtent = 1,
  extraPadding = 0,
  aspectPad = 1.1,
): string {
  const bounds = getPerkTreeContentBounds(tree, nodeExtent, extraPadding);
  const centerX = bounds.x + bounds.width / 2;
  const centerY = bounds.y + bounds.height / 2;
  const size = Math.max(bounds.width, bounds.height) * aspectPad;
  const x = centerX - size / 2;
  const y = centerY - size / 2;

  return `${x} ${y} ${size} ${size}`;
}

export function getPerkPercentPosition(position: GridPoint, grid: PerkTreeGrid): GridPoint {
  const center = getPerkGridCenter(position);
  return {
    x: (center.x / grid.width) * 100,
    y: (center.y / grid.height) * 100,
  };
}

export function getPerkPercentPositionInBounds(
  position: GridPoint,
  bounds: PerkTreeContentBounds,
): GridPoint {
  const center = getPerkGridCenter(position);
  return {
    x: ((center.x - bounds.x) / bounds.width) * 100,
    y: ((center.y - bounds.y) / bounds.height) * 100,
  };
}

export function trimLineEndpoints(
  from: GridPoint,
  to: GridPoint,
  trimStart: number,
  trimEnd: number,
): { x1: number; y1: number; x2: number; y2: number } {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = Math.hypot(dx, dy);
  if (length <= 0) {
    return { x1: from.x, y1: from.y, x2: to.x, y2: to.y };
  }
  if (length <= trimStart + trimEnd) {
    const midX = (from.x + to.x) / 2;
    const midY = (from.y + to.y) / 2;
    return { x1: midX, y1: midY, x2: midX, y2: midY };
  }
  const ux = dx / length;
  const uy = dy / length;
  return {
    x1: from.x + ux * trimStart,
    y1: from.y + uy * trimStart,
    x2: to.x - ux * trimEnd,
    y2: to.y - uy * trimEnd,
  };
}

export interface ComputePerkTreeEdgesOptions {
  nodeRadiusByPerkId?: (perkId: string) => number;
}

export function computePerkTreeEdgesPercentInBounds(
  tree: PerkTree,
  selectedPerkIds: string[],
  bounds: PerkTreeContentBounds,
  options?: ComputePerkTreeEdgesOptions,
): PerkTreeEdge[] {
  return computePerkTreeEdges(tree, selectedPerkIds, options).map((edge) => ({
    ...edge,
    x1: ((edge.x1 - bounds.x) / bounds.width) * 100,
    y1: ((edge.y1 - bounds.y) / bounds.height) * 100,
    x2: ((edge.x2 - bounds.x) / bounds.width) * 100,
    y2: ((edge.y2 - bounds.y) / bounds.height) * 100,
  }));
}

export type PerkPrerequisiteKind = "all" | "any";

export interface PerkTreeEdge {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  kind: PerkPrerequisiteKind;
  active: boolean;
}

function sameGridPosition(a: GridPoint, b: GridPoint): boolean {
  return a.x === b.x && a.y === b.y;
}

function stackRankFromPerkId(id: string): number {
  const match = id.match(/-r(\d+)$/);
  return match ? Number(match[1]) : 1;
}

function comparePerkStackOrder(left: Perk, right: Perk): number {
  const skillDiff = left.skillReq - right.skillReq;
  if (skillDiff !== 0) return skillDiff;

  const levelDiff = (left.playerLevelReq ?? 0) - (right.playerLevelReq ?? 0);
  if (levelDiff !== 0) return levelDiff;

  const rankDiff = stackRankFromPerkId(left.id) - stackRankFromPerkId(right.id);
  if (rankDiff !== 0) return rankDiff;

  return left.id.localeCompare(right.id);
}

export function sortPerkStack(perks: Perk[]): Perk[] {
  return [...perks].sort(comparePerkStackOrder);
}

export function groupPerksByPosition(tree: PerkTree): Map<string, Perk[]> {
  const byPosition = new Map<string, Perk[]>();

  for (const perk of tree.perks) {
    const key = getPerkPositionKey(perk.position);
    const group = byPosition.get(key);
    if (group) {
      group.push(perk);
    } else {
      byPosition.set(key, [perk]);
    }
  }

  return byPosition;
}

/** Perk shown in the tree: highest selected rank, or the root rank when none are selected. */
export function getVisiblePerkInStack(perks: Perk[], selectedPerkIds: string[]): Perk {
  const sorted = sortPerkStack(perks);
  const highestSelected = [...sorted].reverse().find((perk) => selectedPerkIds.includes(perk.id));
  return highestSelected ?? sorted[0];
}

export function getVisiblePerksForTree(tree: PerkTree, selectedPerkIds: string[]): Perk[] {
  return [...groupPerksByPosition(tree).values()].map((stack) =>
    getVisiblePerkInStack(stack, selectedPerkIds),
  );
}

export interface PerkStackRank {
  current: number;
  total: number;
}

/** Rank indicator for multi-level perks; returns null for single-rank nodes. */
export function getPerkStackRank(perks: Perk[], selectedPerkIds: string[]): PerkStackRank | null {
  if (perks.length <= 1) return null;

  const sorted = sortPerkStack(perks);
  const highestSelectedIndex = sorted.reduce(
    (maxIndex, perk, index) => (selectedPerkIds.includes(perk.id) ? index : maxIndex),
    -1,
  );

  return {
    current: highestSelectedIndex >= 0 ? highestSelectedIndex + 1 : 0,
    total: sorted.length,
  };
}

/** Next tier after the highest selected rank at this stack position. */
export function getNextRankInStack(perks: Perk[], selectedPerkIds: string[]): Perk | undefined {
  if (perks.length <= 1) return undefined;

  const sorted = sortPerkStack(perks);
  const highestSelectedIndex = sorted.reduce(
    (maxIndex, perk, index) => (selectedPerkIds.includes(perk.id) ? index : maxIndex),
    -1,
  );

  if (highestSelectedIndex < 0 || highestSelectedIndex >= sorted.length - 1) {
    return undefined;
  }

  return sorted[highestSelectedIndex + 1];
}

export function computePerkTreeEdges(
  tree: PerkTree,
  selectedPerkIds: string[],
  options?: ComputePerkTreeEdgesOptions,
): PerkTreeEdge[] {
  const lines: PerkTreeEdge[] = [];
  const nodeRadiusByPerkId = options?.nodeRadiusByPerkId;

  for (const perk of tree.perks) {
    const prereqEntries: Array<{ id: string; kind: PerkPrerequisiteKind }> = [
      ...perk.prerequisites.map((id) => ({ id, kind: "all" as const })),
      ...(perk.prerequisitesAny ?? []).map((id) => ({ id, kind: "any" as const })),
    ];

    for (const { id: prereqId, kind } of prereqEntries) {
      const prereq = tree.perks.find((p) => p.id === prereqId);
      if (!prereq) continue;
      if (sameGridPosition(prereq.position, perk.position)) continue;

      const from = getPerkGridCenter(prereq.position);
      const to = getPerkGridCenter(perk.position);
      const trimmed =
        nodeRadiusByPerkId != null
          ? trimLineEndpoints(
              from,
              to,
              nodeRadiusByPerkId(prereqId),
              nodeRadiusByPerkId(perk.id),
            )
          : { x1: from.x, y1: from.y, x2: to.x, y2: to.y };
      lines.push({
        x1: trimmed.x1,
        y1: trimmed.y1,
        x2: trimmed.x2,
        y2: trimmed.y2,
        kind,
        active: selectedPerkIds.includes(prereqId) && selectedPerkIds.includes(perk.id),
      });
    }
  }

  return lines;
}

export function getPerkPositionKey(position: GridPoint): string {
  return `${position.x},${position.y}`;
}

export function parseSvgViewBox(viewBox: string): PerkTreeContentBounds {
  const [x, y, width, height] = viewBox.split(/\s+/).map(Number);
  return { x, y, width, height };
}

/** Perks sharing a grid cell stack; the front perk receives pointer input. */
export function getFrontPerkIdAtPosition(perks: Perk[], selectedPerkIds: string[]): string {
  const sorted = sortPerkStack(perks);
  const nextUnselected = sorted.find((perk) => !selectedPerkIds.includes(perk.id));
  return nextUnselected?.id ?? sorted[sorted.length - 1].id;
}

/** Next unselected tier at a stack position; double-click allocates this perk and its full path. */
export function getDoubleClickAllocatePerkIdAtPosition(
  perks: Perk[],
  selectedPerkIds: string[],
): string {
  return getFrontPerkIdAtPosition(perks, selectedPerkIds);
}

/** Perk id to take on click — matches original chain behavior (next rank when stack is owned). */
export function resolvePerkTakeTarget(stack: Perk[], selectedPerkIds: string[]): string {
  const visible = getVisiblePerkInStack(stack, selectedPerkIds);
  const hasVisible = selectedPerkIds.includes(visible.id);

  if (stack.length <= 1 || !hasVisible) {
    return getFrontPerkIdAtPosition(stack, selectedPerkIds);
  }

  const nextRank = getNextRankInStack(stack, selectedPerkIds);
  return nextRank?.id ?? visible.id;
}

export function computeFrontPerkIdsByPosition(
  tree: PerkTree,
  selectedPerkIds: string[],
): Map<string, string> {
  const frontIds = new Map<string, string>();
  for (const [key, perks] of groupPerksByPosition(tree)) {
    frontIds.set(key, getFrontPerkIdAtPosition(perks, selectedPerkIds));
  }
  return frontIds;
}

export function computeDoubleClickAllocatePerkIdsByPosition(
  tree: PerkTree,
  selectedPerkIds: string[],
): Map<string, string> {
  const targets = new Map<string, string>();
  for (const [key, perks] of groupPerksByPosition(tree)) {
    targets.set(key, getDoubleClickAllocatePerkIdAtPosition(perks, selectedPerkIds));
  }
  return targets;
}

export function computePerkTreeEdgesPercent(tree: PerkTree, selectedPerkIds: string[]): PerkTreeEdge[] {
  const frame = getPerkTreeGridBounds(tree);

  return computePerkTreeEdges(tree, selectedPerkIds).map((edge) => ({
    ...edge,
    x1: ((edge.x1 - frame.origin.x) / frame.width) * 100,
    y1: ((edge.y1 - frame.origin.y) / frame.height) * 100,
    x2: ((edge.x2 - frame.origin.x) / frame.width) * 100,
    y2: ((edge.y2 - frame.origin.y) / frame.height) * 100,
  }));
}
