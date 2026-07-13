import { SKILL_IDS } from "./skill-constants.mjs";
import { isSupernaturalPerkSkill } from "./supernatural-perk-skills.mjs";

const SKILL_SEGMENT_TO_ID = new Map([
  ["Smithing", "smithing"],
  ["HeavyArmor", "heavy-armor"],
  ["Heavy_Armor", "heavy-armor"],
  ["Block", "block"],
  ["TwoHanded", "two-handed"],
  ["Two_Handed", "two-handed"],
  ["OneHanded", "one-handed"],
  ["One_Handed", "one-handed"],
  ["Marksman", "marksman"],
  ["Marksmanship", "marksman"],
  ["Archery", "marksman"],
  ["LightArmor", "evasion"],
  ["Light_Armor", "evasion"],
  ["Evasion", "evasion"],
  ["Sneak", "sneak"],
  ["Pickpocket", "finesse"],
  ["Lockpicking", "wayfarer"],
  ["Wayfarer", "wayfarer"],
  ["Finesse", "finesse"],
  ["Speech", "speech"],
  ["Alchemy", "alchemy"],
  ["Illusion", "illusion"],
  ["Conjuration", "conjuration"],
  ["Destruction", "destruction"],
  ["Restoration", "restoration"],
  ["Alteration", "alteration"],
  ["Enchanting", "enchanting"],
]);

const ORD_PREFIX_TO_SKILL = {
  Alc: "alchemy",
  Alt: "alteration",
  Arc: "marksman",
  Bck: "block",
  Con: "conjuration",
  Des: "destruction",
  Enc: "enchanting",
  Hea: "heavy-armor",
  Ill: "illusion",
  Lia: "evasion",
  Loc: "wayfarer",
  One: "one-handed",
  Pic: "finesse",
  Res: "restoration",
  Smh: "smithing",
  Sne: "sneak",
  Spe: "speech",
  Two: "two-handed",
};

const FEAT_SKILL_SEGMENT_TO_ID = new Map([
  ["Block", "block"],
  ["OneHanded", "one-handed"],
  ["TwoHanded", "two-handed"],
  ["Marksmanship", "marksman"],
  ["Archery", "marksman"],
  ["HeavyArmor", "heavy-armor"],
  ["LightArmor", "evasion"],
  ["Sneak", "sneak"],
  ["Pickpocket", "finesse"],
  ["Lockpicking", "wayfarer"],
  ["Speech", "speech"],
  ["Alchemy", "alchemy"],
  ["Illusion", "illusion"],
  ["Conjuration", "conjuration"],
  ["Destruction", "destruction"],
  ["Restoration", "restoration"],
  ["Alteration", "alteration"],
  ["Enchanting", "enchanting"],
  ["Smithing", "smithing"],
]);

const REQ_SPECIAL_SEGMENT_TO_SKILL = new Map([
  ["WeaponsMaster1", "block"],
  ["WeaponsMaster2", "block"],
  ["WeaponsMasterFinal", "block"],
  ["PenetratingStrikes", "block"],
  ["WeaponMasterCritical", "block"],
  ["MasteryCritMult", "block"],
]);

const ALLOCATABLE_SKILL_IDS = new Set(SKILL_IDS.filter((id) => id !== "destiny" && id !== "traits"));

function classifyReqPerk(edid) {
  const body = edid.slice(4);
  const segment = body.split("_")[0];
  return (
    REQ_SPECIAL_SEGMENT_TO_SKILL.get(segment) ??
    SKILL_SEGMENT_TO_ID.get(segment) ??
    null
  );
}

function classifyOrdPerk(edid) {
  const match = edid.match(/^ORD_([A-Za-z]+)/);
  if (!match) return null;

  const prefix = match[1];
  for (const [key, skillId] of Object.entries(ORD_PREFIX_TO_SKILL)) {
    if (prefix.startsWith(key)) return skillId;
  }

  return null;
}

function classifyFeatPerk(edid) {
  const match = edid.match(/^Feat_Perk_(?:Skill|Char)_([A-Za-z]+)_/);
  if (!match) return null;
  return FEAT_SKILL_SEGMENT_TO_ID.get(match[1]) ?? null;
}

export function classifyPerkTreeSkill(record) {
  const edid = record.edid;

  if (edid.startsWith("FURY_Perk_Racial_")) return null;
  if (edid.startsWith("FURY_Perk_")) return "wayfarer";
  if (edid.startsWith("BBWayfarer")) return "wayfarer";
  if (edid.startsWith("LoreRimTrapper_")) return "finesse";
  if (edid.startsWith("BOOB_")) return "speech";
  if (edid.startsWith("Req_Pickpocket") || edid.startsWith("REQ_Pickpocket")) return "finesse";

  if (edid.startsWith("ORD_")) return classifyOrdPerk(edid);
  if (edid.startsWith("Feat_Perk_")) return classifyFeatPerk(edid);
  if (edid.startsWith("REQ_") || edid.startsWith("Req_")) return classifyReqPerk(edid);

  return null;
}

export function isAllocatablePerkSkill(skillId) {
  return ALLOCATABLE_SKILL_IDS.has(skillId);
}

/** Skill-point trees plus supernatural AVIF trees (werewolf / vampire). */
export function isImportableAvifPerkSkill(skillId) {
  return isAllocatablePerkSkill(skillId) || isSupernaturalPerkSkill(skillId);
}
