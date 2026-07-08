import { existsSync, readdirSync, readFileSync, unlinkSync } from "node:fs";
import { join } from "node:path";
import { canonicalPerkName, removeDanglingPrerequisites } from "./perk-import-filter.mjs";
import { repositionOutOfGridPerks, resizeGridToFit } from "./append-missing-perks.mjs";
import { SKILL_IDS, SKILL_NAMES } from "./skill-constants.mjs";
import { loadJsonIfExists } from "./transform-utils.mjs";

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
    if (!filename.endsWith(".json") || filename === "index.json") {
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

export function perkGraphKey(perk) {
  const rankMatch = String(perk.id ?? "").match(/-r(\d+)$/);
  const rankPart = rankMatch ? `r${rankMatch[1]}` : `s${perk.skillReq ?? 0}`;
  return `${canonicalPerkName(perk.name)}:${rankPart}`;
}

/** Map pre-import perk graph keys to player level reqs so ids can change across rebuilds. */
export function loadPerkPlayerLevelReqsByGraphKey(perksDir) {
  const reqs = loadJsonIfExists(join(perksDir, "..", "perk-player-level-reqs.json"));
  if (!reqs || typeof reqs !== "object") return new Map();

  const byGraphKey = new Map();
  if (!existsSync(perksDir)) return byGraphKey;

  for (const filename of readdirSync(perksDir)) {
    if (!filename.endsWith(".json") || filename === "index.json") continue;

    let tree;
    try {
      tree = JSON.parse(readFileSync(join(perksDir, filename), "utf8"));
    } catch {
      continue;
    }

    for (const perk of tree.perks ?? []) {
      const level = reqs[perk.id];
      if (typeof level === "number" && level > 1) {
        byGraphKey.set(perkGraphKey(perk), level);
      }
    }
  }

  return byGraphKey;
}

export function mergePerkPlayerLevelReqs(trees, importedReqs, existingByGraphKey) {
  const idByGraphKey = new Map();
  const validIds = new Set();

  for (const tree of Object.values(trees)) {
    for (const perk of tree.perks ?? []) {
      validIds.add(perk.id);
      idByGraphKey.set(perkGraphKey(perk), perk.id);
    }
  }

  const merged = {};
  for (const [id, level] of Object.entries(importedReqs)) {
    if (validIds.has(id) && typeof level === "number" && level > 1) {
      merged[id] = level;
    }
  }

  for (const [graphKey, level] of existingByGraphKey) {
    const id = idByGraphKey.get(graphKey);
    if (id && merged[id] == null && level > 1) {
      merged[id] = level;
    }
  }

  return Object.fromEntries(Object.keys(merged).sort().map((id) => [id, merged[id]]));
}

export function loadExistingPerkTree(perksDir, filename) {
  const path = join(perksDir, filename);
  if (!existsSync(path)) return null;

  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch {
    return null;
  }
}

/** Preserve stable ids and prerequisite graphs from curated planner JSON across rebuilds. */
export function loadPerkGraphSnapshots(perksDir) {
  const snapshots = new Map();
  if (!existsSync(perksDir)) return snapshots;

  for (const filename of readdirSync(perksDir)) {
    if (!filename.endsWith(".json") || filename === "index.json") continue;

    const tree = JSON.parse(readFileSync(join(perksDir, filename), "utf8"));
    if (!tree.skillId) continue;

    const byGraphKey = new Map();
    const idToGraphKey = new Map();

    for (const perk of tree.perks ?? []) {
      const key = perkGraphKey(perk);
      if (!byGraphKey.has(key)) {
        byGraphKey.set(key, {
          id: perk.id,
          prerequisites: [...(perk.prerequisites ?? [])],
          prerequisitesAny: [...(perk.prerequisitesAny ?? [])],
          ...(perk.costsPerkPoint === true ? { costsPerkPoint: true } : {}),
          ...(perk.extension ? { extension: perk.extension } : {}),
          ...(perk.effects?.length ? { effects: [...perk.effects] } : {}),
          ...(perk.allocation ? { allocation: { ...perk.allocation } } : {}),
        });
      }
      idToGraphKey.set(perk.id, key);
    }

    if (byGraphKey.size > 0) {
      snapshots.set(tree.skillId, { byGraphKey, idToGraphKey });
    }
  }

  return snapshots;
}

function remapPrerequisiteIds(savedIds, idToGraphKey, graphKeyToId) {
  const remapped = [];
  const seen = new Set();

  for (const savedId of savedIds) {
    const graphKey = idToGraphKey.get(savedId);
    if (!graphKey) continue;
    const currentId = graphKeyToId.get(graphKey);
    if (!currentId || seen.has(currentId)) continue;
    seen.add(currentId);
    remapped.push(currentId);
  }

  return remapped;
}

export function applyPerkGraphSnapshots(trees, snapshots) {
  if (!snapshots || snapshots.size === 0) return;

  for (const tree of Object.values(trees)) {
    const snapshot = snapshots.get(tree.skillId);
    if (!snapshot) continue;

    const graphKeyToId = new Map();

    for (const perk of tree.perks) {
      const key = perkGraphKey(perk);
      const saved = snapshot.byGraphKey.get(key);
      if (!saved) {
        graphKeyToId.set(key, perk.id);
        continue;
      }

      perk.id = saved.id;
      graphKeyToId.set(key, saved.id);

      if (saved.costsPerkPoint === true) {
        perk.costsPerkPoint = true;
      }
      if (saved.extension) {
        perk.extension = saved.extension;
        perk.effects = saved.effects?.length ? saved.effects : [];
      } else if (saved.effects?.length) {
        perk.effects = saved.effects;
      }
      if (saved.allocation) {
        perk.allocation = saved.allocation;
      }
    }

    for (const perk of tree.perks) {
      const key = perkGraphKey(perk);
      const saved = snapshot.byGraphKey.get(key);
      if (!saved) continue;

      perk.prerequisites = remapPrerequisiteIds(
        saved.prerequisites,
        snapshot.idToGraphKey,
        graphKeyToId,
      );
      perk.prerequisitesAny = remapPrerequisiteIds(
        saved.prerequisitesAny,
        snapshot.idToGraphKey,
        graphKeyToId,
      );
    }

    tree.perks = removeDanglingPrerequisites(tree.perks);
  }
}

export function findStalePerkFiles(perksDir, activeFilenames) {
  if (!existsSync(perksDir)) return [];

  const keep = new Set([...activeFilenames, "index.json"]);
  return readdirSync(perksDir).filter(
    (filename) => filename.endsWith(".json") && !keep.has(filename),
  );
}

export function removeStalePerkFiles(perksDir, activeFilenames) {
  const removed = findStalePerkFiles(perksDir, activeFilenames);
  for (const filename of removed) {
    unlinkSync(join(perksDir, filename));
  }
  return removed;
}
