import assert from "node:assert/strict";
import {
  parseCtda,
  parseNextRankRawFormId,
  parsePerkRecordMetadata,
  parseSkillReqFromEdid,
  parseTopLevelPerkConditions,
  perkObjectId,
  readRecordFormId,
  scanSubrecords,
} from "./perk-record-parser.mjs";
import { buildCtdaSubrecord, buildEdidSubrecord, buildPerkBuffer, buildSubrecord } from "./test-fixtures.mjs";

const consumeLifePrereqHex =
  "000000000000803fc0010000685c0045000000000000000000000000ffffffff";
const destructionSkillHex =
  "600000000000c8421501000014000000000000000000000000000000ffffffff";
const playerLevelHex =
  "6000000000002041500000140000000000000000000000000000ffffffff";

assert.equal(parseSkillReqFromEdid("REQ_Destruction_BloodMagic_100_BloodMastery"), 100);
assert.equal(parseSkillReqFromEdid("REQ_Destruction_BloodMagic_075_ConsumeLife"), 75);
assert.equal(parseSkillReqFromEdid("REQ_Destruction_FireMastery"), null);
assert.equal(parseSkillReqFromEdid(null), null);
assert.equal(parseSkillReqFromEdid("REQ_Destruction_BloodMagic_000_Invalid"), null);

const prereqCondition = parseCtda(Buffer.from(consumeLifePrereqHex, "hex"));
assert.equal(prereqCondition.functionIndex, 4544);
assert.equal(perkObjectId(prereqCondition.param1), 0x005c68);
assert.equal(parseCtda(Buffer.alloc(8)), null);

const skillCondition = parseCtda(Buffer.from(destructionSkillHex, "hex"));
assert.equal(skillCondition.functionIndex, 4373);
assert.equal(skillCondition.compareOp, 3);
assert.equal(skillCondition.value, 100);
assert.equal(skillCondition.param1, 20);

const buffer = buildPerkBuffer("REQ_Destruction_BloodMagic_100_BloodMastery", [
  consumeLifePrereqHex,
  destructionSkillHex,
]);

const expectedPrereqFormId = prereqCondition.param1 >>> 0;
const conditions = parseTopLevelPerkConditions(buffer);
assert.equal(conditions.skillReq, 100);
assert.deepEqual(conditions.prerequisiteRawFormIds, [expectedPrereqFormId]);
assert.equal(perkObjectId(conditions.prerequisiteRawFormIds[0]), 0x005c68);

const metadata = parsePerkRecordMetadata(buffer, "REQ_Destruction_BloodMagic_100_BloodMastery");
assert.equal(metadata.skillReq, 100);
assert.deepEqual(metadata.prerequisiteRawFormIds, [expectedPrereqFormId]);
assert.equal(metadata.nextRankRawFormId, null);

const levelBuffer = buildPerkBuffer("REQ_Alchemy_Herbalist1", [playerLevelHex]);
assert.equal(parseTopLevelPerkConditions(levelBuffer).playerLevelReq, 10);
assert.equal(parsePerkRecordMetadata(levelBuffer, "REQ_Alchemy_Herbalist1").playerLevelReq, 10);

const rankedBuffer = buildPerkBuffer(
  "REQ_Sneak_Stealth1",
  [],
  [buildSubrecord("NNAM", (() => {
    const nnam = Buffer.alloc(4);
    nnam.writeUInt32LE(0x0000c07c6 & 0xffffffff, 0);
    return nnam;
  })())],
);
assert.equal(parseNextRankRawFormId(rankedBuffer), 0xc07c6);
assert.equal(parsePerkRecordMetadata(rankedBuffer, "REQ_Sneak_Stealth1").nextRankRawFormId, 0xc07c6);

const subs = scanSubrecords(buffer);
assert.deepEqual(
  subs.map((sub) => sub.type),
  ["EDID", "CTDA", "CTDA", "DATA"],
);
assert.equal(subs[0].data.toString("utf8").replace(/\0/g, ""), "REQ_Destruction_BloodMagic_100_BloodMastery");

const truncated = Buffer.concat([
  buildEdidSubrecord("REQ_Truncated"),
  buildSubrecord("CTDA", Buffer.alloc(20)),
]).subarray(0, 24);
assert.deepEqual(scanSubrecords(truncated).map((sub) => sub.type), ["EDID"]);
assert.deepEqual(scanSubrecords(Buffer.from("no edid marker", "ascii")), []);

const headerBuf = Buffer.alloc(16);
headerBuf.writeUInt32LE(0x0100abcd, 12);
assert.equal(readRecordFormId(Buffer.alloc(8)), 0);
assert.equal(readRecordFormId(headerBuf) & 0x00ffffff, 0x00abcd);

console.log("perk-record-parser.test.mjs: ok");
