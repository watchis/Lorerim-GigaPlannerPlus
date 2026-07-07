import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "os";
import { join } from "path";
import { buildRaceDataBuffer } from "./test-fixtures.mjs";
import {
  altarKeyFromSpellEdid,
  blessingIdFromName,
  blessingNameFromSpell,
  buildAltarBlessingSpellIndex,
  buildBirthsignMesgLookup,
  buildDarDisplayNames,
  buildDestinyTreeFromConfig,
  buildFallbackDestinyTree,
  buildRaceAbilityLookup,
  buildRaceEffectsFromRaces,
  collectDarPerkRecords,
  collectRaceBonuses,
  darPerkSuffixName,
  destinyPerkId,
  mergeRaceBonuses,
  normalizeDestinyGrid,
  parseBirthsignBody,
  parseBirthsignMesg,
  parseBlessingRequirement,
  parseRaceData,
  resolveTraitText,
} from "./lorerim-content-parse.mjs";
import { transformRaceRecords, transformStandingStoneRecords } from "./lorerim-transform.mjs";

assert.equal(darPerkSuffixName("DAR_Perk12ShadowWarrior"), "Shadow Warrior");

const darPerks = collectDarPerkRecords([
  { edid: "DAR_Perk20Second", name: "Second" },
  { edid: "DAR_Perk05First", name: "" },
  { edid: "REQ_NotDestiny", name: "Ignored" },
]);
assert.deepEqual(
  darPerks.map((record) => record.edid),
  ["DAR_Perk05First", "DAR_Perk20Second"],
);
assert.deepEqual(buildDarDisplayNames(darPerks), ["First", "Second"]);

const duplicateNames = buildDarDisplayNames([
  { edid: "DAR_Perk01DuplicateName", name: "Shared Name" },
  { edid: "DAR_Perk02SharedName", name: "Shared Name" },
]);
assert.equal(duplicateNames[0], "Shared Name");
assert.equal(duplicateNames[1], "Shared Name");

const fallbackTree = buildFallbackDestinyTree(
  [
    {
      edid: "DAR_Perk01Test",
      name: "Test Destiny",
      description: "Gain +10% movement speed.",
    },
  ],
  { perks: [], grid: { width: 1, height: 1 } },
);
assert.equal(fallbackTree.perks[0].id, destinyPerkId(1));
assert.equal(fallbackTree.perks[0].name, "Test Destiny");
assert.ok(fallbackTree.perks[0].effects.length > 0);
assert.deepEqual(fallbackTree.grid, { width: 1, height: 1 });

const configTree = buildDestinyTreeFromConfig(
  [
    { edid: "DAR_Perk01Root", name: "Root", description: "" },
    { edid: "DAR_Perk02Child", name: "Child", description: "Deal 10% more damage." },
  ],
  [
    { index: 1, enabled: true, x: 0, y: 0, links: [2] },
    { index: 2, enabled: true, x: 2, y: 1, links: [] },
    { index: 99, enabled: true, x: 9, y: 9, links: [] },
  ],
  { perks: [], grid: { width: 1, height: 1 } },
);
assert.equal(configTree.perks.length, 2);
assert.deepEqual(configTree.perks[0].prerequisitesAny, []);
assert.deepEqual(configTree.perks[1].prerequisitesAny, [configTree.perks[0].id]);
const normalized = normalizeDestinyGrid([
  { id: "a", position: { x: 5, y: 3 } },
  { id: "b", position: { x: 7, y: 4 } },
]);
assert.deepEqual(normalized.perks[0].position, { x: 0, y: 0 });
assert.deepEqual(normalized.perks[1].position, { x: 2, y: 1 });
assert.deepEqual(normalized.grid, { width: 3, height: 2 });

assert.deepEqual(
  resolveTraitText({
    name: "Pack Rat",
    description:
      "You love carrying stuff around. Gain +200 carryweight. Selling prices are 50% worse.",
  }),
  {
    id: "pack-rat",
    name: "Pack Rat",
    description: "You love carrying stuff around.",
    bonus: "Gain +200 carryweight. Selling prices are 50% worse.",
  },
);

const abilityLookup = buildRaceAbilityLookup([
  {
    edid: "REQ_Ability_Race_Bosmer_EyeOfTheHunt",
    name: "Eye of the Hunt",
    description: "Armor penetration with ranged weapons is increased by 5.",
  },
  {
    edid: "REQ_Ability_Race_Bosmer_EyeOfTheHunt_Buff",
    name: "Buff",
    description: "ignored",
  },
  { edid: "REQ_Ability_Race_All_StrongStomach", name: "Strong Stomach", description: "" },
  { edid: "REQ_Ability_Race_Khajiit_All_Claws", name: "Claws", description: "Extra damage." },
  { edid: "REQ_Ability_Race_Khajiit_All_Claws", name: "Claws", description: "Wrong segment" },
]);

const bosmerBonuses = collectRaceBonuses("WoodElfRace", abilityLookup);
assert.equal(bosmerBonuses.length, 2);
assert.ok(bosmerBonuses.some((bonus) => bonus.startsWith("Eye of the Hunt:")));
assert.ok(bosmerBonuses.some((bonus) => bonus.startsWith("Strong Stomach")));

const khajiitBonuses = collectRaceBonuses("KhajiitRace", abilityLookup);
assert.ok(khajiitBonuses.some((bonus) => bonus.startsWith("Strong Stomach")));
assert.ok(khajiitBonuses.some((bonus) => bonus.startsWith("Claws:")));

assert.deepEqual(
  mergeRaceBonuses(["New Bonus: effect"], ["Old Bonus: effect", "New Bonus: old duplicate"]),
  ["New Bonus: effect", "Old Bonus: effect"],
);

const raceData = parseRaceData(
  buildRaceDataBuffer({
    skillPairs: [{ actorValue: 8, level: 20 }],
    health: 90,
    magicka: 100,
    stamina: 90,
  }),
);
assert.equal(raceData.startingSkills.marksman, 20);

const raceEffects = buildRaceEffectsFromRaces([
  { id: "none", bonuses: ["ignored"] },
  {
    id: "bosmer",
    bonuses: [
      "Eye of the Hunt: Armor penetration with ranged weapons is increased by 5.",
    ],
  },
]);
assert.equal(raceEffects.none, undefined);
assert.ok(raceEffects.bosmer.length > 0);

assert.deepEqual(parseBirthsignBody("Born under the Lord. Health increased by 50 points."), {
  description: "Born under the Lord.",
  bonus: "Health increased by 50 points.",
});
assert.deepEqual(parseBirthsignBody("Flavor only."), {
  description: "Flavor only.",
  bonus: "",
});

assert.deepEqual(
  parseBirthsignMesg("The Thief\n\nThose born under the sign of the Thief gain 10% pickpocket bonus."),
  {
    group: "The Thief",
    description: "Those born under the sign of the Thief gain 10% pickpocket bonus.",
    bonus: "",
  },
);

const mesgLookup = buildBirthsignMesgLookup([
  { edid: "doomWarriorMSG", description: "The Warrior" },
  { edid: "doomAlreadyHaveMSG", description: "skip" },
  { edid: "doomWarriorRemovedMSG", description: "skip" },
]);
assert.equal(mesgLookup.get("Warrior")?.description, "The Warrior");

assert.equal(
  parseBlessingRequirement("Auriel only accepts those of High Elven or Breton blood.").race,
  "High Elven / Breton",
);
assert.equal(
  parseBlessingRequirement("Azura does not accept those who have not served her.").requirement,
  "Must have served this deity",
);

const altarIndex = buildAltarBlessingSpellIndex([
  { edid: "WSN_AltarBlessing_Daedra_Hircine_Spell", name: "Blessing of Hircine" },
  { edid: "WSN_AltarBlessing_Daedra_Hircine_Gift_Spell", name: "Variant" },
  { edid: "WSN_AltarBlessing_Daedra_Hircine_BuffOnly_Spell", name: "Buff Only" },
  { edid: "WSN_AltarBlessing_Daedra_Malacath_Gift_Spell", name: "Gift only" },
]);
assert.equal(
  altarIndex.get("Daedra_Hircine")?.edid,
  "WSN_AltarBlessing_Daedra_Hircine_Spell",
);
assert.equal(altarKeyFromSpellEdid("WSN_AltarBlessing_Tribunal_Vivec_Spell"), "Tribunal_Vivec");
assert.equal(blessingNameFromSpell("Blessing of Azura", ""), "Azura");
assert.equal(blessingIdFromName("Blessing of Azura", ""), "azura");

const tempDir = mkdtempSync(join(tmpdir(), "content-parse-"));
const racesPath = join(tempDir, "races.json");
writeFileSync(
  racesPath,
  JSON.stringify({
    races: [
      { id: "none", name: "None" },
      {
        id: "bosmer",
        name: "Bosmer",
        description: "Old description",
        bonuses: ["Legacy Bonus: kept when import empty"],
        startingSkills: { destiny: 2, traits: 1 },
      },
    ],
  }),
);

const transformedRaces = transformRaceRecords(
  [
    {
      edid: "WoodElfRace",
      name: "Wood Elf",
      description: "Forest dwellers. Berserk rage should not appear for orcs only.",
      data: buildRaceDataBuffer({ skillPairs: [{ actorValue: 8, level: 15 }] }),
    },
  ],
  [],
  racesPath,
);
const bosmer = transformedRaces.races.races.find((race) => race.id === "bosmer");
assert.equal(bosmer.startingSkills.marksman, 15);
assert.equal(bosmer.startingSkills.destiny, 2);
assert.ok(bosmer.bonuses.includes("Legacy Bonus: kept when import empty"));

const birthsignsPath = join(tempDir, "birthsigns.json");
writeFileSync(
  birthsignsPath,
  JSON.stringify({ birthsigns: [{ id: "none", name: "None" }] }),
);
const birthsigns = transformStandingStoneRecords(
  [
    {
      edid: "REQ_Ability_Birthsign_Warrior",
      description: "The Warrior stands tall. Health increased by 50 points.",
    },
  ],
  [{ edid: "doomWarriorMSG", description: "The Warrior\n\nHealth increased by 50 points." }],
  birthsignsPath,
);
const warrior = birthsigns.birthsigns.find((stone) => stone.id === "warrior");
assert.equal(warrior.group, "The Warrior");
assert.ok(warrior.bonus.includes("50"));
assert.ok(warrior.effects.length > 0);

console.log("lorerim-content-parse.test.mjs: ok");
