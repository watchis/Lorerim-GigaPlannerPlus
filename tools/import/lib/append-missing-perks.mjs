import { SKILL_NAMES, SKILL_IDS } from "./skill-constants.mjs";
import { buildPerkRecordByIdentity } from "./avif-perk-membership.mjs";
import {
  canonicalPerkName,
  collectTreePerkRecords,
  isNonPlayerPerkRecord,
  isRemovedPlannerPerk,
  isSupplementalTreePerk,
  removeDanglingPrerequisites,
} from "./perk-import-filter.mjs";
import {
  classifyPerkTreeSkill,
  isAllocatablePerkSkill,
  isImportableAvifPerkSkill,
} from "./perk-skill-classifier.mjs";
import { cleanDescription, cleanName, slugify } from "./transform-utils.mjs";
import {
  loadExtensionBindings,
  defaultExtensionBindingsPath,
  resolvePerkExtension,
} from "./extension-bindings.mjs";
import { parseBonusEffects } from "./parse-bonus-effects.mjs";
import { applyPerkMetadata, stackRankFromPerkId } from "./perk-tree-metadata.mjs";
import { applyGigaPlannerTreeLayout } from "./giga-planner-layout.mjs";

const RECORD_PREFIX_PRIORITY = [
  "REQ_",
  "Req_",
  "Feat_Perk_",
  "FURY_Perk_",
  "LoreRimTrapper_",
  "BBWayfarer",
  "BOOB_",
  "ORD_",
];

function recordMatchPriority(edid) {
  const index = RECORD_PREFIX_PRIORITY.findIndex((prefix) => edid.startsWith(prefix));
  return index === -1 ? RECORD_PREFIX_PRIORITY.length : index;
}

function occupiedPositions(perks) {
  const occupied = new Set();
  for (const perk of perks) {
    occupied.add(`${perk.position.x},${perk.position.y}`);
  }
  return occupied;
}

/** First empty cell on the current grid; grows the grid only when full. */
export function nextAvailablePosition(perks, grid) {
  const occupied = occupiedPositions(perks);
  let width = Math.max(grid?.width ?? 25, 1);
  let height = Math.max(grid?.height ?? 25, 1);

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (!occupied.has(`${x},${y}`)) {
        return { position: { x, y }, grid: { width, height } };
      }
    }
  }

  return {
    position: { x: 0, y: height },
    grid: { width, height: height + 1 },
  };
}

export function resizeGridToFit(perks, grid) {
  let width = Math.max(grid?.width ?? 1, 1);
  let height = Math.max(grid?.height ?? 1, 1);

  for (const perk of perks) {
    width = Math.max(width, perk.position.x + 1);
    height = Math.max(height, perk.position.y + 1);
  }

  return { width, height };
}

function isInsideGrid(position, grid) {
  const width = Math.max(grid?.width ?? 1, 1);
  const height = Math.max(grid?.height ?? 1, 1);
  return (
    position.x >= 0 &&
    position.y >= 0 &&
    position.x < width &&
    position.y < height
  );
}

/** Move perks outside `grid` onto the next free in-bounds cell. */
export function repositionOutOfGridPerks(tree) {
  if (!tree.perks?.length) return { moved: [] };

  const grid = {
    width: Math.max(tree.grid?.width ?? 25, 1),
    height: Math.max(tree.grid?.height ?? 25, 1),
  };
  const moved = [];

  for (const perk of tree.perks) {
    if (isInsideGrid(perk.position, grid)) continue;

    const inBounds = tree.perks.filter((candidate) => isInsideGrid(candidate.position, grid));
    const placement = nextAvailablePosition(inBounds, grid);
    grid.width = placement.grid.width;
    grid.height = placement.grid.height;

    moved.push({
      id: perk.id,
      name: perk.name,
      from: { ...perk.position },
      to: { ...placement.position },
    });
    perk.position = placement.position;
  }

  tree.grid = resizeGridToFit(tree.perks, grid);
  return { moved };
}

export function normalizePerkTreeGrid(tree) {
  if (!tree.perks?.length) return tree;

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

  for (const perk of tree.perks) {
    perk.position = {
      x: perk.position.x - minX,
      y: perk.position.y - minY,
    };
  }

  tree.grid = {
    width: maxX - minX + 1,
    height: maxY - minY + 1,
  };

  return tree;
}

function uniquePerkId(skillId, record, usedIds) {
  const candidates = [
    `${skillId}-${slugify(record.name)}`,
    `${skillId}-${slugify(record.edid.replace(/^ORD_|^REQ_|^Feat_Perk_/, ""))}`,
    `${skillId}-${slugify(record.edid)}`,
  ];

  for (const candidate of candidates) {
    if (!usedIds.has(candidate)) return candidate;
  }

  let suffix = 2;
  while (usedIds.has(`${candidates[0]}-${suffix}`)) suffix += 1;
  return `${candidates[0]}-${suffix}`;
}

function buildPlannerCanonicalNamesBySkill(trees) {
  const bySkill = new Map();

  for (const [filename, tree] of Object.entries(trees)) {
    if (filename === "destiny.json") continue;
    bySkill.set(
      tree.skillId,
      new Set(tree.perks.map((perk) => canonicalPerkName(perk.name))),
    );
  }

  return bySkill;
}

function hasPlannerName(bySkill, skillId, perkName) {
  return bySkill.get(skillId)?.has(canonicalPerkName(perkName)) ?? false;
}

function addPlannerName(bySkill, skillId, perkName) {
  const canonical = canonicalPerkName(perkName);
  if (!canonical) return;

  let names = bySkill.get(skillId);
  if (!names) {
    names = new Set();
    bySkill.set(skillId, names);
  }
  names.add(canonical);
}

function buildBestRecordByCanonicalName(treePerkRecords) {
  const byCanonical = new Map();

  for (const record of treePerkRecords) {
    const canonical = canonicalPerkName(record.name);
    if (!canonical || isRemovedPlannerPerk(record.name)) continue;

    const existing = byCanonical.get(canonical);
    if (
      !existing ||
      recordMatchPriority(record.edid) < recordMatchPriority(existing.edid)
    ) {
      byCanonical.set(canonical, record);
    }
  }

  return byCanonical;
}

function createPerkNode(
  skillId,
  record,
  usedIds,
  position,
  tree,
  metadataIndex,
  rankBaseId,
  rankIndex = 0,
  extensionBindings = null,
) {
  const name = cleanName(record.name);
  const description = cleanDescription(record.description ?? "");
  const id = rankBaseId ? `${rankBaseId}-r${rankIndex + 1}` : uniquePerkId(skillId, record, usedIds);
  const extension = extensionBindings
    ? resolvePerkExtension(extensionBindings, skillId, name)
    : undefined;

  const perk = {
    id,
    name,
    skillReq: record.perkMeta?.skillReq ?? 0,
    position: { ...position },
    prerequisites: [],
    description,
    effects: extension ? [] : parseBonusEffects(description),
    prerequisitesAny: [],
    ...(extension ? { extension } : {}),
  };

  if (record.perkMeta?.playerLevelReq > 1) {
    perk._importPlayerLevelReq = record.perkMeta.playerLevelReq;
  }

  return metadataIndex ? applyPerkMetadata(perk, tree, metadataIndex) : perk;
}

function groupPerksByStackName(perks) {
  const byName = new Map();

  for (const perk of perks) {
    const canonical = canonicalPerkName(perk.name);
    const group = byName.get(canonical);
    if (group) {
      group.push(perk);
    } else {
      byName.set(canonical, [perk]);
    }
  }

  return byName;
}

function sortStackPerks(perks) {
  return [...perks].sort((left, right) => {
    const skillDiff = (left.skillReq ?? 0) - (right.skillReq ?? 0);
    if (skillDiff !== 0) return skillDiff;
    const rankDiff = stackRankFromPerkId(left.id) - stackRankFromPerkId(right.id);
    if (rankDiff !== 0) return rankDiff;
    return String(left.id).localeCompare(String(right.id));
  });
}

/** Rank 2+ inherit rank 1 prerequisites; chain-only GetIsID gates are not kept on higher ranks. */
export function normalizeStackPrerequisites(tree) {
  for (const stack of groupPerksByStackName(tree.perks).values()) {
    if (stack.length <= 1) continue;

    const sorted = sortStackPerks(stack);
    const base = sorted[0];
    const basePrerequisites = [...(base.prerequisites ?? [])];
    const basePrerequisitesAny = [...(base.prerequisitesAny ?? [])];

    for (const perk of sorted.slice(1)) {
      perk.prerequisites = [...basePrerequisites];
      perk.prerequisitesAny = [...basePrerequisitesAny];
    }
  }
}

export function buildPerkPlayerLevelReqs(trees) {
  const reqs = {};

  for (const tree of Object.values(trees)) {
    for (const perk of tree.perks ?? []) {
      const level = perk._importPlayerLevelReq;
      if (level > 1) reqs[perk.id] = level;
      delete perk._importPlayerLevelReq;
    }
  }

  return Object.fromEntries(Object.keys(reqs).sort().map((id) => [id, reqs[id]]));
}

/** Follow PERK `NNAM` links to enumerate every rank of a multi-rank perk, starting at rank 1. */
function collectRankChain(firstRecord, recordByIdentity) {
  const chain = [firstRecord];
  const visited = new Set([firstRecord.perkMeta?.formIdentity]);
  let current = firstRecord;

  while (chain.length < 16) {
    const nextIdentity = current.perkMeta?.nextRankIdentity;
    if (!nextIdentity || visited.has(nextIdentity)) break;

    const nextRecord = recordByIdentity.get(nextIdentity);
    if (!nextRecord || isNonPlayerPerkRecord(nextRecord) || isRemovedPlannerPerk(nextRecord.name)) {
      break;
    }

    chain.push(nextRecord);
    visited.add(nextIdentity);
    current = nextRecord;
  }

  return chain;
}

function registerSupplementalAnchor(membership, skillId, perkName) {
  if (!membership) return;
  const canonical = canonicalPerkName(perkName);
  if (!canonical) return;

  let names = membership.namesBySkill.get(skillId);
  if (!names) {
    names = new Set();
    membership.namesBySkill.set(skillId, names);
  }
  names.add(canonical);
}

function appendPerkStack(
  skillId,
  record,
  recordByIdentity,
  tree,
  usedIds,
  placement,
  plannerNamesBySkill,
  added,
  source,
  extensionBindings,
) {
  const rankRecords = collectRankChain(record, recordByIdentity);
  let rankBaseId = null;

  rankRecords.forEach((rankRecord, rankIndex) => {
    const perk = createPerkNode(
      skillId,
      rankRecord,
      usedIds,
      placement.position,
      tree,
      null,
      rankIndex === 0 ? null : rankBaseId,
      rankIndex,
      extensionBindings,
    );
    if (rankIndex === 0) rankBaseId = perk.id;
    tree.perks.push(perk);
    usedIds.add(perk.id);
    added.push({
      skillId,
      name: perk.name,
      edid: rankRecord.edid,
      source: rankIndex === 0 ? source : `${source}-rank`,
    });
  });

  addPlannerName(plannerNamesBySkill, skillId, record.name);
}

function appendFromAvifSections(
  trees,
  membership,
  recordByIdentity,
  metadataIndex,
  plannerNamesBySkill,
  added,
  extensionBindings,
) {
  for (const [skillId, avifTree] of membership.finalizedAvif) {
    if (!isImportableAvifPerkSkill(skillId)) continue;

    const filename = `${skillId}.json`;
    const tree = trees[filename];
    if (!tree) continue;

    const usedIds = new Set(tree.perks.map((perk) => perk.id));

    for (const section of avifTree.sections) {
      const name = section.name;
      if (!name) continue;

      if (hasPlannerName(plannerNamesBySkill, skillId, name)) continue;

      const record = recordByIdentity.get(section.identity);
      if (!record || isNonPlayerPerkRecord(record) || isRemovedPlannerPerk(name)) continue;

      const hasAvifPosition = section.x != null && section.y != null;
      const placement = hasAvifPosition
        ? { position: { x: section.x, y: section.y }, grid: tree.grid ?? { width: 25, height: 25 } }
        : nextAvailablePosition(tree.perks, tree.grid ?? { width: 25, height: 25 });

      tree.grid = placement.grid;

      appendPerkStack(
        skillId,
        record,
        recordByIdentity,
        tree,
        usedIds,
        placement,
        plannerNamesBySkill,
        added,
        "avif",
        extensionBindings,
      );
    }
  }
}

function appendFromSupplementalPrefixes(
  trees,
  membership,
  recordByIdentity,
  allPerkRecords,
  plannerNamesBySkill,
  added,
  extensionBindings,
) {
  const supplementalRecords = collectTreePerkRecords(allPerkRecords).filter(isSupplementalTreePerk);
  const bestByCanonical = buildBestRecordByCanonicalName(supplementalRecords);

  for (const [, record] of bestByCanonical) {
    const identity = record.perkMeta?.formIdentity;
    if (identity && membership?.allDisplayedIdentities?.has(identity)) continue;

    const skillId = classifyPerkTreeSkill(record);
    if (!skillId || !isAllocatablePerkSkill(skillId)) continue;
    if (hasPlannerName(plannerNamesBySkill, skillId, record.name)) continue;

    const filename = `${skillId}.json`;
    const tree = trees[filename];
    if (!tree) continue;

    const usedIds = new Set(tree.perks.map((perk) => perk.id));
    const placement = nextAvailablePosition(tree.perks, tree.grid ?? { width: 25, height: 25 });
    tree.grid = placement.grid;

    appendPerkStack(
      skillId,
      record,
      recordByIdentity,
      tree,
      usedIds,
      placement,
      plannerNamesBySkill,
      added,
      "supplemental",
      extensionBindings,
    );
    registerSupplementalAnchor(membership, skillId, record.name);
  }
}

function appendFromPrefixHeuristics(
  trees,
  treePerkRecords,
  metadataIndex,
  plannerNamesBySkill,
  added,
  extensionBindings,
) {
  const bestByCanonical = buildBestRecordByCanonicalName(treePerkRecords);

  for (const [, record] of bestByCanonical) {
    if (isNonPlayerPerkRecord(record)) continue;

    const skillId = classifyPerkTreeSkill(record);
    if (!skillId || !isAllocatablePerkSkill(skillId)) continue;
    if (hasPlannerName(plannerNamesBySkill, skillId, record.name)) continue;

    const filename = `${skillId}.json`;
    const tree = trees[filename];
    if (!tree) continue;

    const usedIds = new Set(tree.perks.map((perk) => perk.id));
    const placement = nextAvailablePosition(tree.perks, tree.grid ?? { width: 25, height: 25 });
    tree.grid = placement.grid;
    const perk = createPerkNode(
      skillId,
      record,
      usedIds,
      placement.position,
      tree,
      metadataIndex,
      null,
      0,
      extensionBindings,
    );
    tree.perks.push(perk);
    usedIds.add(perk.id);
    addPlannerName(plannerNamesBySkill, skillId, record.name);
    added.push({ skillId, name: perk.name, edid: record.edid, source: "prefix" });
  }
}

export function appendMissingPerkNodes(
  trees,
  treePerkRecords,
  metadataIndex = null,
  membership = null,
  perkRecords = null,
  bindingsPath = defaultExtensionBindingsPath(),
) {
  const extensionBindings = loadExtensionBindings(bindingsPath);
  const plannerNamesBySkill = buildPlannerCanonicalNamesBySkill(trees);
  const added = [];

  if (membership?.hasAvifData) {
    const recordByIdentity = buildPerkRecordByIdentity(perkRecords ?? treePerkRecords);
    appendFromAvifSections(
      trees,
      membership,
      recordByIdentity,
      metadataIndex,
      plannerNamesBySkill,
      added,
      extensionBindings,
    );
    appendFromSupplementalPrefixes(
      trees,
      membership,
      recordByIdentity,
      perkRecords ?? treePerkRecords,
      plannerNamesBySkill,
      added,
      extensionBindings,
    );
  } else {
    appendFromPrefixHeuristics(
      trees,
      treePerkRecords,
      metadataIndex,
      plannerNamesBySkill,
      added,
      extensionBindings,
    );
  }

  for (const [filename, tree] of Object.entries(trees)) {
    if (filename === "destiny.json") continue;
    if (metadataIndex) {
      tree.perks = tree.perks.map((perk) => applyPerkMetadata(perk, tree, metadataIndex));
    }
    tree.perks = removeDanglingPrerequisites(tree.perks);
    normalizeStackPrerequisites(tree);
    applyGigaPlannerTreeLayout(tree);
    tree.grid = resizeGridToFit(tree.perks, tree.grid ?? { width: 25, height: 25 });
    repositionOutOfGridPerks(tree);
    tree.grid = resizeGridToFit(tree.perks, tree.grid ?? { width: 25, height: 25 });
    const skillIndex = SKILL_IDS.indexOf(tree.skillId);
    if (skillIndex >= 0) {
      tree.skillName = SKILL_NAMES[skillIndex];
    }
  }

  return added;
}
