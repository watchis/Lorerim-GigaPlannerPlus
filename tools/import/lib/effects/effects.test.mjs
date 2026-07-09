import assert from "node:assert/strict";
import { buildMgefIndex, MGEF_EFFECT_TYPE } from "./mgef-index.mjs";
import {
  mgefEdidToEffects,
  mgefRecordToEffects,
  spellRecordToEffects,
} from "./spell-to-effects.mjs";
import { mergeHybridEffects, resolveEffects } from "./resolve-effects.mjs";
import { parseMgefDataBuffer } from "./mgef-data.mjs";

const healthMgef = {
  edid: "REQ_AbHide_FortifyHealth",
  formIdentity: "requiem.esp|8bc",
  plugin: "Requiem.esp",
  mgefArchetype: {
    effectType: MGEF_EFFECT_TYPE.VALUE_MOD,
    primaryAV: 24,
    secondAV: -1,
    flags: 0,
  },
};

const marksmanDamageMgef = {
  edid: "REQ_Ability_FortifyDamage_Marksman",
  formIdentity: "requiem.esp|ad3b10",
  plugin: "Requiem.esp",
  mgefArchetype: {
    effectType: MGEF_EFFECT_TYPE.VALUE_MOD,
    primaryAV: 137,
    secondAV: -1,
    flags: 0,
  },
};

const mgefIndex = buildMgefIndex([healthMgef, marksmanDamageMgef]);

assert.deepEqual(mgefEdidToEffects("REQ_AbHide_FortifyHealth", 60), [
  { type: "attribute", stat: "health", value: 60 },
]);

assert.deepEqual(mgefEdidToEffects("REQ_Ability_FortifyDamage_Marksman", 10), [
  { type: "derivedStat", stat: "bowDamage", value: 10, isPercent: true },
  { type: "derivedStat", stat: "crossbowDamage", value: 10, isPercent: true },
]);

assert.deepEqual(mgefRecordToEffects(healthMgef, 60), [
  { type: "attribute", stat: "health", value: 60 },
]);

const warriorSpell = {
  edid: "REQ_Ability_Birthsign_Warrior",
  plugin: "Big Tweaks.esp",
  effectEntries: [
    { formId: 0x010008bc, magnitude: null },
    { formId: 0x0ad3b10, magnitude: 10 },
  ],
};

const traitEffects = spellRecordToEffects(warriorSpell, mgefIndex, ["requiem.esp"]);
assert.equal(traitEffects.length, 2);

const data = Buffer.alloc(0x5c);
data.writeUInt32LE(MGEF_EFFECT_TYPE.VALUE_MOD, 0x40);
data.writeInt32LE(24, 0x44);
assert.deepEqual(parseMgefDataBuffer(data)?.primaryAV, 24);

assert.deepEqual(
  mergeHybridEffects(
    [
      { type: "derivedStat", stat: "magicResist", value: -25, isPercent: true },
      { type: "derivedStat", stat: "spellCost", value: -20, isPercent: true },
    ],
    [{ type: "attribute", stat: "magicka", value: 5 }],
  ),
  [
    { type: "derivedStat", stat: "magicResist", value: -25, isPercent: true },
    { type: "derivedStat", stat: "spellCost", value: -20, isPercent: true },
    { type: "attribute", stat: "magicka", value: 5 },
  ],
);

assert.deepEqual(
  mergeHybridEffects(
    [
      { type: "derivedStat", stat: "armorPenetrationRanged", value: 5, isPercent: false },
      { type: "derivedStat", stat: "poisonResist", value: 25, isPercent: true },
    ],
    [{ type: "derivedStat", stat: "poisonResist", value: 99, isPercent: true }],
  ),
  [
    { type: "derivedStat", stat: "armorPenetrationRanged", value: 5, isPercent: false },
    { type: "derivedStat", stat: "poisonResist", value: 25, isPercent: true },
  ],
);

assert.deepEqual(
  resolveEffects({
    bonusText: "Gain +50 health.",
    spellRecords: { edid: "NoEffects_Ab", plugin: "Test.esp", effectEntries: [] },
    mgefIndex,
  }),
  [{ type: "attribute", stat: "health", value: 50 }],
);

console.log("effects.test.mjs: ok");
