import assert from "node:assert/strict";
import { parseBonusEffects } from "../parse-bonus-effects.mjs";
import { mergeHybridEffects } from "./effect-merge.mjs";

const bosmerBonus =
  "Eye of the Hunt: The Bosmer are naturally skilled in marksmanship, and can aim their bows more precisely. Armor penetration with ranged weapons is increased by 5.";
const textEffects = parseBonusEffects(bosmerBonus);

const merged = mergeHybridEffects(textEffects, [
  { type: "derivedStat", stat: "poisonResist", value: 25, isPercent: true },
]);

assert.deepEqual(merged, [
  { type: "derivedStat", stat: "armorPenetrationRanged", value: 5, isPercent: false },
  { type: "derivedStat", stat: "poisonResist", value: 25, isPercent: true },
]);

console.log("resolve-effects-race.test.mjs: ok");
