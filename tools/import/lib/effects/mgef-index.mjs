import { resolveFormIdentity } from "../formid.mjs";

/** Skyrim actor value indices (standard Creation Kit ordering). */
export const ACTOR_VALUE_NAMES = [
  "None",
  "Aggression",
  "Confidence",
  "Energy",
  "Morality",
  "Mood",
  "Assistance",
  "OneHanded",
  "TwoHanded",
  "Marksman",
  "Block",
  "Smithing",
  "HeavyArmor",
  "LightArmor",
  "Pickpocket",
  "Lockpicking",
  "Sneak",
  "Alchemy",
  "Speech",
  "Alteration",
  "Conjuration",
  "Destruction",
  "Illusion",
  "Restoration",
  "Health",
  "Magicka",
  "Stamina",
  "HealRate",
  "MagickaRate",
  "StaminaRate",
  "SpeedMult",
  "InventoryWeight",
  "CarryWeight",
  "Mass",
  "VoicePoints",
  "VoiceRate",
  "DamageResist",
  "PoisonResist",
  "FireResist",
  "ElectricResist",
  "FrostResist",
  "MagicResist",
];

export const MGEF_EFFECT_TYPE = {
  VALUE_MOD: 0,
  SCRIPT: 1,
  DISPEL: 2,
  DUAL_VALUE_MOD: 5,
  PEAK_VALUE_MOD: 34,
};

/** @deprecated Use MGEF_EFFECT_TYPE */
export const MGEF_ARCHETYPE = MGEF_EFFECT_TYPE;

/**
 * @param {Array<{ edid: string, formId?: number, formIdentity?: string, plugin?: string, mgefArchetype?: { archetype: number, actorValue: number, skill: number } }>} mgefRecords
 */
export function buildMgefIndex(mgefRecords) {
  const byIdentity = new Map();
  const byEdid = new Map();

  for (const record of mgefRecords) {
    if (record.edid) byEdid.set(record.edid, record);
    if (record.formIdentity) byIdentity.set(record.formIdentity, record);
  }

  return { byIdentity, byEdid };
}

export function actorValueName(actorValueIndex) {
  return ACTOR_VALUE_NAMES[actorValueIndex] ?? null;
}

export function resolveMgefRecord(mgefIndex, formId, spellRecord, masters = []) {
  if (formId == null || !spellRecord) return null;

  const ownerPlugin = String(spellRecord.plugin ?? "").toLowerCase();
  const identity = resolveFormIdentity(ownerPlugin, masters, formId);
  return mgefIndex.byIdentity.get(identity) ?? null;
}
