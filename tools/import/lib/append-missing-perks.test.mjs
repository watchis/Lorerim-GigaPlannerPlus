import assert from "node:assert/strict";
import {
  appendMissingPerkNodes,
  nextAvailablePosition,
  repositionOutOfGridPerks,
  resizeGridToFit,
} from "./append-missing-perks.mjs";
import { buildAvifMembershipIndex } from "./avif-perk-membership.mjs";
import { buildIdentityToPerkName } from "./avif-perk-tree.mjs";
import { perkMetadataKey } from "./perk-tree-metadata.mjs";

const grid = { width: 3, height: 2 };
const perks = [
  { position: { x: 0, y: 0 } },
  { position: { x: 1, y: 0 } },
  { position: { x: 2, y: 0 } },
  { position: { x: 0, y: 1 } },
  { position: { x: 1, y: 1 } },
];

const sixth = nextAvailablePosition(perks, grid);
assert.deepEqual(sixth.position, { x: 2, y: 1 });
assert.deepEqual(sixth.grid, grid);

const full = [
  ...perks,
  { position: { x: 2, y: 1 } },
];
const seventh = nextAvailablePosition(full, grid);
assert.deepEqual(seventh.position, { x: 0, y: 2 });
assert.deepEqual(seventh.grid, { width: 3, height: 3 });

assert.deepEqual(
  resizeGridToFit([{ position: { x: 4, y: 1 } }], { width: 3, height: 3 }),
  { width: 5, height: 3 },
);

const tree = {
  grid: { width: 2, height: 2 },
  perks: [
    { id: "a", name: "A", position: { x: 0, y: 0 } },
    { id: "b", name: "B", position: { x: 5, y: -1 } },
  ],
};
const { moved } = repositionOutOfGridPerks(tree);
assert.equal(moved.length, 1);
assert.equal(moved[0].id, "b");
assert.ok(tree.perks[1].position.x >= 0 && tree.perks[1].position.x < tree.grid.width);
assert.ok(tree.perks[1].position.y >= 0 && tree.perks[1].position.y < tree.grid.height);

// Multi-rank perks (NNAM chain) expand into co-located stacked nodes.
const rankRecords = [
  {
    edid: "REQ_Block_ImprovedBlocking",
    name: "Improved Blocking",
    description: "",
    perkMeta: { formIdentity: "p|0", skillReq: 0, prerequisiteIdentities: [], nextRankIdentity: null },
  },
  {
    edid: "REQ_Block_ShieldStrike1",
    name: "Shield Strike",
    description: "",
    perkMeta: { formIdentity: "p|1", skillReq: 25, prerequisiteIdentities: ["p|0"], nextRankIdentity: "p|2" },
  },
  {
    edid: "REQ_Block_ShieldStrike2",
    name: "Shield Strike",
    description: "",
    perkMeta: { formIdentity: "p|2", skillReq: 50, prerequisiteIdentities: ["p|1"], nextRankIdentity: null },
  },
];

const rankMembership = buildAvifMembershipIndex(
  new Map([
    [
      "block",
      {
        skillId: "block",
        avifEdid: "AVBlock",
        sections: [
          { identity: "p|0", inam: 0, cnam: [1], x: 5, y: 10 },
          { identity: "p|1", inam: 1, cnam: [], x: 7, y: 6 },
        ],
      },
    ],
  ]),
  buildIdentityToPerkName(rankRecords),
);

const rankMetadata = new Map([
  [perkMetadataKey("block", "Shield Strike"), { skillReq: null, prerequisiteNames: ["Improved Blocking", "Shield Strike"], position: null }],
]);

const rankTrees = {
  "block.json": { skillId: "block", skillName: "Block", grid: { width: 25, height: 25 }, perks: [] },
};

appendMissingPerkNodes(rankTrees, rankRecords, rankMetadata, rankMembership, rankRecords);

const blockPerks = rankTrees["block.json"].perks;
const shieldStrikes = blockPerks.filter((perk) => perk.name === "Shield Strike");
assert.equal(shieldStrikes.length, 2, "Shield Strike should expand to 2 ranks");
assert.deepEqual(
  shieldStrikes[0].position,
  shieldStrikes[1].position,
  "ranks must share one grid cell",
);
assert.deepEqual(
  shieldStrikes.map((perk) => perk.skillReq).sort((a, b) => a - b),
  [25, 50],
);
assert.ok(shieldStrikes.some((perk) => perk.id.endsWith("-r2")), "rank 2 id is suffixed");

const improvedId = blockPerks.find((perk) => perk.name === "Improved Blocking").id;
const rank1 = shieldStrikes.find((perk) => perk.skillReq === 25);
const rank2 = shieldStrikes.find((perk) => perk.skillReq === 50);
assert.deepEqual(rank1.prerequisites, [improvedId], "rank 1 keeps its parent prerequisite");
assert.deepEqual(rank2.prerequisites, [], "higher ranks are gated by the stack, not prerequisites");

// BOOB speech perks are player-visible but absent from AVIF PNAM sections.
const boobRecords = [
  {
    edid: "BOOB_BattleMusePerk",
    name: "Battle Muse",
    description: "Inspire allies.",
    perkMeta: { formIdentity: "boob.esp|80c", skillReq: null, prerequisiteIdentities: [], nextRankIdentity: null },
  },
];

const boobMembership = buildAvifMembershipIndex(
  new Map([
    [
      "speech",
      {
        skillId: "speech",
        avifEdid: "AVSpeechcraft",
        sections: [{ identity: "p|haggling", inam: 0, cnam: [], x: 5, y: 10, name: "Haggling" }],
      },
    ],
  ]),
  buildIdentityToPerkName([
    {
      edid: "REQ_Speech_Haggling",
      name: "Haggling",
      perkMeta: { formIdentity: "p|haggling", skillReq: 0, prerequisiteIdentities: [], nextRankIdentity: null },
    },
    ...boobRecords,
  ]),
);

const boobTrees = {
  "speech.json": { skillId: "speech", skillName: "Speech", grid: { width: 25, height: 25 }, perks: [] },
};

appendMissingPerkNodes(boobTrees, boobRecords, null, boobMembership, boobRecords);

const battleMuse = boobTrees["speech.json"].perks.find((perk) => perk.name === "Battle Muse");
assert.ok(battleMuse, "supplemental BOOB perk is appended when absent from AVIF");
assert.ok(
  boobMembership.namesBySkill.get("speech")?.has("battle muse"),
  "supplemental perk is registered for orphan-prune anchoring",
);

// The same display name may appear in multiple skill trees (e.g. Relentless Onslaught).
const duplicateRecords = [
  {
    edid: "REQ_HeavyArmor_RelentlessOnslaught",
    name: "Relentless Onslaught",
    description: "Heavy armor sprint.",
    perkMeta: { formIdentity: "p|heavy", skillReq: 20, prerequisiteIdentities: [], nextRankIdentity: null },
  },
  {
    edid: "REQ_OneHanded_StunningCharge",
    name: "Relentless Onslaught",
    description: "One-handed charge.",
    perkMeta: { formIdentity: "p|one", skillReq: 100, prerequisiteIdentities: [], nextRankIdentity: null },
  },
];

const duplicateMembership = buildAvifMembershipIndex(
  new Map([
    [
      "heavy-armor",
      {
        skillId: "heavy-armor",
        avifEdid: "AVHeavyArmor",
        sections: [{ identity: "p|heavy", inam: 0, cnam: [], x: 1, y: 1 }],
      },
    ],
    [
      "one-handed",
      {
        skillId: "one-handed",
        avifEdid: "AVOneHanded",
        sections: [{ identity: "p|one", inam: 0, cnam: [], x: 2, y: 2 }],
      },
    ],
  ]),
  buildIdentityToPerkName(duplicateRecords),
);

const duplicateTrees = {
  "heavy-armor.json": { skillId: "heavy-armor", skillName: "Heavy Armor", grid: { width: 25, height: 25 }, perks: [] },
  "one-handed.json": { skillId: "one-handed", skillName: "One-Handed", grid: { width: 25, height: 25 }, perks: [] },
};

appendMissingPerkNodes(duplicateTrees, duplicateRecords, null, duplicateMembership, duplicateRecords);

assert.ok(
  duplicateTrees["heavy-armor.json"].perks.some((perk) => perk.name === "Relentless Onslaught"),
  "heavy-armor Relentless Onslaught is imported",
);
assert.ok(
  duplicateTrees["one-handed.json"].perks.some((perk) => perk.name === "Relentless Onslaught"),
  "one-handed Relentless Onslaught is imported even when heavy-armor already has the name",
);

console.log("append-missing-perks.test.mjs: ok");
