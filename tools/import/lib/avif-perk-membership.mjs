import { canonicalPerkName } from "./perk-import-filter.mjs";
import { finalizeAvifPerkTrees } from "./avif-perk-tree.mjs";
import { cleanName } from "./transform-utils.mjs";

export function buildPerkRecordByIdentity(perkRecords) {
  const byIdentity = new Map();

  for (const record of perkRecords) {
    const identity = record.perkMeta?.formIdentity;
    if (!identity) continue;
    byIdentity.set(identity, record);
  }

  return byIdentity;
}

export function buildAvifMembershipIndex(avifTrees, identityToName) {
  const finalizedAvif = finalizeAvifPerkTrees(avifTrees, identityToName);
  const identitiesBySkill = new Map();
  const namesBySkill = new Map();
  const skillByIdentity = new Map();
  const sectionByIdentity = new Map();
  const allDisplayedIdentities = new Set();

  for (const [skillId, tree] of finalizedAvif) {
    const identities = new Set();
    const names = new Set();

    for (const section of tree.sections) {
      identities.add(section.identity);
      allDisplayedIdentities.add(section.identity);
      skillByIdentity.set(section.identity, skillId);
      sectionByIdentity.set(section.identity, { skillId, ...section });

      if (section.name) {
        names.add(canonicalPerkName(section.name));
      }
    }

    if (identities.size > 0) {
      identitiesBySkill.set(skillId, identities);
      namesBySkill.set(skillId, names);
    }
  }

  return {
    finalizedAvif,
    identitiesBySkill,
    namesBySkill,
    skillByIdentity,
    sectionByIdentity,
    allDisplayedIdentities,
    hasAvifData: allDisplayedIdentities.size > 0,
    hasAvifForSkill(skillId) {
      return identitiesBySkill.has(skillId);
    },
  };
}

export function isPerkDisplayedInSkill(perkName, skillId, membership) {
  if (!membership?.hasAvifForSkill(skillId)) return true;
  const names = membership.namesBySkill.get(skillId);
  return names?.has(canonicalPerkName(perkName)) ?? false;
}

export function compareAvifToPlanner(perksDirTrees, membership, treePerkRecords) {
  const inAvifNotInPlanner = [];
  const inPlannerNotInAvif = [];
  const prefixOnlyNotInAvif = [];

  const plannerBySkill = new Map();
  for (const [filename, tree] of Object.entries(perksDirTrees)) {
    if (filename === "destiny.json") continue;
    const names = new Set(tree.perks.map((perk) => canonicalPerkName(perk.name)));
    plannerBySkill.set(tree.skillId, names);
  }

  if (membership?.hasAvifData) {
    for (const [skillId, tree] of membership.finalizedAvif) {
      const plannerNames = plannerBySkill.get(skillId) ?? new Set();

      for (const section of tree.sections) {
        const name = section.name;
        if (!name) continue;
        const canonical = canonicalPerkName(name);
        if (!plannerNames.has(canonical)) {
          inAvifNotInPlanner.push({
            skillId,
            name: cleanName(name),
            identity: section.identity,
          });
        }
      }

      for (const canonical of plannerNames) {
        const avifNames = membership.namesBySkill.get(skillId);
        if (avifNames && !avifNames.has(canonical)) {
          inPlannerNotInAvif.push({ skillId, name: canonical });
        }
      }
    }

    for (const record of treePerkRecords) {
      const identity = record.perkMeta?.formIdentity;
      if (!identity || membership.allDisplayedIdentities.has(identity)) continue;
      prefixOnlyNotInAvif.push({
        edid: record.edid,
        name: cleanName(record.name),
        identity,
      });
    }
  }

  return { inAvifNotInPlanner, inPlannerNotInAvif, prefixOnlyNotInAvif };
}
