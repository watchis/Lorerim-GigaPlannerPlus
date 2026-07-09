import assert from "node:assert/strict";
import { buildMgefIndex, MGEF_EFFECT_TYPE } from "./mgef-index.mjs";
import { shouldUsePluginEffects } from "./bonus-effect-policy.mjs";
import { parseBonusEffects } from "../parse-bonus-effects.mjs";
import { resolveEffects, resolveEffectsFromSpells } from "./resolve-effects.mjs";

const shockMgef = {
  edid: "REQ_AbHide_FortifyShockResist",
  formIdentity: "requiem.esp|aaaa",
  plugin: "Requiem.esp",
  mgefArchetype: { effectType: MGEF_EFFECT_TYPE.VALUE_MOD, primaryAV: 40 },
};

const healthMgef = {
  edid: "REQ_AbHide_FortifyHealth",
  formIdentity: "requiem.esp|bbbb",
  plugin: "Requiem.esp",
  mgefArchetype: { effectType: MGEF_EFFECT_TYPE.VALUE_MOD, primaryAV: 24 },
};

const speedMgef = {
  edid: "REQ_AbHide_FortifyMovementSpeed",
  formIdentity: "requiem.esp|cccc",
  plugin: "Requiem.esp",
  mgefArchetype: { effectType: MGEF_EFFECT_TYPE.VALUE_MOD, primaryAV: 35 },
};

const staminaMgef = {
  edid: "REQ_AbHide_FortifyStamina",
  formIdentity: "requiem.esp|eeee",
  plugin: "Requiem.esp",
  mgefArchetype: { effectType: MGEF_EFFECT_TYPE.VALUE_MOD, primaryAV: 26 },
};

const mgefIndex = buildMgefIndex([shockMgef, healthMgef, speedMgef, staminaMgef]);

const plugins = [{ pluginName: "Test.esp", path: "/fake/Test.esp" }];
const mastersByPath = new Map([["/fake/Test.esp", ["requiem.esp"]]]);

function traitSpell(effectEntries) {
  return {
    edid: "Traits_Test_Ab",
    plugin: "Test.esp",
    effectEntries,
  };
}

function resolveWithPlugins(params) {
  return resolveEffects({
    mastersByPath,
    plugins,
    ...params,
  });
}

assert.equal(
  shouldUsePluginEffects(
    "When at less than 50% health, you move 20% faster and regenerate 1 stamina per second.",
  ),
  true,
);

assert.equal(
  shouldUsePluginEffects(
    "Gain 15% Magic Resist and 150 armor rating, restore 1.5 health per second, gain 30% Weakness to Fire.",
  ),
  false,
);

assert.equal(shouldUsePluginEffects(""), true);

const SHOCK_FORM_ID = 0x0100aaaa;
const HEALTH_FORM_ID = 0x0100bbbb;
const SPEED_FORM_ID = 0x0100cccc;
const STAMINA_FORM_ID = 0x0100eeee;

assert.deepEqual(
  resolveWithPlugins({
    bonusText:
      "Gain 15% Magic Resist and 150 armor rating, restore 1.5 health per second, gain 30% Weakness to Fire.",
    spellRecords: traitSpell([
      { formId: SHOCK_FORM_ID, magnitude: 150 },
      { formId: HEALTH_FORM_ID, magnitude: 2 },
    ]),
    mgefIndex,
  }),
  [
    { type: "derivedStat", stat: "magicResist", value: 15, isPercent: true },
    { type: "derivedStat", stat: "armorRating", value: 150, isPercent: false },
    { type: "derivedStat", stat: "healthRegenRate", value: 1.5, isPercent: false },
    { type: "derivedStat", stat: "fireResist", value: -30, isPercent: true },
  ],
);

assert.deepEqual(
  resolveWithPlugins({
    bonusText:
      "When at less than 50% health, you move 20% faster and regenerate 1 stamina per second but also deal 30% less damage when below this threshold.",
    spellRecords: traitSpell([
      { formId: SPEED_FORM_ID, magnitude: 20 },
      { formId: STAMINA_FORM_ID, magnitude: 1 },
    ]),
    mgefIndex,
  }),
  [],
);

assert.deepEqual(
  resolveWithPlugins({
    bonusText:
      "When standing still, you gain 200 armor rating and reflect 10% physical damage. You drain 1 additional stamina per second while sprinting and 0.25 when running.",
    spellRecords: traitSpell([{ formId: SHOCK_FORM_ID, magnitude: 200 }]),
    mgefIndex,
  }),
  [],
);

assert.deepEqual(
  resolveWithPlugins({
    bonusText: "Blood and Absorb spells are 20% stronger, but your health is reduced by 2 * your level.",
    spellRecords: traitSpell([{ formId: HEALTH_FORM_ID, magnitude: 2 }]),
    mgefIndex,
  }),
  [{ type: "derivedStat", stat: "spellDamage", value: 20, isPercent: true }],
);

const orsimerBonus =
  "Bulwark: Orcs have incredible strength and endurance, resistant to all types of damage. Armor rating increases by 150, magic deals 10% less damage to you.";

assert.deepEqual(
  resolveEffectsFromSpells(
    traitSpell([{ formId: SHOCK_FORM_ID, magnitude: 150 }]),
    orsimerBonus,
    mgefIndex,
    mastersByPath,
    plugins,
  ),
  [
    { type: "derivedStat", stat: "armorRating", value: 150, isPercent: false },
    { type: "derivedStat", stat: "magicResist", value: 10, isPercent: true },
  ],
);

const altmerBonus =
  "Highborn: High elf blood grants great affinity to magicka. Magicka regenerates 50% faster, spells are 5% more powerful and last longer.. Weakness to Elements: High elves are more resistant to all elements. Fire, frost, and shock deal 10% less damage to you.";

assert.deepEqual(
  resolveEffectsFromSpells(
    traitSpell([{ formId: SHOCK_FORM_ID, magnitude: 50 }]),
    altmerBonus,
    mgefIndex,
    mastersByPath,
    plugins,
  ),
  parseBonusEffects(altmerBonus),
);

const argonianBonus =
  "Histskin: Argonians can nautrally regenerate health faster than others, and their metabolism increases the effect of alchemical substances. Regenerate 1.5 health per second, potions are 10% more effective and last longer.. Resist Poison and Disease: Your Argonian blood greatly reduces the effect of poison and disease. Poison deals 75% less damage to you, you are 75% less likely to contract diseases.";

assert.deepEqual(
  resolveEffectsFromSpells(
    traitSpell([
      { formId: SPEED_FORM_ID, magnitude: 10 },
      { formId: HEALTH_FORM_ID, magnitude: 50 },
    ]),
    argonianBonus,
    mgefIndex,
    mastersByPath,
    plugins,
  ),
  parseBonusEffects(argonianBonus),
);

console.log("resolve-effects-regression.test.mjs: ok");
