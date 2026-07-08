import assert from "node:assert/strict";
import { parseRaceData, raceDataSkillScore } from "./race-data-parser.mjs";

/** Build a minimal RACE DATA buffer with skill pairs and placeholder floats. */
function buildRaceDataBuffer(skillPairs) {
  const bytes = Buffer.alloc(100);
  for (const [index, actorValue, level] of skillPairs) {
    bytes[index] = actorValue;
    bytes[index + 1] = level;
  }
  return bytes;
}

assert.equal(
  raceDataSkillScore(buildRaceDataBuffer([[2, 21, 10]])),
  10,
  "raceDataSkillScore sums skill levels from DATA pairs",
);

const dunmerIllusion = parseRaceData(
  buildRaceDataBuffer([
    [2, 6, 10],
    [4, 12, 10],
    [6, 15, 10],
    [8, 21, 10],
    [10, 19, 10],
    [12, 20, 15],
  ]),
);
assert.equal(dunmerIllusion.startingSkills.illusion, 10);
assert.equal(dunmerIllusion.startingSkills.enchanting, 0);
assert.equal(dunmerIllusion.startingSkills.destruction, 15);

const altmerMagic = parseRaceData(
  buildRaceDataBuffer([
    [2, 18, 15],
    [4, 19, 10],
    [6, 20, 10],
    [8, 22, 10],
    [10, 21, 10],
    [12, 23, 10],
  ]),
);
assert.equal(altmerMagic.startingSkills.alteration, 15);
assert.equal(altmerMagic.startingSkills.illusion, 10);
assert.equal(altmerMagic.startingSkills.enchanting, 10);
assert.equal(altmerMagic.startingSkills.restoration, 10);

const bretonMagic = parseRaceData(buildRaceDataBuffer([[2, 21, 10]]));
assert.equal(bretonMagic.startingSkills.illusion, 10);
assert.equal(bretonMagic.startingSkills.enchanting, 0);

console.log("race-data-parser.test.mjs: ok");
