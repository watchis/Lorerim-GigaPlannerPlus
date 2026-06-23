type PerkNodeLike = {
  id?: unknown;
  position?: { x?: unknown; y?: unknown };
};

type PerkTreeDocument = {
  grid?: { width?: unknown; height?: unknown; minX?: unknown; minY?: unknown };
  perks?: PerkNodeLike[];
};

function isFiniteInt(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && Number.isInteger(value);
}

/** Normalize perk positions to a 0-based grid derived from perk extent. */
export function normalizePerkTreeLayout(tree: unknown): unknown {
  if (!tree || typeof tree !== "object") return tree;
  const doc = tree as PerkTreeDocument;
  const perks = doc.perks ?? [];
  const nextTree = structuredClone(doc);

  if (perks.length === 0) {
    nextTree.grid = { width: 1, height: 1 };
    return nextTree;
  }

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const perk of perks) {
    const x = isFiniteInt(perk.position?.x) ? perk.position.x : 0;
    const y = isFiniteInt(perk.position?.y) ? perk.position.y : 0;
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
  }

  for (const perk of nextTree.perks ?? []) {
    const x = isFiniteInt(perk.position?.x) ? perk.position.x : 0;
    const y = isFiniteInt(perk.position?.y) ? perk.position.y : 0;
    perk.position = { x: x - minX, y: y - minY };
  }

  nextTree.grid = {
    width: maxX - minX + 1,
    height: maxY - minY + 1,
  };
  delete (nextTree.grid as { minX?: unknown }).minX;
  delete (nextTree.grid as { minY?: unknown }).minY;

  return nextTree;
}
