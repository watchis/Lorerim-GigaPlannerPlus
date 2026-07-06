import assert from "node:assert/strict";
import {
  extractReferenceBlessingMagnitudes,
  loadBlessingReferenceRows,
  shrineTextContainsMagnitudes,
} from "./deity-blessing-reference.mjs";
import { extractFaithEffectsFromPlugins, indexDeityFaithMgef } from "./deity-faith-from-plugins.mjs";
import { collectAltarBlessingFromSpellBuffer } from "./esp-reader.mjs";
import { readSpellEfitMagnitudes } from "./spell-magnitude.mjs";
import { cleanWintersunEffectText } from "./transform-utils.mjs";

function buildSpellEfitBuffer(magnitude, dataSize = 12) {
  const data = Buffer.alloc(dataSize);
  data.writeFloatLE(magnitude, 0);
  if (dataSize >= 8) data.writeUInt32LE(0, 4);
  if (dataSize >= 12) data.writeUInt32LE(0, 8);

  const header = Buffer.alloc(6);
  header.write("EFIT", 0, 4, "ascii");
  header.writeUInt16LE(dataSize, 4);
  return Buffer.concat([header, data]);
}

function buildSpellEfidBuffer(formId) {
  const data = Buffer.alloc(4);
  data.writeUInt32LE(formId, 0);
  const header = Buffer.alloc(6);
  header.write("EFID", 0, 4, "ascii");
  header.writeUInt16LE(4, 4);
  return Buffer.concat([header, data]);
}

function buildSpellBufferWithMagnitudes(magnitudes) {
  return Buffer.concat(magnitudes.map((magnitude) => buildSpellEfitBuffer(magnitude)));
}

assert.deepEqual(extractReferenceBlessingMagnitudes("25% Stamina Regen."), [25]);
assert.deepEqual(extractReferenceBlessingMagnitudes("15 More Health and Stamina"), [15]);
assert.deepEqual(extractReferenceBlessingMagnitudes("30 More Health"), [30]);
assert.deepEqual(
  extractReferenceBlessingMagnitudes("2 Lockpicking Expertise and 25% Better Pickpocket").sort((a, b) => a - b),
  [2, 25],
);
assert.deepEqual(
  extractReferenceBlessingMagnitudes("100 Armor Rating and 10% Magic Resist for Followers").sort((a, b) => a - b),
  [10, 100],
);

const SHRINE_MAGNITUDE_FIXTURES = [
  {
    altarKey: "Daedra_Hircine",
    dnam: "Regenerate Stamina <mag>% faster.",
    magnitudes: [25],
    referenceBlessing: "25% Stamina Regen.",
  },
  {
    altarKey: "Tribunal_Almalexia",
    dnam: "Increases your Health and Stamina by <mag> points.",
    magnitudes: [15],
    referenceBlessing: "15 More Health and Stamina",
  },
  {
    altarKey: "Divine_Arkay",
    dnam: "Increases your Health by <mag> points.",
    magnitudes: [30],
    referenceBlessing: "30 More Health",
  },
  {
    altarKey: "BaanDar",
    dnam: "<mag> Lockpicking Expertise and <mag>% Better Pickpocket",
    magnitudes: [2, 25],
    referenceBlessing: "2 Lockpicking Expertise and 25% Better Pickpocket",
  },
  {
    altarKey: "StAlessia",
    dnam: "Followers within 50 feet gain <mag> points of armor and <mag>% magic resistance.",
    magnitudes: [100, 10],
    referenceBlessing: "100 Armor Rating and 10% Magic Resist for Followers",
  },
  {
    altarKey: "Divine_Jephre",
    dnam: "Carrying capacity increased by <mag> points.",
    magnitudes: [50],
    referenceBlessing: "50 More Carry Weight",
  },
  {
    altarKey: "Daedra_Namira",
    dnam: "Increases Disease Resistance by <mag>%.",
    magnitudes: [50],
    referenceBlessing: "50% Resist Disease",
  },
];

for (const fixture of SHRINE_MAGNITUDE_FIXTURES) {
  const expected = extractReferenceBlessingMagnitudes(fixture.referenceBlessing);
  assert.deepEqual(
    expected.sort((a, b) => a - b),
    fixture.magnitudes.slice().sort((a, b) => a - b),
    `${fixture.altarKey} reference magnitudes`,
  );

  const shrine = extractFaithEffectsFromPlugins({
    altarKey: fixture.altarKey,
    mgefIndex: indexDeityFaithMgef([
      {
        edid: `WSN_AltarBlessing_${fixture.altarKey}_Effect`,
        effectDescription: fixture.dnam,
      },
    ]),
    altarMagnitudes: fixture.magnitudes,
  }).shrine;

  assert.ok(
    shrineTextContainsMagnitudes(shrine, expected),
    `${fixture.altarKey} shrine "${shrine}" should contain ${expected.join(", ")}`,
  );

  if (fixture.altarKey === "Tribunal_Almalexia") {
    assert.equal(
      shrine,
      "Increases your Health and Stamina by 15 points.",
      "shrine text should keep in-game MGEF wording, not spreadsheet phrasing",
    );
  }
}

const hircineBuffer = buildSpellBufferWithMagnitudes([25]);
const hircineBlessing = collectAltarBlessingFromSpellBuffer(
  hircineBuffer,
  "WSN_AltarBlessing_Daedra_Hircine_Spell",
  "Wintersun.esp",
);
assert.deepEqual(hircineBlessing?.magnitudes, [25]);
assert.equal(hircineBlessing?.magnitude, 25);

const baandarBuffer = buildSpellBufferWithMagnitudes([2, 25]);
const baandarBlessing = collectAltarBlessingFromSpellBuffer(
  baandarBuffer,
  "WSN_AltarBlessing_BaanDar_Spell",
  "Wintersun.esp",
);
assert.deepEqual(baandarBlessing?.magnitudes, [2, 25]);

const variantPreferred = collectAltarBlessingFromSpellBuffer(
  buildSpellBufferWithMagnitudes([0]),
  "WSN_AltarBlessing_Tribunal_Almalexia_BuffOnly_Spell",
  "Wintersun.esp",
);
assert.equal(variantPreferred, null, "zero-only variant spells should not contribute magnitudes");

const tribunalShrineMgefFormId = 0x1c00084a;
const tribunalCcBuffer = Buffer.concat([
  buildSpellEfidBuffer(0x000fbff5),
  buildSpellEfitBuffer(25),
  buildSpellEfidBuffer(tribunalShrineMgefFormId),
  buildSpellEfitBuffer(15),
]);
const tribunalCcBlessing = collectAltarBlessingFromSpellBuffer(
  tribunalCcBuffer,
  "ccASVSSE001_AlmalexiaSpell",
  "Wintersun - Reqtificated.esp",
  new Map([["WSN_AltarBlessing_Tribunal_Almalexia_Effect", tribunalShrineMgefFormId]]),
);
assert.deepEqual(tribunalCcBlessing?.magnitudes, [15]);
assert.equal(tribunalCcBlessing?.altarKey, "Tribunal_Almalexia");

assert.equal(
  cleanWintersunEffectText("<mag> Lockpicking Expertise and <mag>% Better Pickpocket", [2, 25]),
  "2 Lockpicking Expertise and 25% Better Pickpocket",
);

const referenceRows = loadBlessingReferenceRows();
const measurableRows = referenceRows.filter((row) => row.expectedMagnitudes.length > 0);
assert.ok(measurableRows.length >= 40, "expected measurable blessing rows from LoreRim 5.0 reference sheet");

for (const row of measurableRows) {
  if (/random/i.test(row.blessing)) continue;
  assert.ok(
    row.expectedMagnitudes.length > 0,
    `${row.deityName} should have extractable reference magnitudes`,
  );
}

console.log("deity-blessing-magnitude tests passed");
