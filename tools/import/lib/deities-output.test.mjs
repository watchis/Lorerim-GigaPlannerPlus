import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  extractReferenceBlessingMagnitudes,
  loadBlessingReferenceRows,
  shrineTextContainsMagnitudes,
} from "./deity-blessing-reference.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const deitiesPath = join(__dirname, "..", "..", "..", "data", "game", "deities.json");
const { deities } = JSON.parse(readFileSync(deitiesPath, "utf8"));

const BROKEN_SHRINE_PATTERN = /\bby\s+points\b|\bmag\s+points\b|(?<!\d)\s*%/i;

for (const deity of deities) {
  if (deity.id === "none") continue;
  if (!deity.shrine || deity.shrine === "-") continue;
  assert.ok(
    !BROKEN_SHRINE_PATTERN.test(deity.shrine),
    `${deity.name} shrine has unresolved placeholder: "${deity.shrine}"`,
  );
}

const tribunalIds = ["almalexia", "sotha-sil", "vivec"];
for (const id of tribunalIds) {
  const deity = deities.find((entry) => entry.id === id);
  assert.ok(deity, `missing Tribunal deity: ${id}`);
  assert.match(deity.shrine, /15 points/, `${deity.name} shrine should include 15 points`);
}

const referenceByAltarKey = new Map(
  loadBlessingReferenceRows().map((row) => [row.altarKey, row]),
);
const spotChecks = [
  { id: "hircine", altarKey: "Daedra_Hircine" },
  { id: "arkay", altarKey: "Divine_Arkay" },
];

for (const { id, altarKey } of spotChecks) {
  const deity = deities.find((entry) => entry.id === id);
  const reference = referenceByAltarKey.get(altarKey);
  assert.ok(deity && reference, `missing deity or reference row for ${id}`);
  const expected = extractReferenceBlessingMagnitudes(reference.blessing);
  assert.ok(
    shrineTextContainsMagnitudes(deity.shrine, expected),
    `${id} shrine "${deity.shrine}" should contain ${expected.join(", ")}`,
  );
}

const baanDar = deities.find((entry) => entry.id === "baan-dar");
assert.ok(baanDar, "missing Baan Dar");
assert.match(baanDar.shrine, /25/);
assert.deepEqual(baanDar.shrineLocations, ["Wilderness northeast of the Apprentice Stone"]);

const ebonarm = deities.find((entry) => entry.id === "ebonarm");
assert.ok(ebonarm, "missing Ebonarm");
assert.equal(ebonarm.race, "All", "Ebonarm can be followed by all races per lorerim.com guide");
assert.equal(ebonarm.requirement, "None");
assert.deepEqual(ebonarm.shrineLocations, ["Wilderness north of the Reach Stormcloak Camp"]);

const nocturnal = deities.find((entry) => entry.id === "nocturnal");
assert.ok(nocturnal, "missing Nocturnal");
assert.match(nocturnal.race, /Darkness Returns/i);
assert.doesNotMatch(nocturnal.race, /The Only Cure/i);

const peryite = deities.find((entry) => entry.id === "peryite");
assert.ok(peryite, "missing Peryite");
assert.match(peryite.race, /The Only Cure/i);

assert.ok(deities.length >= 55, `expected at least 55 deities, got ${deities.length}`);

console.log("deities-output tests passed");
