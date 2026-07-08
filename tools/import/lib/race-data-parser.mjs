import { SKILL_IDS } from "./skill-constants.mjs";

/** Skyrim actor value indices used by LoreRim / Requiem race DATA skill pairs. */
const ACTOR_VALUE_SKILL_MAP = {
  6: "one-handed",
  7: "two-handed",
  8: "marksman",
  9: "block",
  10: "smithing",
  11: "heavy-armor",
  12: "evasion",
  13: "finesse",
  14: "wayfarer",
  15: "sneak",
  16: "alchemy",
  17: "speech",
  18: "alteration",
  19: "conjuration",
  20: "destruction",
  21: "illusion",
  22: "restoration",
  23: "enchanting",
};

const RACE_DATA_FLOAT_OFFSETS = {
  health: 36,
  magicka: 40,
  stamina: 44,
  carryWeight: 48,
  healthRegen: 84,
  magickaRegen: 88,
  staminaRegen: 92,
  unarmedDamage: 96,
};

function toDataBuffer(data) {
  if (!data) return null;
  if (Buffer.isBuffer(data)) return data;
  if (Array.isArray(data)) return Buffer.from(data);
  return null;
}

function readFloat(bytes, offset) {
  if (offset + 4 > bytes.length) return 0;
  const value = bytes.readFloatLE(offset);
  return Number.isFinite(value) ? value : 0;
}

function roundStat(value) {
  return Math.round(value * 1000) / 1000;
}

export function raceDataSkillScore(data) {
  const bytes = toDataBuffer(data);
  if (!bytes || bytes.length < 14) return 0;

  let score = 0;
  for (let index = 3; index < 14; index += 2) {
    score += bytes[index];
  }
  return score;
}

export function parseRaceData(data) {
  const bytes = toDataBuffer(data);
  if (!bytes || bytes.length < 52) return null;

  const startingSkills = Object.fromEntries(
    SKILL_IDS.filter((skillId) => skillId !== "destiny" && skillId !== "traits").map((skillId) => [
      skillId,
      0,
    ]),
  );

  for (let index = 2; index < 14; index += 2) {
    const actorValue = bytes[index];
    const level = bytes[index + 1];
    const skillId = ACTOR_VALUE_SKILL_MAP[actorValue];
    if (!skillId || level <= 0) continue;
    startingSkills[skillId] = level;
  }

  return {
    startingAttributes: {
      health: Math.round(readFloat(bytes, RACE_DATA_FLOAT_OFFSETS.health)),
      magicka: Math.round(readFloat(bytes, RACE_DATA_FLOAT_OFFSETS.magicka)),
      stamina: Math.round(readFloat(bytes, RACE_DATA_FLOAT_OFFSETS.stamina)),
    },
    startingCarryWeight: Math.round(readFloat(bytes, RACE_DATA_FLOAT_OFFSETS.carryWeight)),
    unarmedDamage: Math.round(readFloat(bytes, RACE_DATA_FLOAT_OFFSETS.unarmedDamage)),
    regen: {
      health: roundStat(readFloat(bytes, RACE_DATA_FLOAT_OFFSETS.healthRegen)),
      magicka: roundStat(readFloat(bytes, RACE_DATA_FLOAT_OFFSETS.magickaRegen)),
      stamina: roundStat(readFloat(bytes, RACE_DATA_FLOAT_OFFSETS.staminaRegen)),
    },
    startingSkills,
  };
}
