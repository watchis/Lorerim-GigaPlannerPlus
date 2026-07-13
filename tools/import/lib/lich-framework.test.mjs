import assert from "node:assert/strict";
import {
  buildClassicalPhylacteryFromMessages,
  cleanPhylacteryMessage,
  detectLichFramework,
  mergePhylactery,
} from "./lich-framework.mjs";

assert.equal(
  cleanPhylacteryMessage(
    "You harvest the animus in the black soul gem and imbue your phylactery with its magical energy. Your power grows.\n\nYou may now cast Mind Flay.",
  ),
  "You may now cast Mind Flay.",
);

const mesgRecords = [
  {
    edid: "NecroPhyMsg1",
    description:
      "You harvest the animus in the black soul gem and imbue your phylactery with its magical energy. Your power grows.\n\nYou have gained +50 magicka.",
  },
  {
    edid: "NecroPhyMsg2",
    description:
      "You harvest the animus in the black soul gem and imbue your phylactery with its magical energy. Your power grows.\n\nStale 1 percent absorb text.",
  },
  {
    edid: "NecroPhyMsg20",
    description:
      "You harvest the animus in the black soul gem and imbue your phylactery with its magical energy. Your power grows.\n\nYou may now cast Mind Flay.",
  },
];

assert.equal(detectLichFramework({ mesgRecords }).mode, "phylactery");
assert.equal(
  detectLichFramework({
    plugins: [{ pluginName: "PreludeToPurgatory.esp" }],
  }).mode,
  "perk-tree",
);
assert.equal(detectLichFramework({}).mode, "preserve");

// Classical MESG + Prelude plugin still prefer phylactery (Classical Lichdom LoreRim stack).
assert.equal(
  detectLichFramework({
    mesgRecords,
    plugins: [{ pluginName: "PreludeToPurgatory.esp" }],
  }).mode,
  "phylactery",
);

const phylactery = buildClassicalPhylacteryFromMessages(mesgRecords);
assert.equal(phylactery.maxSouls, 50);
assert.equal(phylactery.perSoul.magicka, 4);
assert.equal(phylactery.thresholds[0].name, "Magicka Flood");
assert.match(phylactery.thresholds[0].description, /additional 4 magicka/);
assert.equal(phylactery.thresholds[0].effects[0].value, 50);
assert.equal(phylactery.thresholds[1].name, "Lich Barrier");
assert.match(phylactery.thresholds[1].description, /0\.5% spell absorption/);
assert.equal(
  phylactery.thresholds.find((entry) => entry.souls === 20)?.description,
  "You may now cast Mind Flay.",
);

const merged = mergePhylactery(
  {
    maxSouls: 50,
    perSoul: { magicka: 5 },
    thresholds: [
      {
        souls: 15,
        name: "Tempered Form",
        description: "old",
        effects: [{ type: "derivedStat", stat: "fireResist", value: 50, isPercent: true }],
        bonusDetails: ["Fire weakness halved."],
      },
    ],
  },
  buildClassicalPhylacteryFromMessages([
    ...mesgRecords,
    {
      edid: "NecroPhyMsg15",
      description:
        "You harvest the animus…. Your power grows.\n\nYou construct a physical form that is 50 percent less weak to fire.",
    },
  ]),
);
const tempered = merged.thresholds.find((entry) => entry.souls === 15);
assert.equal(tempered.effects[0].stat, "fireResist");
assert.equal(tempered.bonusDetails[0], "Fire weakness halved.");
assert.equal(merged.perSoul.magicka, 4);

console.log("lich-framework.test.mjs: ok");
