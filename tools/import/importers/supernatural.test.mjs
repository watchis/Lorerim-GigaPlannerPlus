import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { transformSupernaturalRecords } from "./supernatural.mjs";
import { importSupernatural } from "./supernatural.mjs";

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
          id: "stage-1",
          name: "Stage 1",
          description: "Hand-tuned description.",
          bonus: "Health +50.",
          effects: [{ type: "attribute", stat: "health", value: 50 }],
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
  }),
);

const spellRecords = [
  {
    edid: "REQ_Vampire_Stage2",
    name: "Vampire Stage 2",
    description: "Health increases by 75. Frost resistance +40%.",
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
];

const transformed = transformSupernaturalRecords(spellRecords, supernaturalPath);

assert.equal(transformed.vampirism.stages.length, 5);
assert.equal(transformed.vampirism.stages[1].description, "Hand-tuned description.");
assert.equal(transformed.vampirism.stages[2].bonus, "Health increases by 75. Frost resistance +40%.");
assert.ok(transformed.vampirism.stages[2].effects.length > 0);
assert.equal(transformed.lycanthropy.forms[1].bonus, "Health +50. Stamina +50. Disease resistance +1000%.");
assert.equal(transformed.vampirism.racialBonuses.nord.description, "Hand-tuned nord bonus.");
assert.equal(
  transformed.lycanthropy.racialBonuses.breton.description,
  "Your Breton blood reduces Beast Form cooldown by 50%.",
);

const context = {
  scan: { spellRecords },
  paths: { supernaturalPath },
};

const result = await importSupernatural(context);
assert.equal(result.files[0][0], "supernatural.json");
assert.equal(result.summary.vampirismStages, 5);
assert.equal(result.summary.lycanthropyForms, 2);

console.log("supernatural.test.mjs: ok");
