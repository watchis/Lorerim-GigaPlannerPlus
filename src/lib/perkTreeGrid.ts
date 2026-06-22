import type { Perk, PerkTree } from "@/data/schemas";

export interface PerkTreeGrid {
  width: number;
  height: number;
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
  grid: PerkTreeGrid,
): PerkTreeContentBounds {
  const x = Math.max(0, bounds.x - padding);
  const y = Math.max(0, bounds.y - padding);
  const maxX = Math.min(grid.width, bounds.x + bounds.width + padding);
  const maxY = Math.min(grid.height, bounds.y + bounds.height + padding);

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
  if (tree.perks.length === 0) {
    return { x: 0, y: 0, width: tree.grid.width, height: tree.grid.height };
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

  const paddedMinX = Math.max(0, minX - nodeExtent);
  const paddedMinY = Math.max(0, minY - nodeExtent);
  const paddedMaxX = Math.min(tree.grid.width, maxX + nodeExtent);
  const paddedMaxY = Math.min(tree.grid.height, maxY + nodeExtent);

  const bounds = {
    x: paddedMinX,
    y: paddedMinY,
    width: Math.max(1, paddedMaxX - paddedMinX),
    height: Math.max(1, paddedMaxY - paddedMinY),
  };

  if (extraPadding <= 0) {
    return bounds;
  }

  return expandPerkTreeContentBounds(bounds, extraPadding, tree.grid);
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

export function computePerkTreeEdgesPercentInBounds(
  tree: PerkTree,
  selectedPerkIds: string[],
  bounds: PerkTreeContentBounds,
): PerkTreeEdge[] {
  return computePerkTreeEdges(tree, selectedPerkIds).map((edge) => ({
    ...edge,
    x1: ((edge.x1 - bounds.x) / bounds.width) * 100,
    y1: ((edge.y1 - bounds.y) / bounds.height) * 100,
    x2: ((edge.x2 - bounds.x) / bounds.width) * 100,
    y2: ((edge.y2 - bounds.y) / bounds.height) * 100,
  }));
}

export interface PerkTreeEdge {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  active: boolean;
}

function sameGridPosition(a: GridPoint, b: GridPoint): boolean {
  return a.x === b.x && a.y === b.y;
}

export function sortPerkStack(perks: Perk[]): Perk[] {
  return [...perks].sort((a, b) => a.skillReq - b.skillReq);
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

export function getNextRankInStack(perks: Perk[], selectedPerkIds: string[]): Perk | undefined {
  return sortPerkStack(perks).find((perk) => !selectedPerkIds.includes(perk.id));
}

export function computePerkTreeEdges(tree: PerkTree, selectedPerkIds: string[]): PerkTreeEdge[] {
  const lines: PerkTreeEdge[] = [];

  for (const perk of tree.perks) {
    for (const prereqId of perk.prerequisites) {
      const prereq = tree.perks.find((p) => p.id === prereqId);
      if (!prereq) continue;
      if (sameGridPosition(prereq.position, perk.position)) continue;

      const from = getPerkGridCenter(prereq.position);
      const to = getPerkGridCenter(perk.position);
      lines.push({
        x1: from.x,
        y1: from.y,
        x2: to.x,
        y2: to.y,
        active: selectedPerkIds.includes(prereqId) && selectedPerkIds.includes(perk.id),
      });
    }
  }

  return lines;
}

export function getPerkPositionKey(position: GridPoint): string {
  return `${position.x},${position.y}`;
}

/** Perks sharing a grid cell stack; the front perk receives pointer input. */
export function getFrontPerkIdAtPosition(perks: Perk[], selectedPerkIds: string[]): string {
  const sorted = [...perks].sort((a, b) => a.skillReq - b.skillReq);
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
  const { width, height } = tree.grid;

  return computePerkTreeEdges(tree, selectedPerkIds).map((edge) => ({
    ...edge,
    x1: (edge.x1 / width) * 100,
    y1: (edge.y1 / height) * 100,
    x2: (edge.x2 / width) * 100,
    y2: (edge.y2 / height) * 100,
  }));
}
