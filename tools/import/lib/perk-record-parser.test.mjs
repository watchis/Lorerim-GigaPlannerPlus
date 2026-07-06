import assert from "node:assert/strict";
import {
  parseCtda,
  parsePerkRecordMetadata,
  parseSkillReqFromEdid,
  parseTopLevelPerkConditions,
  perkObjectId,
} from "./perk-record-parser.mjs";

const consumeLifePrereqHex =
  "000000000000803fc0010000685c0045000000000000000000000000ffffffff";
const destructionSkillHex =
  "600000000000c8421501000014000000000000000000000000000000ffffffff";
const playerLevelHex =
  "6000000000002041500000140000000000000000000000000000ffffffff";

assert.equal(parseSkillReqFromEdid("REQ_Destruction_BloodMagic_100_BloodMastery"), 100);
assert.equal(parseSkillReqFromEdid("REQ_Destruction_BloodMagic_075_ConsumeLife"), 75);
assert.equal(parseSkillReqFromEdid("REQ_Destruction_FireMastery"), null);

const prereqCondition = parseCtda(Buffer.from(consumeLifePrereqHex, "hex"));
assert.equal(prereqCondition.functionIndex, 4544);
assert.equal(perkObjectId(prereqCondition.param1), 0x005c68);

const skillCondition = parseCtda(Buffer.from(destructionSkillHex, "hex"));
assert.equal(skillCondition.functionIndex, 4373);
assert.equal(skillCondition.compareOp, 3);
assert.equal(skillCondition.value, 100);
assert.equal(skillCondition.param1, 20);

function buildPerkBuffer(edid, ctdaHexes) {
  const parts = [Buffer.from("EDID"), Buffer.alloc(2), Buffer.from(`${edid}\0`, "utf8")];
  parts[1].writeUInt16LE(parts[2].length);

  for (const hex of ctdaHexes) {
    const data = Buffer.from(hex, "hex");
    const header = Buffer.alloc(6);
    header.write("CTDA", 0, 4, "ascii");
    header.writeUInt16LE(data.length, 4);
    parts.push(header, data);
  }

  const dataHeader = Buffer.alloc(6);
  dataHeader.write("DATA", 0, 4, "ascii");
  dataHeader.writeUInt16LE(5, 4);
  parts.push(dataHeader, Buffer.from([0, 0, 1, 1, 0]));

  return Buffer.concat(parts);
}

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
const levelConditions = parseTopLevelPerkConditions(levelBuffer);
assert.equal(levelConditions.playerLevelReq, 10);
assert.equal(parsePerkRecordMetadata(levelBuffer, "REQ_Alchemy_Herbalist1").playerLevelReq, 10);

const rankedBuffer = (() => {
  const parts = [Buffer.from("EDID"), Buffer.alloc(2), Buffer.from("REQ_Sneak_Stealth1\0", "utf8")];
  parts[1].writeUInt16LE(parts[2].length);
  const dataHeader = Buffer.alloc(6);
  dataHeader.write("DATA", 0, 4, "ascii");
  dataHeader.writeUInt16LE(5, 4);
  parts.push(dataHeader, Buffer.from([0, 0, 5, 1, 0]));
  const nnam = Buffer.alloc(4);
  nnam.writeUInt32LE(0x0000c07c6 & 0xffffffff, 0);
  const nnamHeader = Buffer.alloc(6);
  nnamHeader.write("NNAM", 0, 4, "ascii");
  nnamHeader.writeUInt16LE(4, 4);
  parts.push(nnamHeader, nnam);
  return Buffer.concat(parts);
})();

assert.equal(parsePerkRecordMetadata(rankedBuffer, "REQ_Sneak_Stealth1").nextRankRawFormId, 0xc07c6);

console.log("perk-record-parser.test.mjs: ok");
