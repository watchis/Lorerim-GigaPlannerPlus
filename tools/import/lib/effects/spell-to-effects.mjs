import { actorValueName, resolveMgefRecord } from "./mgef-index.mjs";
import { MGEF_EFFECT_TYPE } from "./mgef-data.mjs";
import { dedupePluginEffects } from "./effect-merge.mjs";

const MAPPABLE_EFFECT_TYPES = new Set([
  MGEF_EFFECT_TYPE.VALUE_MOD,
  MGEF_EFFECT_TYPE.PEAK_VALUE_MOD,
  MGEF_EFFECT_TYPE.DUAL_VALUE_MOD,
]);

function attributeEffect(stat, magnitude) {
  const rounded = Math.round(magnitude);
  if (!Number.isFinite(rounded) || rounded === 0) return null;
  return { type: "attribute", stat, value: rounded };
}

function derivedEffect(stat, magnitude, isPercent = true) {
  const rounded = Math.round(magnitude);
  if (!Number.isFinite(rounded) || rounded === 0) return null;
  return { type: "derivedStat", stat, value: rounded, isPercent };
}

const ACTOR_VALUE_MAPPERS = {
  Health: (magnitude) => attributeEffect("health", magnitude),
  Magicka: (magnitude) => attributeEffect("magicka", magnitude),
  Stamina: (magnitude) => attributeEffect("stamina", magnitude),
  CarryWeight: (magnitude) => derivedEffect("carryWeight", magnitude, false),
  SpeedMult: (magnitude) => derivedEffect("moveSpeed", magnitude, true),
  HealRate: (magnitude) => derivedEffect("healthRegen", magnitude, true),
  MagickaRate: (magnitude) => derivedEffect("magickaRegen", magnitude, true),
  StaminaRate: (magnitude) => derivedEffect("staminaRegen", magnitude, true),
  DamageResist: (magnitude) => derivedEffect("armorRating", magnitude, false),
  FireResist: (magnitude) => derivedEffect("fireResist", magnitude, true),
  FrostResist: (magnitude) => derivedEffect("frostResist", magnitude, true),
  ElectricResist: (magnitude) => derivedEffect("shockResist", magnitude, true),
  PoisonResist: (magnitude) => derivedEffect("poisonResist", magnitude, true),
  MagicResist: (magnitude) => derivedEffect("magicResist", magnitude, true),
};

/**
 * Map Requiem / LoreRim MGEF editor IDs to planner effects when actor values are custom.
 * @returns {Array}
 */
export function mgefEdidToEffects(edid, magnitude) {
  const rounded = Math.round(magnitude);
  if (!edid || !Number.isFinite(rounded) || rounded === 0) return [];

  const effects = [];

  const fortifyAttribute = edid.match(/Fortify(Health|Magicka|Stamina)\b/i);
  if (fortifyAttribute) {
    const effect = attributeEffect(fortifyAttribute[1].toLowerCase(), rounded);
    return effect ? [effect] : [];
  }

  const drainAttribute = edid.match(/Drain(Health|Magicka|Stamina)\b/i);
  if (drainAttribute) {
    const effect = attributeEffect(drainAttribute[1].toLowerCase(), -Math.abs(rounded));
    return effect ? [effect] : [];
  }

  const fortifyDamage = edid.match(/FortifyDamage_(OneHanded|TwoHanded|Marksman|Unarmed)/i);
  if (fortifyDamage) {
    const weapon = fortifyDamage[1].toLowerCase();
    if (weapon === "onehanded") effects.push(derivedEffect("oneHandDamage", rounded));
    else if (weapon === "twohanded") effects.push(derivedEffect("twoHandDamage", rounded));
    else if (weapon === "marksman") {
      effects.push(derivedEffect("bowDamage", rounded));
      effects.push(derivedEffect("crossbowDamage", rounded));
    } else if (weapon === "unarmed") effects.push(derivedEffect("unarmedDamage", rounded, false));
    return effects.filter(Boolean);
  }

  const fortifyPenetration = edid.match(/FortifyArmorPenetration_(OneHanded|TwoHanded|Marksman)/i);
  if (fortifyPenetration) {
    const ranged = fortifyPenetration[1].toLowerCase() === "marksman";
    const effect = derivedEffect(
      ranged ? "armorPenetrationRanged" : "armorPenetrationMelee",
      rounded,
      false,
    );
    return effect ? [effect] : [];
  }

  const fortifyResist = edid.match(
    /Fortify(?:Resist)?(Fire|Frost|Shock|Electric|Poison|Magic)Resist/i,
  );
  if (fortifyResist) {
    const element = fortifyResist[1].toLowerCase().replace("electric", "shock");
    const stat = element === "magic" ? "magicResist" : `${element}Resist`;
    const effect = derivedEffect(stat, rounded);
    return effect ? [effect] : [];
  }

  const weakness = edid.match(/Weakness(?:To)?(Fire|Frost|Shock|Electric|Poison|Magic)/i);
  if (weakness) {
    const element = weakness[1].toLowerCase().replace("electric", "shock");
    const stat = element === "magic" ? "magicResist" : `${element}Resist`;
    const effect = derivedEffect(stat, -Math.abs(rounded));
    return effect ? [effect] : [];
  }

  if (/Fortify(?:Spell|Magic)Damage/i.test(edid)) {
    const effect = derivedEffect("spellDamage", rounded);
    return effect ? [effect] : [];
  }

  if (/FortifySpellCost|FortifyMagickaCost|ReduceSpellCost/i.test(edid)) {
    const effect = derivedEffect("spellCost", -Math.abs(rounded));
    return effect ? [effect] : [];
  }

  if (/FortifyMovementSpeed|FortifySpeed/i.test(edid)) {
    const effect = derivedEffect("moveSpeed", rounded);
    return effect ? [effect] : [];
  }

  if (/FortifyCarryWeight/i.test(edid)) {
    const effect = derivedEffect("carryWeight", rounded, false);
    return effect ? [effect] : [];
  }

  if (/FortifyUnarmedDamage/i.test(edid)) {
    const effect = derivedEffect("unarmedDamage", rounded, false);
    return effect ? [effect] : [];
  }

  return effects;
}

/**
 * @param {{ edid?: string, mgefArchetype?: { effectType: number, primaryAV: number } }} mgefRecord
 * @param {number | null} magnitude
 */
export function mgefRecordToEffect(mgefRecord, magnitude) {
  if (magnitude == null) return null;

  const fromEdid = mgefEdidToEffects(mgefRecord.edid, magnitude);
  if (fromEdid.length === 1) return fromEdid[0];

  const meta = mgefRecord.mgefArchetype;
  if (!meta || !MAPPABLE_EFFECT_TYPES.has(meta.effectType)) return null;
  if (meta.primaryAV < 0) return null;

  const avName = actorValueName(meta.primaryAV);
  if (!avName) return null;

  const mapper = ACTOR_VALUE_MAPPERS[avName];
  if (!mapper) return null;

  return mapper(magnitude);
}

/**
 * @param {{ edid?: string, mgefArchetype?: object }} mgefRecord
 * @param {number | null} magnitude
 */
export function mgefRecordToEffects(mgefRecord, magnitude) {
  if (magnitude == null) return [];
  return mgefEdidToEffects(mgefRecord.edid, magnitude);
}

/**
 * @param {{ effectEntries?: Array<{ formId: number, magnitude: number | null }>, plugin?: string }} spellRecord
 * @param {{ byIdentity: Map }} mgefIndex
 * @param {string[]} masters
 */
export function spellRecordToEffects(spellRecord, mgefIndex, masters = []) {
  if (!spellRecord?.effectEntries?.length) return [];

  const effects = [];

  for (const entry of spellRecord.effectEntries) {
    const mgefRecord = resolveMgefRecord(mgefIndex, entry.formId, spellRecord, masters);
    if (!mgefRecord) continue;
    effects.push(...mgefRecordToEffects(mgefRecord, entry.magnitude));
  }

  return dedupePluginEffects(effects);
}

/**
 * @param {Array} spellRecords
 * @param {{ byIdentity: Map }} mgefIndex
 * @param {Map<string, string[]>} mastersByPath
 * @param {Array<{ pluginName: string, path: string }>} plugins
 */
export function spellRecordsToEffects(spellRecords, mgefIndex, mastersByPath, plugins = []) {
  const pluginPathByName = new Map(
    plugins.map((plugin) => [plugin.pluginName.toLowerCase(), plugin.path]),
  );

  const effects = [];

  for (const spellRecord of spellRecords) {
    const pluginPath = pluginPathByName.get(String(spellRecord.plugin ?? "").toLowerCase());
    const masters = pluginPath ? (mastersByPath.get(pluginPath) ?? []) : [];
    effects.push(...spellRecordToEffects(spellRecord, mgefIndex, masters));
  }

  return effects;
}

export function findSpellRecord(spellRecords, edid) {
  return spellRecords.find((record) => record.edid === edid) ?? null;
}

export function spellEdidToEffects(spellEdid, spellRecords, mgefIndex, mastersByPath, plugins) {
  const spell = findSpellRecord(spellRecords, spellEdid);
  if (!spell) return [];
  return spellRecordsToEffects([spell], mgefIndex, mastersByPath, plugins);
}
