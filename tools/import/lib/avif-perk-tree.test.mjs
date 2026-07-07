import assert from "node:assert/strict";
import {
  buildIdentityToPerkName,
  finalizeAvifPerkTrees,
} from "./avif-perk-tree.mjs";

const identityToName = buildIdentityToPerkName([
  { name: " Novice Destruction ", perkMeta: { formIdentity: "skyrim.esm|100" } },
  { name: "", perkMeta: { formIdentity: "skyrim.esm|200" } },
  { name: "Apprentice Destruction", perkMeta: { formIdentity: "skyrim.esm|200" } },
  { name: "Blood Magic", perkMeta: { formIdentity: "req.esp|300" } },
]);

assert.deepEqual([...identityToName.entries()], [
  ["skyrim.esm|100", "Novice Destruction"],
  ["skyrim.esm|200", "Apprentice Destruction"],
  ["req.esp|300", "Blood Magic"],
]);

const trees = new Map([
  [
    "destruction",
    {
      skillId: "destruction",
      avifEdid: "AVDestruction",
      sections: [
        { identity: "skyrim.esm|100", inam: 1, cnam: [], x: 0, y: 0 },
        { identity: "skyrim.esm|200", inam: 2, cnam: [1], x: 1, y: 0 },
        { identity: "req.esp|300", inam: 3, cnam: [1, 2], x: 2, y: 0 },
      ],
    },
  ],
]);

const finalized = finalizeAvifPerkTrees(trees, identityToName);
const sections = finalized.get("destruction").sections;

assert.deepEqual(sections[0].prerequisiteNames, ["Apprentice Destruction", "Blood Magic"]);
assert.equal(sections[0].name, "Novice Destruction");
assert.deepEqual(sections[1].childNames, ["Novice Destruction"]);
assert.deepEqual(sections[2].childNames, ["Novice Destruction", "Apprentice Destruction"]);

const untouched = finalizeAvifPerkTrees(
  new Map([
    [
      "speech",
      {
        skillId: "speech",
        sections: [{ identity: "req.esp|999", inam: 9, cnam: [], x: 0, y: 0 }],
      },
    ],
  ]),
  new Map(),
);
assert.equal(untouched.get("speech").sections[0].name, null);
assert.deepEqual(untouched.get("speech").sections[0].prerequisiteNames, []);

console.log("avif-perk-tree.test.mjs: ok");
