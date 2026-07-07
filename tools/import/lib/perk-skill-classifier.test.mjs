import assert from "node:assert/strict";
import { classifyPerkTreeSkill, isAllocatablePerkSkill } from "./perk-skill-classifier.mjs";

function skillFor(edid) {
  return classifyPerkTreeSkill({ edid });
}

assert.equal(skillFor("REQ_Destruction_BloodMagic_075_ConsumeLife"), "destruction");
assert.equal(skillFor("REQ_HeavyArmor_Juggernaut"), "heavy-armor");
assert.equal(skillFor("REQ_OneHanded_Expert"), "one-handed");
assert.equal(skillFor("REQ_WeaponsMaster1_Crit"), "block");
assert.equal(skillFor("ORD_Des_BloodMagic"), "destruction");
assert.equal(skillFor("ORD_One_Perk_Test"), "one-handed");
assert.equal(skillFor("Feat_Perk_Skill_Block_Test"), "block");
assert.equal(skillFor("Feat_Perk_Char_Block_Test"), "block");
assert.equal(skillFor("FURY_Perk_Test"), "wayfarer");
assert.equal(skillFor("FURY_Perk_Racial_Orc"), null);
assert.equal(skillFor("BBWayfarerTravel"), "wayfarer");
assert.equal(skillFor("LoreRimTrapper_Trap"), "finesse");
assert.equal(skillFor("BOOB_BattleMuse"), "speech");
assert.equal(skillFor("Req_Pickpocket_Test"), "finesse");
assert.equal(skillFor("RandomPerk"), null);

assert.equal(isAllocatablePerkSkill("destruction"), true);
assert.equal(isAllocatablePerkSkill("destiny"), false);
assert.equal(isAllocatablePerkSkill("traits"), false);
assert.equal(isAllocatablePerkSkill("not-a-skill"), false);

console.log("perk-skill-classifier.test.mjs: ok");
