import assert from "node:assert/strict";
import {
  applyPerkMetadata,
  buildPerkMetadataIndex,
  filterSpuriousPrerequisites,
  perkMetadataKey,
  resolvePrerequisiteId,
} from "./perk-tree-metadata.mjs";

const tree = {
  skillId: "destruction",
  perks: [
    { id: "destruction-blood-magic", name: "Blood Magic", skillReq: 25, position: { x: 2, y: 36 } },
    { id: "destruction-blood-magic-2", name: "Blood Magic", skillReq: 50, position: { x: 2, y: 36 } },
    {
      id: "destruction-consume-life",
      name: "Consume Life",
      skillReq: 75,
      position: { x: 2, y: 30 },
      prerequisites: ["destruction-blood-magic"],
    },
  ],
};

assert.equal(
  resolvePrerequisiteId(tree, "Blood Magic", 75),
  "destruction-blood-magic",
);

const metadataIndex = new Map([
  [
    perkMetadataKey("destruction", "Blood Glutton"),
    {
      skillReq: 100,
      prerequisiteNames: ["Consume Life"],
      position: { x: 5, y: 3 },
    },
  ],
]);

const enriched = applyPerkMetadata(
  {
    id: "destruction-blood-glutton",
    name: "Blood Glutton",
    skillReq: 0,
    position: { x: 0, y: 33 },
    prerequisites: [],
  },
  tree,
  metadataIndex,
);

assert.equal(enriched.skillReq, 100);
assert.deepEqual(enriched.prerequisites, ["destruction-consume-life"]);
assert.deepEqual(enriched.position, { x: 2, y: 24 });

const multiParentTree = {
  skillId: "smithing",
  perks: [
    { id: "smithing-a", name: "Advanced Light Armors", skillReq: 30, position: { x: 0, y: 0 } },
    { id: "smithing-b", name: "Dwarven Smithing", skillReq: 30, position: { x: 1, y: 0 } },
    {
      id: "smithing-c",
      name: "Orcish Smithing",
      skillReq: 50,
      position: { x: 2, y: 0 },
      prerequisites: [],
      prerequisitesAny: [],
    },
  ],
};

const multiParentMetadata = new Map([
  [
    perkMetadataKey("smithing", "Orcish Smithing"),
    {
      skillReq: 50,
      prerequisiteNames: ["Advanced Light Armors", "Dwarven Smithing"],
      position: null,
    },
  ],
]);

const orPrereqs = applyPerkMetadata(
  multiParentTree.perks[2],
  multiParentTree,
  multiParentMetadata,
);
assert.deepEqual(orPrereqs.prerequisites, []);
assert.deepEqual(orPrereqs.prerequisitesAny, ["smithing-a", "smithing-b"]);

const restorationTree = {
  skillId: "restoration",
  perks: [
    { id: "restoration-novice", name: "Novice Restoration", skillReq: 0, position: { x: 0, y: 0 } },
    {
      id: "restoration-apprentice",
      name: "Apprentice Restoration",
      skillReq: 25,
      position: { x: 1, y: 0 },
      prerequisites: [],
      prerequisitesAny: [],
    },
    {
      id: "restoration-mental-acuity",
      name: "Mental Acuity",
      skillReq: 25,
      position: { x: 2, y: 0 },
      prerequisites: [],
      prerequisitesAny: [],
    },
  ],
};

assert.deepEqual(
  filterSpuriousPrerequisites(restorationTree, 25, [
    "Novice Restoration",
    "Mental Acuity",
  ]),
  ["Novice Restoration"],
);

assert.deepEqual(
  filterSpuriousPrerequisites(restorationTree, 25, ["Apprentice Restoration"]),
  ["Apprentice Restoration"],
  "same-tier single prerequisite is kept for branch perks like Mental Acuity",
);

const restorationIndex = buildPerkMetadataIndex(
  [
    {
      name: "Novice Restoration",
      perkMeta: {
        formIdentity: "req|novice",
        skillReq: 0,
        prerequisiteIdentities: [],
      },
    },
    {
      name: "Apprentice Restoration",
      perkMeta: {
        formIdentity: "req|apprentice",
        skillReq: 25,
        prerequisiteIdentities: ["req|novice"],
      },
    },
    {
      name: "Mental Acuity",
      perkMeta: {
        formIdentity: "req|mental",
        skillReq: 25,
        prerequisiteIdentities: ["req|apprentice"],
      },
    },
  ],
  new Map([
    [
      "restoration",
      {
        sections: [
          { identity: "req|novice", inam: 1, cnam: [2] },
          { identity: "req|apprentice", inam: 2, cnam: [3] },
          { identity: "req|mental", inam: 3, cnam: [2] },
        ],
      },
    ],
  ]),
  {
    skillByIdentity: new Map([
      ["req|novice", "restoration"],
      ["req|apprentice", "restoration"],
      ["req|mental", "restoration"],
    ]),
  },
);

assert.deepEqual(
  restorationIndex.get(perkMetadataKey("restoration", "Apprentice Restoration"))
    ?.prerequisiteNames,
  ["Novice Restoration"],
);

const apprenticeFromPlugins = applyPerkMetadata(
  restorationTree.perks[1],
  restorationTree,
  restorationIndex,
);
assert.deepEqual(apprenticeFromPlugins.prerequisites, ["restoration-novice"]);
assert.deepEqual(apprenticeFromPlugins.prerequisitesAny, []);

const fromRecords = buildPerkMetadataIndex(
  [
    {
      name: "Blood Glutton",
      perkMeta: {
        formIdentity: "skyrim.esm|ab8",
        skillReq: 100,
        prerequisiteIdentities: ["skyrim.esm|5c68"],
      },
    },
    {
      name: "Consume Life",
      perkMeta: {
        formIdentity: "skyrim.esm|5c68",
        skillReq: 75,
        prerequisiteIdentities: [],
      },
    },
  ],
  new Map([
    [
      "destruction",
      {
        sections: [
          {
            identity: "skyrim.esm|ab8",
            name: "Blood Glutton",
            inam: 26,
            cnam: [],
            prerequisiteNames: ["Consume Life"],
            x: 5,
            y: 3,
          },
        ],
      },
    ],
  ]),
  {
    skillByIdentity: new Map([
      ["skyrim.esm|ab8", "destruction"],
      ["skyrim.esm|5c68", "destruction"],
    ]),
  },
);

assert.equal(fromRecords.get(perkMetadataKey("destruction", "Blood Glutton"))?.skillReq, 100);
assert.deepEqual(
  fromRecords.get(perkMetadataKey("destruction", "Blood Glutton"))?.prerequisiteNames,
  ["Consume Life"],
);

// Self-referential prerequisites (e.g. a higher rank's GetIsID on its own lower rank) are dropped.
const selfRefTree = {
  skillId: "sneak",
  perks: [{ id: "sneak-stealth", name: "Stealth", skillReq: 0, position: { x: 4, y: 33 } }],
};
const selfRefMetadata = new Map([
  [perkMetadataKey("sneak", "Stealth"), { skillReq: 0, prerequisiteNames: ["Stealth"], position: null }],
]);
const stealth = applyPerkMetadata(selfRefTree.perks[0], selfRefTree, selfRefMetadata);
assert.deepEqual(stealth.prerequisites ?? [], []);

console.log("perk-tree-metadata.test.mjs: ok");
