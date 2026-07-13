import assert from "node:assert/strict";
import { skillIdFromAvif } from "./avif-perk-tree.mjs";
import { isImportableAvifPerkSkill } from "./perk-skill-classifier.mjs";
import {
  SUPERNATURAL_AVIF_FULL_NAME_TO_SKILL,
  isSupernaturalPerkSkill,
} from "./supernatural-perk-skills.mjs";
import { appendMissingPerkNodes, normalizeStackPrerequisites } from "./append-missing-perks.mjs";
import { buildAvifMembershipIndex } from "./avif-perk-membership.mjs";
import {
  applyPerkGraphSnapshots,
  createEmptyPerkTrees,
  perkGraphKey,
} from "./import-reset.mjs";
import { buildPerkMetadataIndex } from "./perk-tree-metadata.mjs";

assert.equal(skillIdFromAvif("AVHealRatePowerMod", "Werebeast"), "werewolf");
assert.equal(skillIdFromAvif("AVHealRatePowerMod", "Werewolf"), "werewolf");
assert.equal(skillIdFromAvif("AVMagickaRateMod", "Vampire Lord"), "vampire");
assert.equal(skillIdFromAvif("AVUnused", "Magicka Weave"), "lich");
assert.equal(skillIdFromAvif("AVUnused", "Lich"), "lich");
assert.equal(skillIdFromAvif("AVSmithing", "Smithing"), "smithing");
assert.equal(skillIdFromAvif("AVHealRatePowerMod", ""), null);
assert.equal(isSupernaturalPerkSkill("werewolf"), true);
assert.equal(isSupernaturalPerkSkill("lich"), true);
assert.equal(isImportableAvifPerkSkill("werewolf"), true);
assert.equal(isImportableAvifPerkSkill("lich"), true);
assert.equal(isImportableAvifPerkSkill("destiny"), false);
assert.equal(SUPERNATURAL_AVIF_FULL_NAME_TO_SKILL.get("werebeast"), "werewolf");
assert.equal(SUPERNATURAL_AVIF_FULL_NAME_TO_SKILL.get("magicka weave"), "lich");

const bestial1 = {
  edid: "HRI_PerkTree_0_Perk_BestialStrength_1",
  name: "Bestial Strength",
  description: "Deal 20% more attack damage in beast form.",
  perkMeta: {
    formIdentity: "growl.esp|1",
    skillReq: 0,
    prerequisiteIdentities: [],
    nextRankIdentity: "growl.esp|2",
  },
};
const bestial2 = {
  edid: "HRI_PerkTree_0_Perk_BestialStrength_2",
  name: "Bestial Strength",
  description: "Deal 30% more attack damage in beast form.",
  perkMeta: {
    formIdentity: "growl.esp|2",
    skillReq: 0,
    prerequisiteIdentities: ["growl.esp|1"],
    nextRankIdentity: null,
  },
};
const animalVigor = {
  edid: "HRI_PerkTree_1_Perk_AnimalVigor",
  name: "Animal Vigor",
  description: "Additional Health and Stamina in beast form.",
  perkMeta: {
    formIdentity: "growl.esp|10",
    skillReq: 0,
    prerequisiteIdentities: ["growl.esp|1"],
    nextRankIdentity: null,
  },
};
const infinite = {
  edid: "HRI_PerkTree_2_Perk_InfiniteDuress",
  name: "Infinite Duress",
  description: "Frenzy attacks stun targets.",
  perkMeta: {
    formIdentity: "growl.esp|11",
    skillReq: 0,
    prerequisiteIdentities: ["growl.esp|10"],
    nextRankIdentity: null,
  },
};
const supernatural = {
  edid: "HRI_PerkTree_2_Perk_SupernaturalStrength",
  name: "Supernatural Strength",
  description: "Back hand attacks disarm targets.",
  perkMeta: {
    formIdentity: "growl.esp|12",
    skillReq: 0,
    prerequisiteIdentities: ["growl.esp|10"],
    nextRankIdentity: null,
  },
};
const roadkill = {
  edid: "HRI_PerkTree_2_Perk_Roadkill",
  name: "Roadkill",
  description: "Leap attacks throw targets.",
  perkMeta: {
    formIdentity: "growl.esp|13",
    skillReq: 0,
    prerequisiteIdentities: ["growl.esp|10"],
    nextRankIdentity: null,
  },
};
const rampage = {
  edid: "HRI_PerkTree_3_Perk_Rampage",
  name: "Rampage",
  description: "Beast form lasts longer.",
  perkMeta: {
    formIdentity: "growl.esp|14",
    skillReq: 0,
    prerequisiteIdentities: ["growl.esp|11", "growl.esp|12", "growl.esp|13"],
    nextRankIdentity: null,
  },
};
const nightEye = {
  edid: "HRI_Lycan_Perk_NightEye",
  name: "Night Eye",
  description: "Your eyes have adapted while in beastform, you can now see better in the dark.",
  perkMeta: {
    formIdentity: "growl.esp|20",
    skillReq: 0,
    prerequisiteIdentities: ["growl.esp|1"],
    nextRankIdentity: null,
  },
};

const perkRecords = [
  bestial1,
  bestial2,
  animalVigor,
  infinite,
  supernatural,
  roadkill,
  rampage,
  nightEye,
];

const membership = buildAvifMembershipIndex(
  new Map([
    [
      "werewolf",
      {
        skillId: "werewolf",
        // CNAM lists child INAMs (same convention as Ordinator / Requiem AVIFs).
        sections: [
          { identity: "skyrim.esm|0", inam: 0, cnam: [1], x: 0, y: 0 },
          { identity: "growl.esp|1", inam: 1, cnam: [2, 7], x: 4, y: 0 },
          { identity: "growl.esp|10", inam: 2, cnam: [3, 4, 5], x: 4, y: 2 },
          { identity: "growl.esp|11", inam: 3, cnam: [6], x: 5, y: 3 },
          { identity: "growl.esp|12", inam: 4, cnam: [6], x: 4, y: 3 },
          { identity: "growl.esp|13", inam: 5, cnam: [6], x: 3, y: 3 },
          { identity: "growl.esp|14", inam: 6, cnam: [], x: 4, y: 4 },
          { identity: "growl.esp|20", inam: 7, cnam: [], x: 3, y: 1 },
        ],
      },
    ],
  ]),
  new Map(perkRecords.map((record) => [record.perkMeta.formIdentity, record.name])),
);

assert.equal(membership.hasAvifForSkill("werewolf"), true);

const { trees } = createEmptyPerkTrees();
const metadataIndex = buildPerkMetadataIndex(perkRecords, membership.finalizedAvif, membership);
const added = appendMissingPerkNodes(
  trees,
  perkRecords,
  metadataIndex,
  membership,
  perkRecords,
  null,
);
normalizeStackPrerequisites(trees["werewolf.json"]);

assert.ok(added.length > 0);
const werewolf = trees["werewolf.json"];
assert.equal(werewolf.skillId, "werewolf");

const byName = new Map();
for (const perk of werewolf.perks) {
  const group = byName.get(perk.name) ?? [];
  group.push(perk);
  byName.set(perk.name, group);
}

assert.equal(byName.get("Bestial Strength")?.length, 2);
assert.equal(byName.get("Night Eye")?.length, 1);
assert.equal(
  byName.get("Night Eye")[0].description,
  "Your eyes have adapted while in beastform, you can now see better in the dark.",
);

const rampageNode = byName.get("Rampage")[0];
assert.deepEqual(
  [...rampageNode.prerequisites].sort(),
  ["werewolf-infinite-duress", "werewolf-roadkill", "werewolf-supernatural-strength"].sort(),
);

const bestialStack = byName.get("Bestial Strength");
assert.equal(bestialStack[0].position.x, bestialStack[1].position.x);
assert.equal(bestialStack[0].position.y, bestialStack[1].position.y);

// Graph snapshots must not overwrite AVIF prerequisites for supernatural trees.
const wrongSnapshots = new Map([
  [
    "werewolf",
    {
      byGraphKey: new Map([
        [
          perkGraphKey(rampageNode),
          {
            id: rampageNode.id,
            prerequisites: [bestialStack[0].id],
            prerequisitesAny: [],
            effects: [{ type: "derivedStat", stat: "moveSpeed", value: 1, isPercent: true }],
          },
        ],
      ]),
      idToGraphKey: new Map([[rampageNode.id, perkGraphKey(rampageNode)]]),
    },
  ],
]);

applyPerkGraphSnapshots(trees, wrongSnapshots);
const rampageAfter = trees["werewolf.json"].perks.find((perk) => perk.name === "Rampage");
assert.equal(rampageAfter.prerequisites.length, 3);
// Supernatural trees keep imported DESC-parsed effects, not snapshot effects.
assert.equal(rampageAfter.effects?.length ?? 0, 0);

// Vampire Lord AVIF: multi-parent AND (Energy Vampire needs Blood Storm + Slasher).
const scion = {
  edid: "SAC_Scion",
  name: "Scion",
  description: "Root.",
  perkMeta: {
    formIdentity: "sac.esp|1",
    skillReq: 0,
    prerequisiteIdentities: [],
    nextRankIdentity: null,
  },
};
const bloodStorm = {
  edid: "SAC_BloodStorm",
  name: "Blood Storm",
  description: "Raze upgrade.",
  perkMeta: {
    formIdentity: "sac.esp|2",
    skillReq: 0,
    prerequisiteIdentities: ["sac.esp|1"],
    nextRankIdentity: null,
  },
};
const slasher = {
  edid: "SAC_Slasher",
  name: "Slasher",
  description: "Power attacks.",
  perkMeta: {
    formIdentity: "sac.esp|3",
    skillReq: 0,
    prerequisiteIdentities: ["sac.esp|1"],
    nextRankIdentity: null,
  },
};
const energyVampire = {
  edid: "SAC_EnergyVampire",
  name: "Energy Vampire",
  description: "Absorb Magicka and Stamina.",
  perkMeta: {
    formIdentity: "sac.esp|4",
    skillReq: 0,
    prerequisiteIdentities: ["sac.esp|2", "sac.esp|3"],
    nextRankIdentity: null,
  },
};
const vampireRecords = [scion, bloodStorm, slasher, energyVampire];
const vampireMembership = buildAvifMembershipIndex(
  new Map([
    [
      "vampire",
      {
        skillId: "vampire",
        sections: [
          { identity: "sac.esp|1", inam: 1, cnam: [2, 3], x: 4, y: 0 },
          { identity: "sac.esp|2", inam: 2, cnam: [4], x: 3, y: 2 },
          { identity: "sac.esp|3", inam: 3, cnam: [4], x: 5, y: 2 },
          { identity: "sac.esp|4", inam: 4, cnam: [], x: 4, y: 4 },
        ],
      },
    ],
  ]),
  new Map(vampireRecords.map((record) => [record.perkMeta.formIdentity, record.name])),
);
const vampireTrees = createEmptyPerkTrees().trees;
const vampireMetadata = buildPerkMetadataIndex(
  vampireRecords,
  vampireMembership.finalizedAvif,
  vampireMembership,
);
appendMissingPerkNodes(
  vampireTrees,
  vampireRecords,
  vampireMetadata,
  vampireMembership,
  vampireRecords,
  null,
);
const energyNode = vampireTrees["vampire.json"].perks.find((perk) => perk.name === "Energy Vampire");
assert.deepEqual(
  [...energyNode.prerequisites].sort(),
  ["vampire-blood-storm", "vampire-slasher"].sort(),
);
assert.match(energyNode.description, /Absorb Magicka and Stamina/);

console.log("supernatural-perk-skills.test.mjs: ok");
