import assert from "node:assert/strict";
import {
  collectWorshipAltarKeys,
  deityNameFromAltarKey,
  normalizeAltarKey,
  parseGuideDeityEligibility,
  parseShrineLocations,
  parseWorshipFailMessage,
  buildCanFollowFromInstall,
} from "./deity-eligibility.mjs";

assert.deepEqual(parseWorshipFailMessage(""), { kind: "none", races: [], requirement: "None" });

assert.deepEqual(parseWorshipFailMessage("Azura does not accept those who have not served her."), {
  kind: "served",
  races: [],
  requirement: "Must have served this deity",
});

assert.deepEqual(
  parseWorshipFailMessage("Auriel only accepts those of High Elven, Wood Elven or Breton blood."),
  {
    kind: "race",
    races: ["Altmer", "Bosmer", "Breton"],
    requirement: "Race restricted",
  },
);

assert.deepEqual(
  parseWorshipFailMessage("Akatosh does not accept those who are not of Human blood."),
  { kind: "human", races: [], requirement: "Human blood" },
);

const guideSample = `
## Azura

Can follow Azura: Dunmer / Khajit / Anyone who has completed "The Dark Star"

Racial starting deity for: Dunmer / Khajit

## Julianos

Can follow Julianos: Everyone

Racial starting deity for: Imperial
`;

const guide = parseGuideDeityEligibility(guideSample);
assert.equal(guide.get("azura")?.canFollow, 'Dunmer / Khajit / Anyone who has completed "The Dark Star"');
assert.equal(guide.get("azura")?.starting, "Dunmer / Khajit");
assert.equal(guide.get("julianos")?.canFollow, "All");
assert.equal(guide.get("julianos")?.starting, "Imperial");

const shrineLines = [
  "Can follow Azura: Dunmer / Khajit",
  "Shrine locations:",
  "Raven Rock Temple",
  "Wilderness north of Talking Stone Camp",
  "Temptation: obtain the Star",
  "Can follow Boethiah: Dunmer",
];
assert.deepEqual(parseShrineLocations(shrineLines, 0, shrineLines.length), [
  "Raven Rock Temple",
  "Wilderness north of Talking Stone Camp",
]);

const guideWithShrines = `
Can follow Akatosh: Everyone
Racial starting deity for: Breton / Imperial
Shrine locations:
-North of Frostfruit Inn in Rorikstead
-Skyborn Altar
Can follow Arkay: Everyone
`;
const akatoshGuide = parseGuideDeityEligibility(guideWithShrines);
assert.deepEqual(akatoshGuide.get("akatosh")?.shrineLocations, [
  "North of Frostfruit Inn in Rorikstead",
  "Skyborn Altar",
]);

const azuraFollow = buildCanFollowFromInstall({
  deityId: "azura",
  deityName: "Azura",
  altarKey: "Daedra_Azura",
  failMessages: ["Azura does not accept those who have not served her."],
  deityMeta: { favoredRaces: ["Dunmer", "Khajiit"] },
  startingRaces: ["Dunmer", "Khajiit"],
  questByEdid: new Map([["DA01", "The Black Star"]]),
});
assert.match(azuraFollow.race, /Dunmer/);
assert.match(azuraFollow.race, /Khajiit/);
assert.match(azuraFollow.race, /Anyone who has completed "The Dark Star"/);

const akatoshFollow = buildCanFollowFromInstall({
  deityId: "akatosh",
  deityName: "Akatosh",
  altarKey: "Divine_Akatosh",
  failMessages: ["Akatosh does not accept those who are not of Human blood."],
  deityMeta: null,
  startingRaces: ["Breton", "Imperial", "Khajiit", "Nord"],
  questByEdid: new Map(),
});
assert.equal(akatoshFollow.race, "All");
assert.equal(akatoshFollow.requirement, "None");

assert.equal(normalizeAltarKey("Tribunal_Almalexia_BuffOnly"), "Tribunal_Almalexia");
assert.equal(deityNameFromAltarKey("Tribunal_Almalexia"), "Almalexia");
assert.equal(deityNameFromAltarKey("Tribunal_SothaSil"), "Sotha Sil");
assert.equal(deityNameFromAltarKey("Tribunal_Vivec"), "Vivec");

const worshipKeys = collectWorshipAltarKeys([
  { edid: "WSN_WorshipRequest_Message_Tribunal_Almalexia", description: "" },
  { edid: "WSN_WorshipRequest_Message_Tribunal_Almalexia_Fail", description: "" },
  { edid: "WSN_WorshipRequest_Message_Daedra_Azura", description: "" },
]);
assert.deepEqual([...worshipKeys].sort(), ["Daedra_Azura", "Tribunal_Almalexia"]);

const shrineLinesWithHeaders = [
  "Can follow Riddle'Thar: Khajit",
  "Shrine locations:",
  "Wilderness south of Saarthal",
  "# The Tribunal",
  "## Almalexia",
];
assert.deepEqual(parseShrineLocations(shrineLinesWithHeaders, 0, shrineLinesWithHeaders.length), [
  "Wilderness south of Saarthal",
]);

const mannimarcoShrineLines = [
  "Can follow Mannimarco: Everyone",
  "Shrine locations:",
  "- Wilderness southwest of Witchmist Grove",
  "Sai",
  "Shrine Blessing: 10% Light Armor Rating",
];
assert.deepEqual(parseShrineLocations(mannimarcoShrineLines, 0, 4), [
  "Wilderness southwest of Witchmist Grove",
]);

const oldWaysShrineLines = [
  "Can follow The Old Ways: Breton / Nord",
  "Shrine locations:",
  "- Bromjunaar Sanctuary (in the past)",
  "Page updated",
  "Google Sites",
];
assert.deepEqual(parseShrineLocations(oldWaysShrineLines, 0, oldWaysShrineLines.length), [
  "Bromjunaar Sanctuary (in the past)",
]);

const azuraShrineLines = [
  "Can follow Azura: Dunmer",
  "Shrine locations:",
  "Raven Rock Temple",
  "Wilderness north of Talking Stone Camp",
  "Can follow Boethiah: Dunmer",
];
assert.deepEqual(parseShrineLocations(azuraShrineLines, 0, 4), [
  "Raven Rock Temple",
  "Wilderness north of Talking Stone Camp",
]);

const tribunalGuide = `
# The Tribunal

## Almalexia

Tenets: Be generous to beggars and children.

Shrine Blessing: +15 Health and Stamina

## Sotha Sil

Tenets: Uncover the secrets of Dwemer ruins.

## Vivec

Tenets: Fulfill your destiny by saving Tamriel.

# Other Deities
`;
const tribunalEntries = parseGuideDeityEligibility(tribunalGuide);
assert.equal(tribunalEntries.get("almalexia")?.canFollow, 'Dunmer / Anyone who has completed "Ghosts of the Tribunal"');
assert.equal(tribunalEntries.get("sotha-sil")?.canFollow, 'Dunmer / Anyone who has completed "Ghosts of the Tribunal"');
assert.equal(tribunalEntries.get("vivec")?.canFollow, 'Dunmer / Anyone who has completed "Ghosts of the Tribunal"');

console.log("deity-eligibility tests passed");
