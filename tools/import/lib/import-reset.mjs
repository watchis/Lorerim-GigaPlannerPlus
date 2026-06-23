import { existsSync, readdirSync, readFileSync, unlinkSync } from "node:fs";
import { join } from "node:path";
import { canonicalPerkName } from "./perk-import-filter.mjs";
import { repositionOutOfGridPerks, resizeGridToFit } from "./append-missing-perks.mjs";
import { SKILL_IDS, SKILL_NAMES } from "./skill-constants.mjs";

export function createEmptyPerkTrees() {
  const trees = {};
  const indexEntries = {};

  for (let skillIndex = 0; skillIndex < 19; skillIndex += 1) {
    const skillId = SKILL_IDS[skillIndex];
    const filename = `${skillId}.json`;
    trees[filename] = {
      skillId,
      skillName: SKILL_NAMES[skillIndex],
      grid: { width: 1, height: 1 },
      perks: [],
    };
    indexEntries[skillId] = filename;
  }

  return { trees, indexEntries };
}

/** Preserve free-perk flags that are not derived from ESP during a full rebuild. */
export function loadPerkHandTunedOverrides(perksDir) {
  const overrides = new Map();

  if (!existsSync(perksDir)) return overrides;

  for (const filename of readdirSync(perksDir)) {
    if (!filename.endsWith(".json") || filename === "index.json") continue;

    const tree = JSON.parse(readFileSync(join(perksDir, filename), "utf8"));
    for (const perk of tree.perks ?? []) {
      if (perk.costsPerkPoint !== false) continue;
      overrides.set(canonicalPerkName(perk.name), { costsPerkPoint: false });
    }
  }

  return overrides;
}

export function applyPerkHandTunedOverrides(trees, overrides) {
  if (overrides.size === 0) return;

  for (const tree of Object.values(trees)) {
    for (const perk of tree.perks) {
      const override = overrides.get(canonicalPerkName(perk.name));
      if (override?.costsPerkPoint === false) {
        perk.costsPerkPoint = false;
      }
    }
  }
}

/** Smithing perks unlocked by reading/studying in-game skill books do not cost perk points. */
const SMITHING_BOOK_UNLOCK_PATTERN =
  /\b(?:by reading|by studying|after reading|after studying|you(?:'ve| have) read|you(?:'ve| have) been read|you(?:'ve| have)? studied|having studied|acquire this knowledge by reading)\b/i;

export function isSmithingBookUnlockedPerk(description) {
  if (!description) return false;
  return SMITHING_BOOK_UNLOCK_PATTERN.test(description);
}

export function applySmithingBookPerkCosts(trees) {
  const smithing = trees["smithing.json"];
  if (!smithing) return;

  for (const perk of smithing.perks) {
    if (isSmithingBookUnlockedPerk(perk.description)) {
      perk.costsPerkPoint = false;
    }
  }
}

/** Preserve manually tuned grid positions from the previous planner JSON across rebuilds. */
export function loadPerkLayoutOverrides(perksDir) {
  const grids = new Map();
  const positionsBySkill = new Map();

  if (!existsSync(perksDir)) {
    return { grids, positionsBySkill };
  }

  for (const filename of readdirSync(perksDir)) {
    if (!filename.endsWith(".json") || filename === "index.json" || filename === "destiny.json") {
      continue;
    }

    const tree = JSON.parse(readFileSync(join(perksDir, filename), "utf8"));
    const skillId = tree.skillId;
    if (!skillId) continue;

    if (tree.grid?.width > 0 && tree.grid?.height > 0) {
      grids.set(skillId, { width: tree.grid.width, height: tree.grid.height });
    }

    const positions = new Map();
    for (const perk of tree.perks ?? []) {
      const canonical = canonicalPerkName(perk.name);
      if (!canonical || perk.position == null) continue;
      if (!positions.has(canonical)) {
        positions.set(canonical, { x: perk.position.x, y: perk.position.y });
      }
    }

    if (positions.size > 0) {
      positionsBySkill.set(skillId, positions);
    }
  }

  return { grids, positionsBySkill };
}

export function applyPerkLayoutOverrides(trees, layoutOverrides) {
  if (!layoutOverrides) return;

  const { grids, positionsBySkill } = layoutOverrides;
  if (positionsBySkill.size === 0) return;

  for (const [filename, tree] of Object.entries(trees)) {
    if (filename === "destiny.json") continue;

    const positions = positionsBySkill.get(tree.skillId);
    if (!positions) continue;

    for (const perk of tree.perks) {
      const saved = positions.get(canonicalPerkName(perk.name));
      if (saved) {
        perk.position = { x: saved.x, y: saved.y };
      }
    }

    const savedGrid = grids.get(tree.skillId);
    if (savedGrid) {
      tree.grid = { ...savedGrid };
    }

    tree.grid = resizeGridToFit(tree.perks, tree.grid ?? { width: 25, height: 25 });
    repositionOutOfGridPerks(tree);
  }
}

export function removeStalePerkFiles(perksDir, activeFilenames) {
  if (!existsSync(perksDir)) return [];

  const keep = new Set([...activeFilenames, "index.json"]);
  const removed = [];

  for (const filename of readdirSync(perksDir)) {
    if (!filename.endsWith(".json") || keep.has(filename)) continue;
    unlinkSync(join(perksDir, filename));
    removed.push(filename);
  }

  return removed;
}
