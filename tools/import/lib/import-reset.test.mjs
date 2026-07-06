import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  applyPerkGraphSnapshots,
  applyPerkHandTunedOverrides,
  applyPerkLayoutOverrides,
  applySmithingBookPerkCosts,
  createEmptyPerkTrees,
  isSmithingBookUnlockedPerk,
  loadPerkGraphSnapshots,
  loadPerkHandTunedOverrides,
  loadPerkLayoutOverrides,
  mergePerkPlayerLevelReqs,
  perkGraphKey,
  removeStalePerkFiles,
} from "./import-reset.mjs";

const { trees, indexEntries } = createEmptyPerkTrees();
assert.equal(Object.keys(trees).length, 19);
assert.equal(indexEntries.destruction, "destruction.json");
assert.deepEqual(trees["destruction.json"].perks, []);

const perksDir = mkdtempSync(join(tmpdir(), "giga-import-reset-"));
writeFileSync(
  join(perksDir, "smithing.json"),
  JSON.stringify({
    skillId: "smithing",
    perks: [
      { id: "smithing-a", name: "Basic Smithing", costsPerkPoint: false },
      { id: "smithing-b", name: "Advanced Smithing", costsPerkPoint: true },
    ],
  }),
);

const overrides = loadPerkHandTunedOverrides(perksDir);
assert.equal(overrides.size, 1);
assert.equal(overrides.get("basic smithing")?.costsPerkPoint, false);

const targetTrees = {
  "smithing.json": {
    perks: [
      { id: "smithing-a", name: "Basic Smithing" },
      { id: "smithing-b", name: "Advanced Smithing" },
    ],
  },
};
applyPerkHandTunedOverrides(targetTrees, overrides);
assert.equal(targetTrees["smithing.json"].perks[0].costsPerkPoint, false);
assert.equal(targetTrees["smithing.json"].perks[1].costsPerkPoint, undefined);

assert.equal(
  isSmithingBookUnlockedPerk(
    "You've read The Armorer's Encyclopedia and know how to properly use all kinds of tools.",
  ),
  true,
);
assert.equal(
  isSmithingBookUnlockedPerk(
    "After studying Arcane Craftsmanship, you've learned the necessary techniques.",
  ),
  true,
);
assert.equal(
  isSmithingBookUnlockedPerk("since you studied The Compendium of Dragonic Armor."),
  true,
);
assert.equal(
  isSmithingBookUnlockedPerk(
    "You've gained quite some finesse, allowing you to craft plate armor and fine jewelry.",
  ),
  false,
);

const smithingTrees = {
  "smithing.json": {
    perks: [
      {
        id: "smithing-craftsmanship",
        name: "Craftsmanship",
        description: "You've read The Armorer's Encyclopedia.",
      },
      {
        id: "smithing-advanced-blacksmithing",
        name: "Advanced Blacksmithing",
        description: "You've gained quite some finesse, allowing you to craft plate armor.",
      },
    ],
  },
};
applySmithingBookPerkCosts(smithingTrees);
assert.equal(smithingTrees["smithing.json"].perks[0].costsPerkPoint, false);
assert.equal(smithingTrees["smithing.json"].perks[1].costsPerkPoint, undefined);

writeFileSync(
  join(perksDir, "block.json"),
  JSON.stringify({
    skillId: "block",
    grid: { width: 40, height: 35 },
    perks: [
      { id: "block-a", name: "Shield Wall", position: { x: 12, y: 18 } },
      { id: "block-b", name: "Shield Wall", position: { x: 12, y: 18 } },
      { id: "block-c", name: "Improved Blocking", position: { x: 8, y: 22 } },
    ],
  }),
);

const layoutOverrides = loadPerkLayoutOverrides(perksDir);
assert.ok(layoutOverrides.positionsBySkill.get("block")?.has("shield wall"));
assert.deepEqual(layoutOverrides.grids.get("block"), { width: 40, height: 35 });

const layoutTrees = {
  "block.json": {
    skillId: "block",
    grid: { width: 10, height: 10 },
    perks: [
      { id: "block-a", name: "Shield Wall", position: { x: 0, y: 0 } },
      { id: "block-b", name: "Shield Wall", position: { x: 1, y: 1 } },
      { id: "block-c", name: "Improved Blocking", position: { x: 2, y: 2 } },
      { id: "block-d", name: "New Perk", position: { x: 3, y: 3 } },
    ],
  },
};
applyPerkLayoutOverrides(layoutTrees, layoutOverrides);
const blockPerks = layoutTrees["block.json"].perks;
assert.deepEqual(blockPerks[0].position, { x: 12, y: 18 });
assert.deepEqual(blockPerks[1].position, { x: 12, y: 18 }, "stack ranks share saved cell");
assert.deepEqual(blockPerks[2].position, { x: 8, y: 22 });
assert.deepEqual(blockPerks[3].position, { x: 3, y: 3 }, "unsaved perks keep computed layout");
assert.ok(layoutTrees["block.json"].grid.width >= 40);

writeFileSync(
  join(perksDir, "destiny.json"),
  JSON.stringify({
    skillId: "destiny",
    grid: { width: 43, height: 19 },
    perks: [
      { id: "destiny-01", name: "Destiny", position: { x: 21, y: 18 } },
      { id: "destiny-02", name: "Focus", position: { x: 15, y: 15 } },
    ],
  }),
);

const destinyLayoutOverrides = loadPerkLayoutOverrides(perksDir);
assert.ok(destinyLayoutOverrides.positionsBySkill.get("destiny")?.has("destiny"));
assert.deepEqual(destinyLayoutOverrides.grids.get("destiny"), { width: 43, height: 19 });

const destinyTrees = {
  "destiny.json": {
    skillId: "destiny",
    grid: { width: 10, height: 10 },
    perks: [
      { id: "destiny-01", name: "Destiny", position: { x: 0, y: 0 } },
      { id: "destiny-02", name: "Focus", position: { x: 1, y: 1 } },
    ],
  },
};
applyPerkLayoutOverrides(destinyTrees, destinyLayoutOverrides);
assert.deepEqual(destinyTrees["destiny.json"].perks[0].position, { x: 21, y: 18 });
assert.deepEqual(destinyTrees["destiny.json"].perks[1].position, { x: 15, y: 15 });
assert.ok(destinyTrees["destiny.json"].grid.width >= 43);

writeFileSync(
  join(perksDir, "smithing.json"),
  JSON.stringify({
    skillId: "smithing",
    perks: [
      {
        id: "smithing-orcish-smithing",
        name: "Orcish Smithing",
        skillReq: 50,
        position: { x: 0, y: 0 },
        prerequisites: [],
        prerequisitesAny: ["smithing-light", "smithing-dwarven"],
      },
      {
        id: "smithing-light",
        name: "Advanced Light Armors",
        skillReq: 30,
        position: { x: 1, y: 0 },
        prerequisites: [],
        prerequisitesAny: [],
      },
      {
        id: "smithing-dwarven",
        name: "Dwarven Smithing",
        skillReq: 30,
        position: { x: 2, y: 0 },
        prerequisites: [],
        prerequisitesAny: [],
      },
    ],
  }),
);

const graphSnapshots = loadPerkGraphSnapshots(perksDir);
const graphTrees = {
  "smithing.json": {
    skillId: "smithing",
    perks: [
      {
        id: "smithing-generated-orcish",
        name: "Orcish Smithing",
        skillReq: 50,
        position: { x: 0, y: 0 },
        prerequisites: ["smithing-generated-light", "smithing-generated-dwarven"],
        prerequisitesAny: [],
      },
      {
        id: "smithing-generated-light",
        name: "Advanced Light Armors",
        skillReq: 30,
        position: { x: 1, y: 0 },
        prerequisites: [],
        prerequisitesAny: [],
      },
      {
        id: "smithing-generated-dwarven",
        name: "Dwarven Smithing",
        skillReq: 30,
        position: { x: 2, y: 0 },
        prerequisites: [],
        prerequisitesAny: [],
      },
    ],
  },
};
applyPerkGraphSnapshots(graphTrees, graphSnapshots);
const orcish = graphTrees["smithing.json"].perks[0];
assert.equal(orcish.id, "smithing-orcish-smithing");
assert.deepEqual(orcish.prerequisites, []);
assert.deepEqual(orcish.prerequisitesAny, ["smithing-light", "smithing-dwarven"]);

mkdirSync(join(perksDir, "nested"), { recursive: true });
writeFileSync(join(perksDir, "orphan.json"), "{}");
writeFileSync(join(perksDir, "smithing.json"), readFileSync(join(perksDir, "smithing.json")));

const removed = removeStalePerkFiles(perksDir, ["smithing.json", "block.json", "destiny.json"]);
assert.deepEqual(removed, ["orphan.json"]);
assert.ok(!existsSync(join(perksDir, "orphan.json")));

assert.equal(perkGraphKey({ id: "alchemy-herbalist", name: "Herbalist", skillReq: 0 }), "herbalist:s0");
assert.equal(
  perkGraphKey({ id: "alchemy-herbalist-r2", name: "Herbalist", skillReq: 0 }),
  "herbalist:r2",
);
assert.notEqual(
  perkGraphKey({ id: "alchemy-herbalist", name: "Herbalist", skillReq: 0 }),
  perkGraphKey({ id: "alchemy-herbalist-r2", name: "Herbalist", skillReq: 0 }),
);

assert.deepEqual(
  mergePerkPlayerLevelReqs(
    {
      "alchemy.json": {
        perks: [
          { id: "alchemy-herbalist", name: "Herbalist", skillReq: 0 },
          { id: "alchemy-herbalist-r2", name: "Herbalist", skillReq: 0 },
        ],
      },
    },
    { "alchemy-herbalist": 10 },
    new Map([["herbalist:s0", 10], ["herbalist:r2", 20]]),
  ),
  {
    "alchemy-herbalist": 10,
    "alchemy-herbalist-r2": 20,
  },
);

console.log("import-reset.test.mjs: ok");
