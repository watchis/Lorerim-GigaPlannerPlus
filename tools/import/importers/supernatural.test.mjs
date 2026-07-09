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
          id: "vampire",
          name: "Vampire",
          description: "Hand-tuned description.",
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
  }),
);

const spellRecords = [
  {
    edid: "REQ_Vampire_Stage4",
    name: "Vampire",
    description: "Health increases by 125. Frost resistance +50%.",
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

assert.equal(transformed.vampirism.forms.length, 2);
assert.equal(transformed.vampirism.forms[1].description, "Hand-tuned description.");
assert.equal(
  transformed.vampirism.forms[1].bonus,
  "Health increases by 125. Frost resistance +50%.",
);
assert.ok(transformed.vampirism.forms[1].effects.length > 0);
assert.equal(
  transformed.lycanthropy.forms[1].bonus,
  "Health +50. Stamina +50. Disease resistance +1000%.",
);
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
assert.equal(result.summary.vampirismForms, 2);
assert.equal(result.summary.lycanthropyForms, 2);

console.log("supernatural.test.mjs: ok");
