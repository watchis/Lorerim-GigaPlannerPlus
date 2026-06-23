import { cleanName } from "./transform-utils.mjs";

/** Perks removed from LoreRim — keep absent from planner even if old JSON had them. */
const REMOVED_PERK_NAMES = new Set(["shivering isles smithing"]);

const PERK_NAME_ALIASES = new Map([
  ["cyromancy", "cryomancy"],
  ["iron law", "iron lore"],
  ["quarterstaff focus", "quarterstaff & battlestaff focus"],
  ["taming", "pacification"],
  ["empowered alteration", "empowered alterations"],
  ["armed spellcasting", "armed spelllcasting"],
]);

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

function normalizePerkName(name) {
  return cleanName(name).toLowerCase();
}

function canonicalPerkName(name) {
  const normalized = normalizePerkName(name);
  return PERK_NAME_ALIASES.get(normalized) ?? normalized;
}

export { canonicalPerkName };

function isHardExcludedPerkRecord(record) {
  const edid = record.edid;
  const name = cleanName(record.name);
  if (!name) return true;
  if (REMOVED_PERK_NAMES.has(normalizePerkName(name))) return true;

  if (edid.startsWith("Traits_")) return true;
  if (edid.startsWith("CustomREQ_") || edid.startsWith("clone_")) return true;
  if (edid.startsWith("REQ_Ability_")) return true;
  if (edid.startsWith("REQ_NULL_")) return true;
  if (edid.startsWith("REQ_Player_")) return true;
  if (edid.startsWith("REQ_Trait")) return true;
  if (
    /^REQ_(Scroll|Spell|Vampire|Werewolf|LEGACY|BattleFury|Power|Reward|AlduinController)/.test(
      edid,
    )
  ) {
    return true;
  }

  return false;
}

function isExcludedPerkRecord(record) {
  if (isHardExcludedPerkRecord(record)) return true;

  const edid = record.edid;
  if (edid.startsWith("ORD_")) {
    if (!edid.includes("_Perk_")) return true;
    if (/Proc_|_Proc/i.test(edid) && !edid.includes("OrdASISExclude")) return true;
    if (/Weapon\d|Armor\d|_\d[HhWw]$|_1H|_2H|_1W|_2W/i.test(edid)) return true;
    return false;
  }

  return false;
}

/** Mod prefixes whose perks appear in player trees but are not linked from AVIF PNAM sections. */
const SUPPLEMENTAL_TREE_PREFIXES = ["BOOB_"];

export function isSupplementalTreePerk(record) {
  if (isHardExcludedPerkRecord(record) || isNonPlayerPerkRecord(record)) return false;
  return SUPPLEMENTAL_TREE_PREFIXES.some((prefix) => record.edid.startsWith(prefix));
}

export function isTreePerkRecord(record) {
  if (isExcludedPerkRecord(record)) return false;

  const edid = record.edid;
  return (
    edid.startsWith("REQ_") ||
    edid.startsWith("Req_") ||
    edid.startsWith("Feat_Perk_") ||
    edid.startsWith("FURY_Perk_") ||
    edid.startsWith("LoreRimTrapper_") ||
    edid.startsWith("BBWayfarer") ||
    edid.startsWith("BOOB_") ||
    edid.startsWith("ORD_")
  );
}

export function perkNamesMatch(plannerName, espName) {
  return canonicalPerkName(plannerName) === canonicalPerkName(espName);
}

function recordMatchPriority(edid) {
  const index = RECORD_PREFIX_PRIORITY.findIndex((prefix) => edid.startsWith(prefix));
  return index === -1 ? RECORD_PREFIX_PRIORITY.length : index;
}

export function isRemovedPlannerPerk(name) {
  return REMOVED_PERK_NAMES.has(normalizePerkName(name));
}

/** Bundled NPC perk packages — not shown in the player planner. */
export function isNonPlayerPerkRecord(record) {
  const name = cleanName(record.name);
  return /^NPC\b/i.test(name);
}

export function collectTreePerkRecords(perkRecords) {
  return perkRecords.filter(isTreePerkRecord);
}

/** Perks in the final merged AVIF trees (player perk menus), with prefix-filter fallback. */
export function collectDisplayedPerkRecords(perkRecords, membership) {
  if (!membership?.hasAvifData) {
    return collectTreePerkRecords(perkRecords);
  }

  return perkRecords.filter((record) => {
    const identity = record.perkMeta?.formIdentity;
    if (!identity || !membership.allDisplayedIdentities.has(identity)) return false;
    if (isHardExcludedPerkRecord(record)) return false;
    if (isNonPlayerPerkRecord(record)) return false;
    return true;
  });
}

function pickBestMatch(matches) {
  return matches.sort(
    (left, right) => recordMatchPriority(left.edid) - recordMatchPriority(right.edid),
  )[0];
}

export function findTreePerkRecord(plannerName, treePerkRecords, { skillId, membership } = {}) {
  if (isRemovedPlannerPerk(plannerName)) return undefined;

  const target = canonicalPerkName(plannerName);
  const matches = treePerkRecords.filter(
    (record) => canonicalPerkName(record.name) === target,
  );
  if (matches.length === 0) return undefined;
  if (matches.length === 1) return matches[0];

  if (membership) {
    if (skillId && membership.hasAvifForSkill(skillId)) {
      const avifIds = membership.identitiesBySkill.get(skillId);
      const inSkill = matches.filter((record) => avifIds.has(record.perkMeta?.formIdentity));
      if (inSkill.length > 0) return pickBestMatch(inSkill);
    }

    const displayed = matches.filter((record) =>
      membership.allDisplayedIdentities.has(record.perkMeta?.formIdentity),
    );
    if (displayed.length > 0) return pickBestMatch(displayed);

    if (membership.hasAvifData) return undefined;
  }

  return pickBestMatch(matches);
}

export function removeDanglingPrerequisites(perks) {
  const ids = new Set(perks.map((perk) => perk.id));

  return perks.map((perk) => ({
    ...perk,
    prerequisites: perk.prerequisites?.filter((id) => ids.has(id)) ?? [],
    prerequisitesAny: perk.prerequisitesAny?.filter((id) => ids.has(id)) ?? [],
  }));
}
