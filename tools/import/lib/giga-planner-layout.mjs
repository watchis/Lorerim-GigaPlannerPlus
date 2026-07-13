import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { canonicalPerkName } from "./perk-import-filter.mjs";
import { normalizePerkTreeGrid } from "./append-missing-perks.mjs";
import { GIGA_LAYOUT_GRID } from "./giga-planner-layout-constants.mjs";

const HORIZONTAL_MARGIN = 0.05;
const VERTICAL_TOP_MARGIN = 0.1;
const VERTICAL_BOTTOM_MARGIN = 0.1;

const __dirname = dirname(fileURLToPath(import.meta.url));
const layoutDocument = JSON.parse(
  readFileSync(join(__dirname, "giga-planner-layout.json"), "utf8"),
);

export { GIGA_LAYOUT_GRID, gigaPercentToGrid } from "./giga-planner-layout-constants.mjs";

function layoutKey(skillId, perkName) {
  return `${skillId}:${canonicalPerkName(perkName)}`;
}

function lookupGigaPosition(skillId, perkName) {
  const position = layoutDocument.positions?.[layoutKey(skillId, perkName)];
  if (!position) return null;
  if (!Number.isInteger(position.x) || !Number.isInteger(position.y)) return null;
  return { x: position.x, y: position.y };
}

function prerequisiteIds(perk, byId) {
  const ids = new Set([
    ...(Array.isArray(perk.prerequisites) ? perk.prerequisites : []),
    ...(Array.isArray(perk.prerequisitesAny) ? perk.prerequisitesAny : []),
  ]);
  ids.delete(String(perk.id));
  return [...ids].filter((id) => byId.has(id));
}

function computeDepths(perks, byId) {
  const depth = new Map();

  function visit(id, visiting = new Set()) {
    if (depth.has(id)) return depth.get(id);
    if (visiting.has(id)) return 0;
    visiting.add(id);

    const perk = byId.get(id);
    const prereqs = prerequisiteIds(perk, byId);
    const nextDepth =
      prereqs.length === 0
        ? 0
        : 1 + Math.max(...prereqs.map((prereqId) => visit(prereqId, visiting)));

    depth.set(id, nextDepth);
    return nextDepth;
  }

  for (const perk of perks) {
    visit(String(perk.id));
  }

  return depth;
}

function depthToY(depth, maxDepth, gridHeight) {
  const usable = Math.max(gridHeight - 1, 1);
  if (maxDepth <= 0) {
    return Math.round(usable * (1 - VERTICAL_TOP_MARGIN));
  }

  const fraction = depth / maxDepth;
  const span = 1 - VERTICAL_TOP_MARGIN - VERTICAL_BOTTOM_MARGIN;
  return Math.round(usable * (VERTICAL_BOTTOM_MARGIN + span * (1 - fraction)));
}

function indexToX(index, count, gridWidth) {
  const usable = Math.max(gridWidth - 1, 1);
  if (count <= 1) return Math.round(usable / 2);

  const fraction = index / (count - 1);
  const span = 1 - HORIZONTAL_MARGIN * 2;
  return Math.round(usable * (HORIZONTAL_MARGIN + span * fraction));
}

function resolveCollisions(positions, grid) {
  const occupied = new Map();

  for (const [id, position] of positions) {
    let { x, y } = position;
    const key = () => `${x},${y}`;

    while (occupied.has(key())) {
      x += 1;
      if (x >= grid.width) {
        x = 0;
        y += 1;
      }
    }

    const resolved = { x, y };
    occupied.set(key(), id);
    positions.set(id, resolved);
  }
}

function layoutFromPrerequisiteGraph(perks, grid) {
  const byId = new Map(perks.map((perk) => [String(perk.id), perk]));
  const depths = computeDepths(perks, byId);
  const maxDepth = Math.max(0, ...depths.values());

  const layers = new Map();
  for (const perk of perks) {
    const depth = depths.get(String(perk.id)) ?? 0;
    if (!layers.has(depth)) layers.set(depth, []);
    layers.get(depth).push(perk);
  }

  const positions = new Map();

  for (const [depth, layerPerks] of [...layers.entries()].sort((left, right) => left[0] - right[0])) {
    const sorted = [...layerPerks].sort((left, right) => {
      const reqDelta = (left.skillReq ?? 0) - (right.skillReq ?? 0);
      if (reqDelta !== 0) return reqDelta;
      return String(left.name).localeCompare(String(right.name));
    });

    sorted.forEach((perk, index) => {
      positions.set(String(perk.id), {
        x: indexToX(index, sorted.length, grid.width),
        y: depthToY(depth, maxDepth, grid.height),
      });
    });
  }

  resolveCollisions(positions, grid);
  return positions;
}

/**
 * Apply GigaPlanner-inspired layout to a perk tree.
 * Exact legacy coordinates are used when perk names match; others use prerequisite depth layout.
 */
function stackRepresentative(members) {
  return [...members].sort((left, right) => (left.skillReq ?? 0) - (right.skillReq ?? 0))[0];
}

export function applyGigaPlannerTreeLayout(tree) {
  if (!tree?.perks?.length || tree.skillId === "destiny" || tree.skillId === "traits") {
    return { matched: 0, inferred: 0 };
  }
  // Growl / Sacrilege AVIF coordinates are authoritative for curse trees.
  if (tree.skillId === "vampire" || tree.skillId === "werewolf") {
    return { matched: 0, inferred: 0 };
  }

  const grid = { ...GIGA_LAYOUT_GRID };

  // Multi-rank perks share a name and must share a cell; lay out one representative per stack.
  const groups = new Map();
  for (const perk of tree.perks) {
    const key = canonicalPerkName(perk.name);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(perk);
  }
  const representatives = [...groups.values()].map(stackRepresentative);

  const positions = layoutFromPrerequisiteGraph(representatives, grid);

  let matched = 0;
  for (const rep of representatives) {
    const legacy = lookupGigaPosition(tree.skillId, rep.name);
    if (!legacy) continue;
    positions.set(String(rep.id), legacy);
    matched += 1;
  }

  resolveCollisions(positions, grid);

  for (const members of groups.values()) {
    const position = positions.get(String(stackRepresentative(members).id));
    if (!position) continue;
    for (const member of members) {
      member.position = { ...position };
    }
  }

  normalizePerkTreeGrid(tree);
  return { matched, inferred: representatives.length - matched };
}

export function getGigaPlannerLayoutStats() {
  return {
    version: layoutDocument.version,
    source: layoutDocument.source,
    positionCount: Object.keys(layoutDocument.positions ?? {}).length,
    grid: layoutDocument.grid ?? GIGA_LAYOUT_GRID,
  };
}
