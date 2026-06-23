/** Skyrim condition function indices (stored value = wiki index + 4096). */
export const GET_BASE_ACTOR_VALUE = 4373;
export const GET_IS_ID = 4544;

const SKILL_REQ_EDID_PATTERN = /_(\d{3})_/;

export function readRecordFormId(buffer) {
  if (buffer.length < 16) return 0;
  return buffer.readUInt32LE(12);
}

export function perkObjectId(formId) {
  return formId & 0x00ffffff;
}

export function scanSubrecords(buffer) {
  const subs = [];
  let index = buffer.indexOf("EDID");
  if (index < 0) return subs;

  while (index < buffer.length - 6) {
    const type = buffer.toString("ascii", index, index + 4);
    if (!/^[A-Z0-9]{4}$/.test(type)) break;
    const size = buffer.readUInt16LE(index + 4);
    subs.push({
      type,
      data: buffer.subarray(index + 6, index + 6 + size),
    });
    index += 6 + size;
  }

  return subs;
}

export function parseCtda(data) {
  const buffer = Buffer.isBuffer(data) ? data : Buffer.from(data);
  if (buffer.length < 12) return null;

  const operator = buffer[0];
  return {
    compareOp: (operator >> 5) & 7,
    value: buffer.readFloatLE(4),
    functionIndex: buffer.readUInt16LE(8) + 4096,
    param1: buffer.length >= 16 ? buffer.readInt32LE(12) : 0,
    param2: buffer.length >= 20 ? buffer.readInt32LE(16) : 0,
  };
}

export function parseSkillReqFromEdid(edid) {
  const match = String(edid ?? "").match(SKILL_REQ_EDID_PATTERN);
  if (!match) return null;
  const level = Number(match[1]);
  return Number.isFinite(level) && level > 0 ? level : null;
}

export function parseTopLevelPerkConditions(buffer) {
  const skillReqs = [];
  const prerequisiteRawFormIds = [];

  for (const sub of scanSubrecords(buffer)) {
    if (sub.type === "DATA") break;
    if (sub.type !== "CTDA") continue;

    const condition = parseCtda(sub.data);
    if (!condition) continue;

    if (
      condition.functionIndex === GET_BASE_ACTOR_VALUE &&
      (condition.compareOp === 3 || condition.compareOp === 5)
    ) {
      skillReqs.push(Math.round(condition.value));
    }

    if (condition.functionIndex === GET_IS_ID) {
      prerequisiteRawFormIds.push(condition.param1 >>> 0);
    }
  }

  return {
    skillReq: skillReqs.length > 0 ? Math.max(...skillReqs) : null,
    prerequisiteRawFormIds,
  };
}

/** PERK `NNAM` (Next Perk) links a perk to the next rank in a multi-rank stack. */
export function parseNextRankRawFormId(buffer) {
  for (const sub of scanSubrecords(buffer)) {
    if (sub.type === "NNAM" && sub.data.length >= 4) {
      return sub.data.readUInt32LE(0) >>> 0;
    }
  }
  return null;
}

export function parsePerkRecordMetadata(buffer, edid) {
  const conditions = parseTopLevelPerkConditions(buffer);

  return {
    rawFormId: readRecordFormId(buffer) >>> 0,
    skillReq: parseSkillReqFromEdid(edid) ?? conditions.skillReq,
    prerequisiteRawFormIds: conditions.prerequisiteRawFormIds,
    nextRankRawFormId: parseNextRankRawFormId(buffer),
  };
}
