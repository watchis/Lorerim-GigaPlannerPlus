import assert from "node:assert/strict";
import {
  canonicalPerkName,
  collectDisplayedPerkRecords,
  collectTreePerkRecords,
  findTreePerkRecord,
  isNonPlayerPerkRecord,
  isRemovedPlannerPerk,
  isSupplementalTreePerk,
  isTreePerkRecord,
  removeDanglingPrerequisites,
} from "./perk-import-filter.mjs";

assert.equal(canonicalPerkName("Cyromancy"), "cryomancy");
assert.equal(canonicalPerkName("Iron Law"), "iron lore");
assert.equal(canonicalPerkName("Quarterstaff Focus"), "quarterstaff & battlestaff focus");

assert.equal(isRemovedPlannerPerk("Shivering Isles Smithing"), true);
assert.equal(isRemovedPlannerPerk("Blood Magic"), false);

const reqPerk = {
  edid: "REQ_Destruction_BloodMagic_075_ConsumeLife",
  name: "Blood Magic",
  perkMeta: { formIdentity: "req.esp|300" },
};
const traitsPerk = { edid: "Traits_Addict", name: "Addict", perkMeta: {} };
const npcPerk = { edid: "REQ_Block_NPCPackage", name: "NPC Block Training", perkMeta: {} };
const ordProcPerk = { edid: "ORD_One_Proc_Stuff", name: "Ordinator Proc", perkMeta: {} };
const ordPerk = { edid: "ORD_One_Perk_Test", name: "Ordinator Perk", perkMeta: {} };
const boobPerk = { edid: "BOOB_BattleMuse", name: "Battle Muse", perkMeta: {} };

assert.equal(isTreePerkRecord(reqPerk), true);
assert.equal(isTreePerkRecord(traitsPerk), false);
assert.equal(isTreePerkRecord(ordProcPerk), false);
assert.equal(isTreePerkRecord(ordPerk), true);
assert.equal(isNonPlayerPerkRecord(npcPerk), true);
assert.equal(isSupplementalTreePerk(boobPerk), true);
assert.equal(isSupplementalTreePerk({ edid: "Traits_Addict", name: "Addict" }), false);

const treePerks = collectTreePerkRecords([
  reqPerk,
  traitsPerk,
  ordPerk,
  boobPerk,
  { edid: "SomeRandomPerk", name: "Random", perkMeta: {} },
]);
assert.deepEqual(
  treePerks.map((record) => record.edid),
  [reqPerk.edid, ordPerk.edid, boobPerk.edid],
);

const membership = {
  hasAvifData: true,
  allDisplayedIdentities: new Set(["req.esp|300", "skyrim.esm|100"]),
  identitiesBySkill: new Map([["destruction", new Set(["req.esp|300"])]]),
  hasAvifForSkill(skillId) {
    return this.identitiesBySkill.has(skillId);
  },
};

const displayed = collectDisplayedPerkRecords(
  [
    reqPerk,
    { ...reqPerk, edid: "ORD_Des_Dupe", perkMeta: { formIdentity: "ordinator.esp|400" } },
    { ...reqPerk, edid: "REQ_Hidden", perkMeta: { formIdentity: "req.esp|999" } },
    npcPerk,
  ],
  membership,
);
assert.equal(displayed.length, 1);
assert.equal(displayed[0].edid, reqPerk.edid);

const withoutAvif = collectDisplayedPerkRecords([reqPerk, ordPerk], { hasAvifData: false });
assert.equal(withoutAvif.length, 2);

const dupes = [
  { edid: "REQ_Destruction_BloodMagic", name: "Blood Magic", perkMeta: { formIdentity: "req.esp|300" } },
  { edid: "ORD_Des_BloodMagic", name: "Blood Magic", perkMeta: { formIdentity: "ordinator.esp|400" } },
];
assert.equal(
  findTreePerkRecord("Blood Magic", dupes, { skillId: "destruction", membership })?.edid,
  "REQ_Destruction_BloodMagic",
);
assert.equal(findTreePerkRecord("Blood Magic", dupes, { membership })?.edid, "REQ_Destruction_BloodMagic");
assert.equal(findTreePerkRecord("Shivering Isles Smithing", dupes), undefined);

const dangling = removeDanglingPrerequisites([
  { id: "a", prerequisites: ["b", "missing"], prerequisitesAny: ["a", "gone"] },
  { id: "b", prerequisites: ["a"] },
]);
assert.deepEqual(dangling[0].prerequisites, ["b"]);
assert.deepEqual(dangling[0].prerequisitesAny, ["a"]);

console.log("perk-import-filter.test.mjs: ok");
