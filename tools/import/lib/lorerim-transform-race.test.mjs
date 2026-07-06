import assert from "node:assert/strict";
import { buildRaceEffectsFromRaces } from "./lorerim-transform.mjs";

const raceEffects = buildRaceEffectsFromRaces([
  { id: "none", bonuses: ["Ignored: should not appear"] },
  {
    id: "bosmer",
    bonuses: [
      "Eye of the Hunt: The Bosmer are naturally skilled in marksmanship, and can aim their bows more precisely. Armor penetration with ranged weapons is increased by 5.",
    ],
  },
]);

assert.equal(raceEffects.none, undefined);
assert.ok(Array.isArray(raceEffects.bosmer));
assert.ok(raceEffects.bosmer.length > 0);
assert.equal(raceEffects.bosmer[0].type, "derivedStat");

console.log("lorerim-transform-race.test.mjs: ok");
