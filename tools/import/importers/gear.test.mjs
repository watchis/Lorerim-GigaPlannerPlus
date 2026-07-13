import assert from "node:assert/strict";
import { transformGearCatalog } from "./gear.mjs";

const catalog = transformGearCatalog({
  weaponRecords: [
    {
      edid: "IronSword",
      name: "Iron Sword",
      plugin: "Skyrim.esm",
      formIdentity: "skyrim.esm|00012eb7",
      value: 25,
      weight: 9,
      damage: 7,
      weaponType: "oneHandSword",
      keywordFormIds: [],
      enchantFormId: null,
    },
    {
      edid: "REQ_NULL_Weapon",
      name: "Null",
      plugin: "Requiem.esp",
      value: 0,
      weight: 0,
      damage: 0,
      weaponType: "oneHandSword",
      keywordFormIds: [],
    },
  ],
  armorRecords: [
    {
      edid: "ArmorIronCuirass",
      name: "Iron Armor",
      plugin: "Skyrim.esm",
      formIdentity: "skyrim.esm|00012e49",
      value: 125,
      weight: 30,
      armorRating: 25,
      armorType: "heavy",
      equipmentSlots: ["body"],
      keywordFormIds: [1],
      enchantFormId: null,
    },
  ],
  enchantRecords: [
    {
      edid: "EnchArmorFortifyHealth",
      name: "Fortify Health",
      plugin: "Skyrim.esm",
      formIdentity: "skyrim.esm|0001234",
      effectEntries: [],
      description: "Increases health.",
    },
  ],
  keywordRecords: [
    {
      edid: "DaedricArtifact",
      formIdentity: "skyrim.esm|1",
      plugin: "Skyrim.esm",
    },
  ],
  mgefIndex: { byIdentity: new Map(), byEdid: new Map() },
  mastersByPath: new Map([["skyrim.esm", []]]),
  plugins: [{ pluginName: "Skyrim.esm", path: "skyrim.esm" }],
});

assert.equal(catalog.weapons.weapons.length, 1);
assert.equal(catalog.armor.armor.length, 1);
assert.equal(catalog.enchantments.enchantments.length, 1);
assert.equal(catalog.armor.armor[0].static, true);
assert.equal(catalog.summary.weapons, 1);

console.log("importers/gear.test.mjs: ok");
