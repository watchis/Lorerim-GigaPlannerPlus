import assert from "node:assert/strict";
import { parseRaceData, raceDataSkillScore } from "./race-data-parser.mjs";
import { buildRaceDataBuffer } from "./test-fixtures.mjs";

const sparse = buildRaceDataBuffer({
  skillPairs: [{ actorValue: 20, level: 25 }],
  health: 90.4,
  magicka: 100.6,
  stamina: 90.4,
  carryWeight: 275.5,
  healthRegen: 0.7,
  unarmedDamage: 12.3,
});

assert.equal(raceDataSkillScore(sparse), 25);
assert.equal(raceDataSkillScore(null), 0);
assert.equal(raceDataSkillScore(Buffer.alloc(10)), 0);

const parsed = parseRaceData(sparse);
assert.equal(parsed.startingAttributes.health, 90);
assert.equal(parsed.startingAttributes.magicka, 101);
assert.equal(parsed.startingAttributes.stamina, 90);
assert.equal(parsed.startingCarryWeight, 276);
assert.equal(parsed.unarmedDamage, 12);
assert.equal(parsed.regen.health, 0.7);
assert.equal(parsed.startingSkills.destruction, 25);
assert.equal(parsed.startingSkills.block, 0);

const rich = buildRaceDataBuffer({
  skillPairs: [
    { actorValue: 6, level: 15 },
    { actorValue: 9, level: 10 },
    { actorValue: 20, level: 20 },
    { actorValue: 99, level: 50 },
    { actorValue: 15, level: 5 },
  ],
});

assert.equal(raceDataSkillScore(rich), 15 + 10 + 20 + 50 + 5);
const richParsed = parseRaceData(rich);
assert.equal(richParsed.startingSkills["one-handed"], 15);
assert.equal(richParsed.startingSkills.block, 10);
assert.equal(richParsed.startingSkills.destruction, 20);
assert.equal(richParsed.startingSkills.sneak, 5);
assert.equal(richParsed.startingSkills.smithing, 0);

assert.equal(parseRaceData(Buffer.alloc(40)), null);
assert.equal(parseRaceData([1, 2, 3]), null);

console.log("race-data-parser.test.mjs: ok");
