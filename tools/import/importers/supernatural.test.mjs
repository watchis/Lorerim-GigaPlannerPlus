import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { transformSupernaturalRecords, importSupernatural } from "./supernatural.mjs";

const dataDir = mkdtempSync(join(tmpdir(), "supernatural-data-"));
const supernaturalPath = join(dataDir, "supernatural.json");

writeFileSync(
  supernaturalPath,
  JSON.stringify({
    incompatibleTraitIds: ["silent-dovah"],
    vampirism: {
      stages: [
        {
          id: "none",
          name: "None",
          description: "",
          bonus: "",
          effects: [],
          bonusDetails: [],
        },
        {
          id: "stage-4",
          name: "Stage 4",
          description: "Hand-tuned stage 4 description.",
          bonus: "Health +100.",
          effects: [{ type: "attribute", stat: "health", value: 100 }],
          bonusDetails: ["Cannot take Silent Dovah."],
        },
      ],
      racialBonuses: {
        nord: {
          name: "Preserved Blood",
          description: "Hand-tuned nord bonus.",
        },
      },
    },
    lycanthropy: {
      forms: [
        {
          id: "none",
          name: "None",
          description: "",
          bonus: "",
          effects: [],
          bonusDetails: [],
        },
        {
          id: "werewolf",
          name: "Werewolf",
          description: "Hand-tuned werewolf.",
          bonus: "Health +50.",
          effects: [{ type: "attribute", stat: "health", value: 50 }],
          bonusDetails: [],
        },
      ],
      racialBonuses: {},
    },
    lichdom: {
      forms: [
        {
          id: "none",
          name: "None",
          description: "",
          bonus: "",
          effects: [],
          bonusDetails: [],
        },
        {
          id: "lich",
          name: "Lich",
          description: "Hand-tuned lich.",
          bonus: "Old bonus.",
          effects: [{ type: "derivedStat", stat: "frostResist", value: 50, isPercent: true }],
          bonusDetails: ["Planner curse notes."],
        },
      ],
      racialBonuses: {},
      phylactery: {
        maxSouls: 50,
        perSoul: {
          armorRating: 2,
          magicka: 5,
          magicAbsorb: 0.5,
          magicAbsorbInForm: 0.5,
          spellDurationInForm: 0.5,
        },
        thresholds: [
          {
            souls: 15,
            name: "Tempered Form",
            description: "Old tempered.",
            effects: [{ type: "derivedStat", stat: "fireResist", value: 50, isPercent: true }],
            bonusDetails: ["Fire weakness halved."],
          },
        ],
      },
    },
  }),
);

const spellRecords = [
  {
    edid: "REQ_Vampire_Stage1",
    name: "Stage 1",
    description: "Health increases by 50.",
  },
  {
    edid: "REQ_Vampire_Stage4",
    name: "Stage 4",
    description: "Health increases by 125. Frost resistance +50%.",
  },
  {
    edid: "REQ_Vampire_Stage5",
    name: "Stage 5",
    description: "Health increases by 150.",
  },
  {
    edid: "REQ_Werewolf_HumanForm",
    name: "Lycanthropy",
    description: "Health +50. Stamina +50. Disease resistance +1000%.",
  },
  {
    edid: "REQ_Vampire_Race_Nord",
    name: "Preserved Blood",
    description: "Your Nord heritage grants bottled blood.",
  },
  {
    edid: "REQ_Werewolf_Race_Breton",
    name: "Skinwalker",
    description: "Your Breton blood reduces Beast Form cooldown by 50%.",
  },
  {
    edid: "NecroUCLCurseOfLichdom",
    name: "Woe of Lichdom",
    description: "As a lich, health does not regenerate passively.",
  },
];

const mesgRecords = [
  {
    edid: "NecroPhyMsg1",
    description:
      "You harvest the animus in the black soul gem and imbue your phylactery with its magical energy. Your power grows.\n\nYou have gained +50 magicka.",
  },
  {
    edid: "NecroPhyMsg2",
    description:
      "You harvest the animus in the black soul gem and imbue your phylactery with its magical energy. Your power grows.\n\nStale 1 percent absorb.",
  },
  {
    edid: "NecroPhyMsg15",
    description:
      "You harvest the animus in the black soul gem and imbue your phylactery with its magical energy. Your power grows.\n\nYou construct a physical form that is 50 percent less weak to fire than before.",
  },
];

const transformed = transformSupernaturalRecords(spellRecords, supernaturalPath, {
  mesgRecords,
  plugins: [{ pluginName: "UndeathFixes.esp" }],
});

assert.equal(transformed.vampirism.stages.length, 6); // none + stages 1–5
const stage4 = transformed.vampirism.stages.find((stage) => stage.id === "stage-4");
assert.equal(stage4.description, "Hand-tuned stage 4 description.");
assert.equal(stage4.bonus, "Health increases by 125. Frost resistance +50%.");
assert.deepEqual(stage4.bonusDetails, ["Cannot take Silent Dovah."]);
assert.deepEqual(stage4.effects, [{ type: "attribute", stat: "health", value: 100 }]);

const stage5 = transformed.vampirism.stages.find((stage) => stage.id === "stage-5");
assert.equal(stage5.bonus, "Health increases by 150.");

assert.equal(
  transformed.lycanthropy.forms[1].bonus,
  "Health +50. Stamina +50. Disease resistance +1000%.",
);
assert.deepEqual(transformed.lycanthropy.forms[1].effects, [
  { type: "attribute", stat: "health", value: 50 },
]);
assert.equal(transformed.vampirism.racialBonuses.nord.name, "Preserved Blood");
assert.equal(
  transformed.vampirism.racialBonuses.nord.description,
  "Your Nord heritage grants bottled blood.",
);
assert.equal(
  transformed.lycanthropy.racialBonuses.breton.description,
  "Your Breton blood reduces Beast Form cooldown by 50%.",
);

assert.equal(transformed.lichdom.forms[1].description, "Hand-tuned lich.");
assert.equal(transformed.lichdom.forms[1].bonus, "As a lich, health does not regenerate passively.");
assert.deepEqual(transformed.lichdom.forms[1].bonusDetails, ["Planner curse notes."]);
assert.equal(transformed.lichdom.forms[1].effects[0].stat, "frostResist");
assert.equal(transformed._meta.lichFramework.mode, "phylactery");
assert.equal(transformed.lichdom.phylactery.perSoul.magicka, 4);
assert.equal(transformed.lichdom.phylactery.thresholds[0].name, "Magicka Flood");
const tempered = transformed.lichdom.phylactery.thresholds.find((entry) => entry.souls === 15);
assert.equal(tempered.effects[0].stat, "fireResist");
assert.equal(tempered.bonusDetails[0], "Fire weakness halved.");

const context = {
  scan: { spellRecords, mesgRecords },
  plugins: [{ pluginName: "UndeathFixes.esp" }],
  paths: { supernaturalPath },
  derived: { avifMembership: null },
};

const result = await importSupernatural(context);
assert.equal(result.files[0][0], "supernatural.json");
assert.equal(result.summary.vampirismStages, 6);
assert.equal(result.summary.lycanthropyForms, 2);
assert.equal(result.summary.lichdomForms, 2);
assert.equal(result.summary.lichMode, "phylactery");
assert.ok(result.summary.phylacteryThresholds >= 3);
assert.equal(result.files[0][1]._meta, undefined);

const preludeOnly = transformSupernaturalRecords(spellRecords, supernaturalPath, {
  mesgRecords: [],
  plugins: [{ pluginName: "PreludeToPurgatory.esp" }],
  avifMembership: { hasAvifForSkill: (id) => id === "lich" },
});
assert.equal(preludeOnly._meta.lichFramework.mode, "perk-tree");
assert.equal(preludeOnly.lichdom.phylactery.thresholds.length, 0);

console.log("supernatural.test.mjs: ok");
