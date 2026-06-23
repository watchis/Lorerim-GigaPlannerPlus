import { canonicalPerkName } from "./perk-import-filter.mjs";
import { finalizeAvifPerkTrees, buildIdentityToPerkName } from "./avif-perk-tree.mjs";
import { classifyPerkTreeSkill } from "./perk-skill-classifier.mjs";
import { cleanName } from "./transform-utils.mjs";

export function perkMetadataKey(skillId, perkName) {
  return `${skillId}:${canonicalPerkName(perkName)}`;
}

function uniqueNames(names) {
  const seen = new Set();
  const result = [];
  for (const name of names) {
    const canonical = canonicalPerkName(name);
    if (!canonical || seen.has(canonical)) continue;
    seen.add(canonical);
    result.push(name);
  }
  return result;
}

export function buildPerkMetadataIndex(perkRecords, avifTrees, membership = null) {
  const identityToName = buildIdentityToPerkName(perkRecords);
  const finalizedAvif = finalizeAvifPerkTrees(avifTrees, identityToName);
  const byKey = new Map();

  for (const record of perkRecords) {
    const name = cleanName(record.name);
    if (!name || !record.perkMeta) continue;

    const identity = record.perkMeta.formIdentity;
    const skillId = membership?.skillByIdentity?.get(identity) ?? classifyPerkTreeSkill(record);
    if (!skillId) continue;

    const key = perkMetadataKey(skillId, name);
    const prerequisiteNames = record.perkMeta.prerequisiteIdentities
      .map((id) => identityToName.get(id))
      .filter(Boolean);

    byKey.set(key, {
      skillReq: record.perkMeta.skillReq ?? null,
      prerequisiteNames: uniqueNames(prerequisiteNames),
      position: null,
    });
  }

  for (const [skillId, tree] of finalizedAvif) {
    for (const section of tree.sections) {
      if (!section.name) continue;
      const key = perkMetadataKey(skillId, section.name);
      const existing = byKey.get(key) ?? {
        skillReq: null,
        prerequisiteNames: [],
        position: null,
      };

      byKey.set(key, {
        skillReq: existing.skillReq,
        prerequisiteNames: uniqueNames([
          ...existing.prerequisiteNames,
          ...(section.prerequisiteNames ?? []),
        ]),
        position:
          section.x != null && section.y != null
            ? { x: section.x, y: section.y }
            : existing.position,
      });
    }
  }

  return byKey;
}

export function resolvePrerequisiteId(tree, prerequisiteName, childSkillReq) {
  const canonical = canonicalPerkName(prerequisiteName);
  const matches = tree.perks.filter(
    (perk) => canonicalPerkName(perk.name) === canonical,
  );
  if (matches.length === 0) return null;
  if (matches.length === 1) return matches[0].id;

  const childReq = childSkillReq ?? 100;
  const below = matches.filter((perk) => (perk.skillReq ?? 0) < childReq);
  if (below.length > 0) {
    return below.sort((left, right) => (left.skillReq ?? 0) - (right.skillReq ?? 0))[0].id;
  }

  return matches.sort((left, right) => (left.skillReq ?? 0) - (right.skillReq ?? 0))[0].id;
}

export function resolvePrerequisiteIds(tree, prerequisiteNames, childSkillReq) {
  const ids = [];
  const seen = new Set();

  for (const name of prerequisiteNames) {
    const id = resolvePrerequisiteId(tree, name, childSkillReq);
    if (!id || seen.has(id)) continue;
    seen.add(id);
    ids.push(id);
  }

  return ids;
}

const DEFAULT_CAPSTONE_Y_OFFSET = 6;

export function inferPositionFromPrerequisites(tree, prerequisiteIds) {
  if (prerequisiteIds.length === 0) return null;

  const prerequisite = tree.perks.find((perk) => perk.id === prerequisiteIds[0]);
  if (!prerequisite) return null;

  return {
    x: prerequisite.position.x,
    y: prerequisite.position.y - DEFAULT_CAPSTONE_Y_OFFSET,
  };
}

/** Same-named siblings form a multi-rank stack. Name-based so it survives layout repositioning. */
function sameNameSiblings(perk, tree) {
  const canonical = canonicalPerkName(perk.name);
  return tree.perks.filter(
    (candidate) => candidate.id !== perk.id && canonicalPerkName(candidate.name) === canonical,
  );
}

export function applyPerkMetadata(perk, tree, metadataIndex) {
  const metadata = metadataIndex.get(perkMetadataKey(tree.skillId, perk.name));
  if (!metadata) return perk;

  const siblings = sameNameSiblings(perk, tree);
  const inStack = siblings.length > 0;
  const isHigherTier = siblings.some((s) => (s.skillReq ?? 0) < (perk.skillReq ?? 0));

  // Higher stack tiers are gated by the stack mechanism (position + skillReq), not metadata.
  if (isHigherTier) return perk;

  const ownCanonical = canonicalPerkName(perk.name);
  const prerequisiteNames = metadata.prerequisiteNames.filter(
    (name) => canonicalPerkName(name) !== ownCanonical,
  );

  // A stack's base rank keeps its own record skillReq; the by-name metadata can't distinguish ranks.
  const needsSkillReq = !inStack && (perk.skillReq ?? 0) === 0 && metadata.skillReq != null;
  const needsPrerequisites =
    (perk.prerequisites?.length ?? 0) === 0 && prerequisiteNames.length > 0;

  if (!needsSkillReq && !needsPrerequisites) return perk;

  const skillReq = needsSkillReq ? metadata.skillReq : perk.skillReq;
  const prerequisites = needsPrerequisites
    ? resolvePrerequisiteIds(tree, prerequisiteNames, skillReq)
    : perk.prerequisites;

  let position = perk.position;
  if (needsPrerequisites && prerequisites.length > 0) {
    position = inferPositionFromPrerequisites(tree, prerequisites) ?? position;
  }

  return {
    ...perk,
    skillReq,
    prerequisites,
    position,
  };
}

export function enrichPerkTreeMetadata(tree, metadataIndex) {
  if (!metadataIndex || metadataIndex.size === 0) return tree;

  tree.perks = tree.perks.map((perk) => applyPerkMetadata(perk, tree, metadataIndex));
  return tree;
}
