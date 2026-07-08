import assert from "node:assert/strict";
import * as tesData from "@fcrick/tes-data";
import {
  buildBittercupCharacterOption,
  parseAttributeValueModMgef,
  serializeBittercupCharacterOption,
} from "./bittercup-from-plugins.mjs";
import {
  loadCharacterOptionsJson,
  mergeBittercupCharacterOptions,
} from "./merge-character-options.mjs";

function buildSubrecord(type, value) {
  const payload =
    typeof value === "string"
      ? Buffer.from(`${value}\0`, "utf8")
      : Buffer.isBuffer(value)
        ? value
        : Buffer.from(value);
  const header = Buffer.alloc(6);
  header.write(type, 0, 4, "ascii");
  header.writeUInt16LE(payload.length, 4);
  return Buffer.concat([header, payload]);
}

function buildMgefBuffer(edid, primaryAv) {
  const data = Buffer.alloc(0x48);
  data.writeUInt32LE(0, 0x40);
  data.writeInt32LE(primaryAv, 0x44);

  return Buffer.concat([
    Buffer.from("MGEF\x00\x00", "ascii"),
    buildSubrecord("EDID", edid),
    buildSubrecord("DATA", data),
  ]);
}

function buildEfidBuffer(formId) {
  const data = Buffer.alloc(4);
  data.writeUInt32LE(formId, 0);
  return buildSubrecord("EFID", data);
}

function buildEfitBuffer(magnitude) {
  const data = Buffer.alloc(12);
  data.writeFloatLE(magnitude, 0);
  return buildSubrecord("EFIT", data);
}

function buildSpellBuffer(edid, effects) {
  return Buffer.concat([
    Buffer.from("SPEL\x00\x00", "ascii"),
    buildSubrecord("EDID", edid),
    ...effects.flatMap(({ formId, magnitude }) => [
      buildEfidBuffer(formId),
      buildEfitBuffer(magnitude),
    ]),
  ]);
}

const healthMgefFormId = 0x00000801;
const staminaMgefFormId = 0x00000802;

assert.deepEqual(parseAttributeValueModMgef(buildMgefBuffer("ccKRTSSE001_MGEF_Health", 24)), {
  stat: "health",
  effectType: 0,
});
assert.deepEqual(parseAttributeValueModMgef(buildMgefBuffer("ccKRTSSE001_MGEF_Stamina", 26)), {
  stat: "stamina",
  effectType: 0,
});

const mgefRecords = [
  {
    edid: "ccKRTSSE001_MGEF_BittercupHealth",
    buffer: buildMgefBuffer("ccKRTSSE001_MGEF_BittercupHealth", 24),
    stat: "health",
  },
  {
    edid: "ccKRTSSE001_MGEF_BittercupStamina",
    buffer: buildMgefBuffer("ccKRTSSE001_MGEF_BittercupStamina", 26),
    stat: "stamina",
  },
];

const spellCandidates = [
  {
    edid: "ccKRTSSE001_Spell_BittercupReward",
    buffer: buildSpellBuffer("ccKRTSSE001_Spell_BittercupReward", [
      { formId: healthMgefFormId, magnitude: 25 },
      { formId: staminaMgefFormId, magnitude: -25 },
    ]),
    lookup: {
      ownerPluginLower: "cckrtsse001_altar.esl",
      masters: [],
      formIdsByEdid: new Map([
        ["ccKRTSSE001_MGEF_BittercupHealth", healthMgefFormId],
        ["ccKRTSSE001_MGEF_BittercupStamina", staminaMgefFormId],
      ]),
      edidByFormIdentity: new Map([
        ["cckrtsse001_altar.esl|801", "ccKRTSSE001_MGEF_BittercupHealth"],
        ["cckrtsse001_altar.esl|802", "ccKRTSSE001_MGEF_BittercupStamina"],
      ]),
    },
  },
];

const option = buildBittercupCharacterOption({
  mgefRecords,
  spellCandidates,
  alchDescription: "Permanently increases your highest attribute.",
});

assert.equal(option.id, "bittercup");
assert.deepEqual(option.importedMagnitudes, { increase: 25, decrease: 25 });
assert.equal(option.choices[0].id, "none");

const healthMagicka = option.choices.find((choice) => choice.id === "health-magicka");
assert.ok(healthMagicka);
assert.deepEqual(healthMagicka.effects, [
  { type: "attribute", stat: "health", value: 25 },
  { type: "attribute", stat: "magicka", value: -25 },
]);

const fallback = buildBittercupCharacterOption({});
assert.deepEqual(fallback.importedMagnitudes, { increase: 20, decrease: 20 });
assert.equal(fallback.choices.length, 7);

const serialized = serializeBittercupCharacterOption(option);
assert.equal(serialized.importedMagnitudes, undefined);
assert.equal(serialized.choices.find((choice) => choice.id === "health-magicka")?.effects?.[0].value, 25);

const merged = mergeBittercupCharacterOptions(
  {
    options: [
      { id: "oghma-infinium", titleLabel: "oghmaInfinium", defaultChoice: "none", choices: [] },
      {
        id: "bittercup",
        titleLabel: "old",
        defaultChoice: "none",
        choices: [{ id: "none", label: "oldNone" }],
      },
    ],
  },
  option,
);
assert.equal(merged.options.length, 2);
assert.equal(merged.options[1].id, "bittercup");
assert.equal(merged.options[0].id, "oghma-infinium");

assert.deepEqual(loadCharacterOptionsJson("/does/not/exist.json"), { options: [] });

console.log("bittercup-from-plugins tests passed");
