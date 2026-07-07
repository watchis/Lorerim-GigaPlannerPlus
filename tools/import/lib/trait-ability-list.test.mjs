import assert from "node:assert/strict";
import { performance } from "node:perf_hooks";
import {
  collectTraitAbilitySpells,
  parseFlmTraitAbilityAdditions,
  readFormIdsFromBuffer,
  resolveFormIdsToSpellEdids,
} from "./trait-ability-list.mjs";
import { buildSubrecord } from "./test-fixtures.mjs";

const sampleFlm = `
; LoreRim Traits
FormList = Traits_AbilityList|LoreTraits_PhalanxAb
FormList = Traits_EffectsList|LoreTraits_Phalanx

FormList = Traits_AbilityList|LoreTraits_WizardsWardrobeAb
FormList = Traits_AbilityList|Traits_AddictAb
`;

assert.deepEqual(parseFlmTraitAbilityAdditions(sampleFlm), [
  "LoreTraits_PhalanxAb",
  "LoreTraits_WizardsWardrobeAb",
  "Traits_AddictAb",
]);

const formListBuffer = Buffer.concat([
  buildSubrecord("LNAM", (() => {
    const data = Buffer.alloc(4);
    data.writeUInt32LE(0x010000aa, 0);
    return data;
  })()),
  buildSubrecord("LNAM", (() => {
    const data = Buffer.alloc(4);
    data.writeUInt32LE(0x010000bb, 0);
    return data;
  })()),
]);
assert.deepEqual(readFormIdsFromBuffer(formListBuffer), [0x010000aa, 0x010000bb]);

const plugins = [{ pluginName: "LoreRim.esp", path: "/mods/lorerim.esp" }];
const mastersByPath = new Map([["/mods/lorerim.esp", ["skyrim.esm"]]]);
const sourcePlugin = { pluginName: "LoreRim.esp", path: "/mods/lorerim.esp" };

function makeSpellRecords(count) {
  const records = [
    {
      edid: "Traits_AddictAb",
      name: "Addict",
      plugin: "LoreRim.esp",
      formId: 0x010000aa,
    },
    {
      edid: "LoreTraits_PhalanxAb",
      name: "Phalanx",
      plugin: "LoreRim.esp",
      formId: 0x010000bb,
    },
  ];

  for (let index = 0; index < count; index += 1) {
    records.push({
      edid: `Noise_Spell_${index}`,
      name: `Noise ${index}`,
      plugin: "LoreRim.esp",
      formId: 0x02000000 + index,
    });
  }

  return records;
}

const resolved = await resolveFormIdsToSpellEdids(
  plugins,
  [0x010000aa, 0x010000bb],
  makeSpellRecords(20_000),
  { sourcePlugin, mastersByPath },
);
assert.deepEqual(resolved, ["Traits_AddictAb", "LoreTraits_PhalanxAb"]);

const largeSpellRecords = makeSpellRecords(50_000);
const start = performance.now();
const earlyExitResolved = await resolveFormIdsToSpellEdids(
  plugins,
  [0x010000aa],
  largeSpellRecords,
  { sourcePlugin, mastersByPath },
);
const elapsedMs = performance.now() - start;
assert.deepEqual(earlyExitResolved, ["Traits_AddictAb"]);
assert.ok(
  elapsedMs < 250,
  `expected early-exit trait resolution to finish quickly, took ${elapsedMs.toFixed(1)}ms`,
);

const collected = await collectTraitAbilitySpells(
  plugins,
  "/install",
  [],
  makeSpellRecords(0),
  {
    traitsFormList: {
      formIds: [0x010000aa, 0x010000bb],
      sourcePlugin,
    },
    mastersByPath,
  },
);
assert.deepEqual(
  collected.map((spell) => spell.edid),
  ["Traits_AddictAb", "LoreTraits_PhalanxAb"],
);

console.log("trait-ability-list.test.mjs: ok");
