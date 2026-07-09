import assert from "node:assert/strict";
import { parseBonusEffects } from "../parse-bonus-effects.mjs";
import { shouldUsePluginEffects } from "./bonus-effect-policy.mjs";
import { resolveEffectsFromSpells } from "./resolve-effects.mjs";
import { buildMgefIndex, MGEF_EFFECT_TYPE } from "./mgef-index.mjs";

const bosmerBonus =
  "Eye of the Hunt: The Bosmer are naturally skilled in marksmanship, and can aim their bows more precisely. Armor penetration with ranged weapons is increased by 5. Resist Poison and Disease: Your Bosmer blood grants you resistance to poison and diseases. Poison deals 25% less damage to you, you are 50% less likely to contract diseases. Grounded: +25% shock resist";

const textEffects = parseBonusEffects(bosmerBonus);
assert.equal(shouldUsePluginEffects(bosmerBonus, textEffects), false);

const mgefIndex = buildMgefIndex([
  {
    edid: "REQ_AbHide_FortifyPoisonResist",
    formIdentity: "requiem.esp|ffff",
    plugin: "Requiem.esp",
    mgefArchetype: { effectType: MGEF_EFFECT_TYPE.VALUE_MOD, primaryAV: 42 },
  },
]);

const plugins = [{ pluginName: "Test.esp", path: "/fake/Test.esp" }];
const mastersByPath = new Map([["/fake/Test.esp", ["requiem.esp"]]]);

const merged = resolveEffectsFromSpells(
  [
    {
      edid: "REQ_Ability_Race_WoodElf",
      plugin: "Test.esp",
      effectEntries: [{ formId: 0x0100ffff, magnitude: 99 }],
    },
  ],
  bosmerBonus,
  mgefIndex,
  mastersByPath,
  plugins,
);

assert.deepEqual(merged, textEffects);
assert.ok(merged.some((effect) => effect.stat === "poisonResist" && effect.value === 25));
assert.ok(!merged.some((effect) => effect.stat === "poisonResist" && effect.value === 99));

console.log("resolve-effects-race.test.mjs: ok");
