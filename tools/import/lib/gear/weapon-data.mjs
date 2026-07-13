/**
 * Parse Skyrim WEAP DATA (10 bytes) and DNAM anim type.
 * DATA: uint32 value, float weight, int16 damage (+ padding).
 * DNAM byte 0: animation type.
 */

export const WEAPON_ANIM_TYPES = {
  0: "handToHand",
  1: "oneHandSword",
  2: "oneHandDagger",
  3: "oneHandAxe",
  4: "oneHandMace",
  5: "twoHandSword",
  6: "twoHandAxe",
  7: "bow",
  8: "staff",
  9: "crossbow",
};

function asBuffer(value) {
  if (!value) return null;
  if (Buffer.isBuffer(value)) return value;
  if (Array.isArray(value)) return Buffer.from(value);
  return null;
}

export function parseWeaponData(dataValue) {
  const buf = asBuffer(dataValue);
  if (!buf || buf.length < 10) {
    return { value: 0, weight: 0, damage: 0 };
  }

  return {
    value: buf.readUInt32LE(0),
    weight: Number(buf.readFloatLE(4).toFixed(2)),
    damage: buf.readInt16LE(8),
  };
}

export function parseWeaponAnimType(dnamValue) {
  const buf = asBuffer(dnamValue);
  if (!buf || buf.length < 1) return null;
  const code = buf.readUInt8(0);
  return WEAPON_ANIM_TYPES[code] ?? `unknown-${code}`;
}

export function weaponTypeToSlot(weaponType) {
  if (!weaponType) return "weaponMain";
  if (weaponType === "bow" || weaponType === "crossbow" || weaponType === "staff") {
    return "weaponMain";
  }
  if (weaponType.startsWith("twoHand")) return "weaponMain";
  return "weaponMain";
}
