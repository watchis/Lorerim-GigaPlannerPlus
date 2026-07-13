import assert from "node:assert/strict";
import { parseWeaponData, parseWeaponAnimType } from "./weapon-data.mjs";
import {
  parseArmorData,
  parseArmorRating,
  parseBodySlots,
  bodyFlagsToEquipmentSlots,
} from "./armor-data.mjs";
import {
  isReadableDisplayName,
  resolveItemDisplayName,
  shouldKeepGearRecord,
  isStubGearEdid,
} from "./filters.mjs";
import { readKeywordFormIds, readEnchantFormId } from "./record-fields.mjs";

// Iron sword DATA: value 25, weight 9, damage 7
const ironSwordData = Buffer.from("19000000000010410700", "hex");
assert.deepEqual(parseWeaponData(ironSwordData), { value: 25, weight: 9, damage: 7 });
assert.equal(parseWeaponAnimType(Buffer.from("01000000", "hex")), "oneHandSword");

// Iron cuirass
const cuirassData = Buffer.from("7d0000000000f041", "hex");
assert.deepEqual(parseArmorData(cuirassData), { value: 125, weight: 30 });
assert.equal(parseArmorRating(Buffer.from("c4090000", "hex")), 25);
assert.deepEqual(bodyFlagsToEquipmentSlots(0x4), ["body"]);
assert.deepEqual(bodyFlagsToEquipmentSlots(0x1002), ["head"]);
assert.deepEqual(parseBodySlots(Buffer.from("0400000001000000", "hex")), {
  flags: 4,
  armorType: "heavy",
  equipmentSlots: ["body"],
});

assert.equal(isReadableDisplayName("Iron Sword"), true);
assert.equal(isReadableDisplayName(""), false);
assert.equal(isStubGearEdid("REQ_NULL_Weapon"), true);
assert.equal(shouldKeepGearRecord({ edid: "ArmorIronCuirass", name: "" }), true);
assert.equal(shouldKeepGearRecord({ edid: "EnchTest", name: "0whjustfortesting" }), false);
assert.equal(shouldKeepGearRecord({ edid: "EnchOne", name: "1" }), false);
assert.equal(resolveItemDisplayName("", "ArmorIronCuirass"), "Iron Cuirass");

assert.deepEqual(readKeywordFormIds(Buffer.from("d2bb0600e3bb0600", "hex")), [0x06bbd2, 0x06bbe3]);
assert.equal(readEnchantFormId(Buffer.from("12345678", "hex")), 0x78563412);
assert.equal(readEnchantFormId(0), null);

console.log("gear parsers: ok");
