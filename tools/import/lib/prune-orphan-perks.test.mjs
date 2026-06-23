import assert from "node:assert/strict";
import { isAnchoredPerk, pruneOrphanPerks, pruneAllPerkTrees } from "./prune-orphan-perks.mjs";

const tree = {
  skillId: "destruction",
  grid: { width: 5, height: 5 },
  perks: [
    {
      id: "destruction-novice-destruction",
      name: "Novice Destruction",
      skillReq: 0,
      position: { x: 0, y: 0 },
      prerequisites: [],
    },
    {
      id: "destruction-blood-magic",
      name: "Blood Magic",
      skillReq: 25,
      position: { x: 1, y: 1 },
      prerequisites: ["destruction-novice-destruction"],
    },
    {
      id: "destruction-floating-stub",
      name: "Floating Stub",
      skillReq: 0,
      position: { x: 4, y: 4 },
      prerequisites: [],
    },
  ],
};

const referenced = new Set(["destruction-novice-destruction"]);
assert.equal(isAnchoredPerk(tree.perks[0], referenced), true);
assert.equal(isAnchoredPerk(tree.perks[2], referenced), false);

const pruned = pruneOrphanPerks(tree.perks);
assert.equal(pruned.length, 2);
assert.ok(pruned.some((perk) => perk.id === "destruction-novice-destruction"));

const trees = { "destruction.json": structuredClone(tree) };
const removed = pruneAllPerkTrees(trees);
assert.equal(removed.length, 1);
assert.equal(removed[0].count, 1);
assert.equal(trees["destruction.json"].perks.length, 2);

const avifAnchoredTree = {
  skillId: "alchemy",
  grid: { width: 5, height: 5 },
  perks: [
    {
      id: "alchemy-gourmet",
      name: "Gourmet",
      skillReq: 0,
      position: { x: 0, y: 0 },
      prerequisites: [],
    },
    {
      id: "alchemy-floating-stub",
      name: "Floating Stub",
      skillReq: 0,
      position: { x: 4, y: 4 },
      prerequisites: [],
    },
  ],
};
const avifMembership = {
  namesBySkill: new Map([["alchemy", new Set(["gourmet"])]]),
};
const avifTrees = { "alchemy.json": avifAnchoredTree };
const avifRemoved = pruneAllPerkTrees(avifTrees, { membership: avifMembership });
assert.equal(avifRemoved.length, 1);
assert.equal(avifTrees["alchemy.json"].perks.length, 1);
assert.equal(avifTrees["alchemy.json"].perks[0].id, "alchemy-gourmet");

console.log("prune-orphan-perks.test.mjs: ok");
