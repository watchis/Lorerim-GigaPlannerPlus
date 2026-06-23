interface GridPoint {
  x: number;
  y: number;
}

export type PerkPrerequisiteKind = "all" | "any";

export interface PerkTreeEdge {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  kind: PerkPrerequisiteKind;
  dependentId: string;
  prerequisiteId: string;
}

export interface PerkTreeLike {
  perks: Array<{
    id: string;
    position: GridPoint;
    prerequisites: string[];
    prerequisitesAny?: string[];
  }>;
}

function getPerkGridCenter(position: GridPoint): GridPoint {
  return { x: position.x + 0.5, y: position.y + 0.5 };
}

function sameGridPosition(a: GridPoint, b: GridPoint): boolean {
  return a.x === b.x && a.y === b.y;
}

function trimLineEndpoints(
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

export function computePerkTreeEdges(
  tree: PerkTreeLike,
  nodeRadiusGrid: number,
): PerkTreeEdge[] {
  const lines: PerkTreeEdge[] = [];

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
      const trimmed = trimLineEndpoints(from, to, nodeRadiusGrid, nodeRadiusGrid);
      lines.push({
        ...trimmed,
        kind,
        dependentId: perk.id,
        prerequisiteId: prereqId,
      });
    }
  }

  return lines;
}
