/**
 * Parse Skyrim ARMO DATA / DNAM / BOD2.
 * DATA: uint32 value, float weight
 * DNAM: uint32 armorRating (vanilla display = value / 100)
 * BOD2: uint32 firstPersonFlags, uint32 armorType (0 light, 1 heavy, 2 clothing)
 */

export const BODY_SLOT_FLAGS = {
  head: 0x1,
  hair: 0x2,
  body: 0x4,
  hands: 0x8,
  forearms: 0x10,
  amulet: 0x20,
  ring: 0x40,
  feet: 0x80,
  calves: 0x100,
  shield: 0x200,
  circlet: 0x1000,
};

const ARMOR_TYPES = {
  0: "light",
  1: "heavy",
  2: "clothing",
};

function asBuffer(value) {
  if (!value) return null;
  if (Buffer.isBuffer(value)) return value;
  if (Array.isArray(value)) return Buffer.from(value);
  return null;
}

export function parseArmorData(dataValue) {
  const buf = asBuffer(dataValue);
  if (!buf || buf.length < 8) {
    return { value: 0, weight: 0 };
  }

  return {
    value: buf.readUInt32LE(0),
    weight: Number(buf.readFloatLE(4).toFixed(2)),
  };
}

export function parseArmorRating(dnamValue) {
  const buf = asBuffer(dnamValue);
  if (!buf || buf.length < 4) return 0;
  return Number((buf.readUInt32LE(0) / 100).toFixed(2));
}

export function parseBodySlots(bod2Value) {
  const buf = asBuffer(bod2Value);
  if (!buf || buf.length < 8) {
    return { flags: 0, armorType: "clothing", equipmentSlots: [] };
  }

  const flags = buf.readUInt32LE(0);
  const armorTypeCode = buf.readUInt32LE(4);
  const armorType = ARMOR_TYPES[armorTypeCode] ?? "clothing";
  const equipmentSlots = bodyFlagsToEquipmentSlots(flags);

  return { flags, armorType, equipmentSlots };
}

/**
 * Map BOD2 first-person flags to planner equipment slot ids.
 * Helmets often use hair/circlet bits without the head bit.
 */
export function bodyFlagsToEquipmentSlots(flags) {
  const slots = [];

  if (flags & BODY_SLOT_FLAGS.amulet) slots.push("amulet");
  if (flags & BODY_SLOT_FLAGS.ring) slots.push("ring");
  if (flags & BODY_SLOT_FLAGS.shield) slots.push("weaponOff");
  if (flags & (BODY_SLOT_FLAGS.head | BODY_SLOT_FLAGS.hair | BODY_SLOT_FLAGS.circlet)) {
    slots.push("head");
  }
  if (flags & BODY_SLOT_FLAGS.body) slots.push("body");
  if (flags & (BODY_SLOT_FLAGS.hands | BODY_SLOT_FLAGS.forearms)) slots.push("hands");
  if (flags & (BODY_SLOT_FLAGS.feet | BODY_SLOT_FLAGS.calves)) slots.push("feet");

  return [...new Set(slots)];
}

export function primaryArmorSlot(equipmentSlots) {
  const order = ["body", "head", "hands", "feet", "amulet", "ring", "weaponOff"];
  for (const slot of order) {
    if (equipmentSlots.includes(slot)) return slot;
  }
  return equipmentSlots[0] ?? "body";
}
