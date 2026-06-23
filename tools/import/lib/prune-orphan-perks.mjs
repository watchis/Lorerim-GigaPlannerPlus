import { canonicalPerkName, removeDanglingPrerequisites } from "./perk-import-filter.mjs";
import {
  repositionOutOfGridPerks,
  resizeGridToFit,
} from "./append-missing-perks.mjs";

function hasPrerequisiteLinks(perk) {
  return (perk.prerequisites?.length ?? 0) > 0 || (perk.prerequisitesAny?.length ?? 0) > 0;
}

function hasSkillRequirement(perk) {
  return (perk.skillReq ?? 0) > 0;
}

function hasPlayerLevelRequirement(perk) {
  return perk.playerLevelReq != null && perk.playerLevelReq > 0;
}

function buildReferencedPerkIds(perks) {
  const referenced = new Set();

  for (const perk of perks) {
    for (const prerequisiteId of perk.prerequisites ?? []) {
      referenced.add(prerequisiteId);
    }
    for (const prerequisiteId of perk.prerequisitesAny ?? []) {
      referenced.add(prerequisiteId);
    }
  }

  return referenced;
}

export function isAnchoredPerk(perk, referencedPerkIds, avifNames = null) {
  if (avifNames?.has(canonicalPerkName(perk.name))) return true;

  return (
    hasPrerequisiteLinks(perk) ||
    hasSkillRequirement(perk) ||
    hasPlayerLevelRequirement(perk) ||
    referencedPerkIds.has(perk.id)
  );
}

export function pruneOrphanPerks(perks, { avifNames = null } = {}) {
  let next = perks;
  let changed = true;

  while (changed) {
    changed = false;
    const referencedPerkIds = buildReferencedPerkIds(next);
    const filtered = next.filter((perk) => isAnchoredPerk(perk, referencedPerkIds, avifNames));

    if (filtered.length !== next.length) {
      changed = true;
      next = removeDanglingPrerequisites(filtered);
      continue;
    }

    const cleaned = removeDanglingPrerequisites(filtered);
    if (cleaned.length !== next.length) {
      changed = true;
      next = cleaned;
    }
  }

  return next;
}

export function pruneAllPerkTrees(trees, { skipDestiny = true, membership = null } = {}) {
  const removedPerks = [];

  for (const [filename, tree] of Object.entries(trees)) {
    if (skipDestiny && filename === "destiny.json") continue;

    const before = tree.perks.length;
    const avifNames = membership?.namesBySkill?.get(tree.skillId) ?? null;
    tree.perks = pruneOrphanPerks(tree.perks, { avifNames });
    const count = before - tree.perks.length;

    if (count > 0) {
      removedPerks.push({
        skillId: tree.skillId,
        filename,
        count,
      });
      repositionOutOfGridPerks(tree);
      tree.grid = resizeGridToFit(tree.perks, tree.grid ?? { width: 25, height: 25 });
    }
  }

  return removedPerks;
}
