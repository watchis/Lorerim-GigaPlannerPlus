import { loadDestinyConfig } from "../lib/destiny-config.mjs";
import {
  applyPerkGraphSnapshots,
  applyPerkHandTunedOverrides,
  applyPerkLayoutOverrides,
  applySmithingBookPerkCosts,
  createEmptyPerkTrees,
  findStalePerkFiles,
  loadExistingPerkTree,
  loadPerkGraphSnapshots,
  loadPerkHandTunedOverrides,
  loadPerkLayoutOverrides,
  loadPerkPlayerLevelReqsByGraphKey,
  mergePerkPlayerLevelReqs,
  removeStalePerkFiles,
} from "../lib/import-reset.mjs";
import { cleanDescription, cleanName } from "../lib/transform-utils.mjs";
import { parseBonusEffects } from "../lib/parse-bonus-effects.mjs";
import { collectDisplayedPerkRecords } from "../lib/perk-import-filter.mjs";
import {
  appendMissingPerkNodes,
  buildPerkPlayerLevelReqs,
  normalizeStackPrerequisites,
} from "../lib/append-missing-perks.mjs";
import { resolveImportPaths } from "../lib/import-cli.mjs";
import {
  applyPerkExtensionBindings,
  loadExtensionBindings,
  validateExtensionBindings,
} from "../lib/extension-bindings.mjs";
import { pruneAllPerkTrees } from "../lib/prune-orphan-perks.mjs";
import { getSupernaturalPerkSkillIds } from "../lib/supernatural-perk-skills.mjs";

const DESTINY_SKILL_ID = "destiny";
const DESTINY_COORD_SCALE = 2;

function buildPerkLookups(perkRecords, membership) {
  const treePerkRecords = collectDisplayedPerkRecords(perkRecords, membership);
  return { treePerkRecords };
}

function darPerkSuffixName(edid) {
  const suffix = edid.replace(/^DAR_Perk\d+/, "");
  if (!suffix) return "";
  return suffix.replace(/([a-z])([A-Z])/g, "$1 $2");
}

function darPerkDisplayName(record, usedNames) {
  const fullName = cleanName(record.name);
  if (fullName) {
    const key = fullName.toLowerCase();
    if (!usedNames.has(key)) {
      usedNames.add(key);
      return fullName;
    }
  }

  const fallback = cleanName(darPerkSuffixName(record.edid));
  if (fallback) {
    usedNames.add(fallback.toLowerCase());
    return fallback;
  }

  return fullName || record.edid;
}

function buildDarDisplayNames(darPerks) {
  const usedNames = new Set();
  return darPerks.map((record) => darPerkDisplayName(record, usedNames));
}

function darPerkSortKey(edid) {
  const match = edid.match(/^DAR_Perk(\d+)/i);
  return match ? Number.parseInt(match[1], 10) : Number.MAX_SAFE_INTEGER;
}

function collectDarPerkRecords(perkRecords) {
  return perkRecords
    .filter((record) => record.edid.startsWith("DAR_Perk"))
    .sort((left, right) => darPerkSortKey(left.edid) - darPerkSortKey(right.edid));
}

function destinyPerkId(sequence) {
  return `${DESTINY_SKILL_ID}-${String(sequence).padStart(2, "0")}`;
}

function normalizeDestinyGrid(perks) {
  if (perks.length === 0) {
    return { perks, grid: { width: 1, height: 1 } };
  }

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const perk of perks) {
    minX = Math.min(minX, perk.position.x);
    minY = Math.min(minY, perk.position.y);
    maxX = Math.max(maxX, perk.position.x);
    maxY = Math.max(maxY, perk.position.y);
  }

  for (const perk of perks) {
    perk.position = {
      x: perk.position.x - minX,
      y: perk.position.y - minY,
    };
  }

  return {
    perks,
    grid: {
      width: maxX - minX + 1,
      height: maxY - minY + 1,
    },
  };
}

function buildDestinyTreeFromConfig(darPerks, configNodes, existingTree) {
  const enabledNodes = configNodes
    .filter((node) => node.enabled && node.index > 0)
    .sort((left, right) => left.index - right.index);

  const existingById = new Map(existingTree.perks.map((perk) => [perk.id, perk]));
  const displayNames = buildDarDisplayNames(darPerks);
  const nodeIndexToPerkId = new Map();
  const perks = [];

  for (const [index, node] of enabledNodes.entries()) {
    const record = darPerks[index];
    if (!record) break;

    const sequence = index + 1;
    const fallbackId = destinyPerkId(sequence);
    const existing =
      existingById.get(fallbackId) ??
      existingTree.perks.find((perk) => perk.id.endsWith(`-${String(sequence).padStart(2, "0")}`));
    const id = existing?.id ?? fallbackId;
    const name = displayNames[index] ?? cleanName(record.name || record.edid);
    const description = cleanDescription(record.description ?? existing?.description ?? "");

    nodeIndexToPerkId.set(node.index, id);
    perks.push({
      id,
      name,
      skillReq: 0,
      ...(existing?.costsPerkPoint === false ? { costsPerkPoint: false } : {}),
      position: {
        x: Math.round(node.x * DESTINY_COORD_SCALE),
        y: Math.round(node.y * DESTINY_COORD_SCALE),
      },
      prerequisites: [],
      prerequisitesAny: [],
      description,
      effects: existing?.effects?.length ? existing.effects : parseBonusEffects(description),
    });
  }

  for (const node of enabledNodes) {
    const parentId = nodeIndexToPerkId.get(node.index);
    if (!parentId) continue;

    for (const childIndex of node.links) {
      const childId = nodeIndexToPerkId.get(childIndex);
      if (!childId || childId === parentId) continue;

      const childPerk = perks.find((perk) => perk.id === childId);
      if (childPerk && !childPerk.prerequisitesAny.includes(parentId)) {
        childPerk.prerequisitesAny.push(parentId);
      }
    }
  }

  const normalized = normalizeDestinyGrid(perks);
  return {
    skillId: DESTINY_SKILL_ID,
    skillName: "Destiny",
    ...normalized,
  };
}

function buildFallbackDestinyTree(darPerks, existingTree) {
  const existingById = new Map(existingTree.perks.map((perk) => [perk.id, perk]));
  const displayNames = buildDarDisplayNames(darPerks);
  const columnWidth = 7;
  const perks = darPerks.map((record, index) => {
    const sequence = index + 1;
    const fallbackId = destinyPerkId(sequence);
    const existing = existingById.get(fallbackId);
    const name = displayNames[index] ?? cleanName(record.name || record.edid);

    return {
      id: existing?.id ?? fallbackId,
      name,
      skillReq: 0,
      ...(existing?.costsPerkPoint === false ? { costsPerkPoint: false } : {}),
      position: {
        x: index % columnWidth,
        y: Math.floor(index / columnWidth),
      },
      prerequisites: [],
      prerequisitesAny: [],
      description: cleanDescription(record.description ?? existing?.description ?? ""),
      effects: existing?.effects?.length
        ? existing.effects
        : parseBonusEffects(cleanDescription(record.description ?? existing?.description ?? "")),
    };
  });

  const normalized = normalizeDestinyGrid(perks);
  return {
    skillId: DESTINY_SKILL_ID,
    skillName: "Destiny",
    ...normalized,
  };
}

function buildDestinyTree(perkRecords, installDir, existingTree) {
  const darPerks = collectDarPerkRecords(perkRecords);
  if (darPerks.length === 0) return existingTree;

  const configNodes = installDir ? loadDestinyConfig(installDir) : null;
  if (configNodes?.length) {
    return buildDestinyTreeFromConfig(darPerks, configNodes, existingTree);
  }

  return buildFallbackDestinyTree(darPerks, existingTree);
}

export function transformPerkRecords(
  perkRecords,
  perksDir,
  installDir = null,
  metadataIndex = null,
  membership = null,
  importPaths = null,
) {
  const paths = importPaths ?? resolveImportPaths();
  const bindingsPath = paths.extensionBindingsPath;
  const handTunedOverrides = loadPerkHandTunedOverrides(perksDir);
  const layoutOverrides = loadPerkLayoutOverrides(perksDir);
  const graphSnapshots = loadPerkGraphSnapshots(perksDir);
  const existingLevelReqsByGraphKey = loadPerkPlayerLevelReqsByGraphKey(perksDir);
  const { trees, indexEntries } = createEmptyPerkTrees(membership);
  const { treePerkRecords } = buildPerkLookups(perkRecords, membership);

  // Keep planner-authored supernatural trees when the install has no AVIF for them.
  for (const skillId of getSupernaturalPerkSkillIds(membership)) {
    const filename = `${skillId}.json`;
    if (membership?.hasAvifForSkill(skillId)) continue;
    const existing = loadExistingPerkTree(perksDir, filename);
    if (existing?.perks?.length) {
      trees[filename] = existing;
    }
  }

  const existingDestiny =
    loadExistingPerkTree(perksDir, "destiny.json") ?? {
      skillId: DESTINY_SKILL_ID,
      skillName: "Destiny",
      grid: { width: 1, height: 1 },
      perks: [],
    };
  trees["destiny.json"] = buildDestinyTree(perkRecords, installDir, existingDestiny);

  const addedPerks = appendMissingPerkNodes(
    trees,
    treePerkRecords,
    metadataIndex,
    membership,
    perkRecords,
    bindingsPath,
  );
  applyPerkHandTunedOverrides(trees, handTunedOverrides);
  applySmithingBookPerkCosts(trees);
  const removedPerks = pruneAllPerkTrees(trees, { membership });
  applyPerkLayoutOverrides(trees, layoutOverrides);
  applyPerkGraphSnapshots(trees, graphSnapshots);
  const extensionBindings = loadExtensionBindings(bindingsPath);
  const { applied: extensionBindingsApplied } = applyPerkExtensionBindings(trees, extensionBindings);
  for (const tree of Object.values(trees)) {
    normalizeStackPrerequisites(tree);
  }
  const playerLevelReqs = mergePerkPlayerLevelReqs(
    trees,
    buildPerkPlayerLevelReqs(trees),
    existingLevelReqsByGraphKey,
  );

  const extensionBindingWarnings = validateExtensionBindings({
    bindings: extensionBindings,
    trees,
    characterOptionsPath: paths.characterOptionsPath,
    extensionsDir: paths.extensionsDir,
  });

  return {
    trees,
    indexEntries,
    addedPerks,
    removedPerks,
    playerLevelReqs,
    extensionBindingsApplied,
    extensionBindingWarnings,
  };
}

export async function importPerks(context) {
  const { perksDir } = context.paths;
  const {
    trees,
    indexEntries,
    addedPerks,
    removedPerks,
    playerLevelReqs,
    extensionBindingsApplied,
    extensionBindingWarnings,
  } = transformPerkRecords(
    context.scan.perkRecords,
    perksDir,
    context.install.installDir,
    context.derived.perkMetadataIndex,
    context.derived.avifMembership,
    context.paths,
  );

  const treeKeys = Object.keys(trees);
  const importedPerks = Object.values(trees).reduce((sum, tree) => sum + tree.perks.length, 0);

  return {
    files: [
      ["perks/index.json", indexEntries],
      ["perk-player-level-reqs.json", playerLevelReqs],
      ...Object.entries(trees).map(([filename, tree]) => [`perks/${filename}`, tree]),
    ],
    summary: {
      perkTrees: treeKeys.length,
      importedPerks,
      addedPerks: addedPerks.length,
      removedPerks: removedPerks.reduce((sum, entry) => sum + entry.count, 0),
      extensionBindingsApplied,
      extensionBindingWarnings,
    },
    stalePerkFiles: findStalePerkFiles(perksDir, treeKeys),
    postWrite: () => {
      const removedPerkFiles = removeStalePerkFiles(perksDir, treeKeys);
      return removedPerkFiles;
    },
  };
}
