import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  applyPerkExtensionBindings,
  buildPerkExtensionLookup,
  defaultExtensionBindingsPath,
  loadExtensionBindings,
  resolvePerkExtension,
  validateExtensionBindings,
} from "./extension-bindings.mjs";
import { applyPerkGraphSnapshots, loadPerkGraphSnapshots } from "./import-reset.mjs";

const bindings = loadExtensionBindings(defaultExtensionBindingsPath());
assert.ok(bindings.perks.length >= 2);
assert.equal(resolvePerkExtension(bindings, "speech", "Haggling"), "speech-haggling");
assert.equal(
  resolvePerkExtension(bindings, "enchanting", "Artifact Enchanter"),
  "enchanting-artifact-enchanter",
);

const trees = {
  "speech.json": {
    skillId: "speech",
    perks: [
      {
        id: "speech-haggling",
        name: "Haggling",
        description: "Prices are 1% better per level in speech.",
        effects: [{ type: "derivedStat", stat: "priceModifier", value: 5, isPercent: true }],
      },
      {
        id: "speech-merchant",
        name: "Merchant",
        description: "Prices are 20% better.",
        effects: [{ type: "derivedStat", stat: "priceModifier", value: 20, isPercent: true }],
      },
    ],
  },
};

const { applied } = applyPerkExtensionBindings(trees, bindings);
assert.equal(applied, 1);
assert.equal(trees["speech.json"].perks[0].extension, "speech-haggling");
assert.deepEqual(trees["speech.json"].perks[0].effects, []);
assert.equal(trees["speech.json"].perks[1].extension, undefined);
assert.ok(trees["speech.json"].perks[1].effects.length > 0);

const enchantingTrees = {
  "enchanting.json": {
    skillId: "enchanting",
    perks: [
      {
        id: "enchanting-artifact-enchanter",
        name: "Artifact Enchanter",
        description: "With great skill and dedication...",
        effects: [{ type: "derivedStat", stat: "priceModifier", value: 5, isPercent: true }],
      },
    ],
  },
};
const { applied: enchantingApplied } = applyPerkExtensionBindings(enchantingTrees, bindings);
assert.equal(enchantingApplied, 1);
assert.equal(enchantingTrees["enchanting.json"].perks[0].extension, "enchanting-artifact-enchanter");
assert.deepEqual(enchantingTrees["enchanting.json"].perks[0].effects, []);
assert.deepEqual(enchantingTrees["enchanting.json"].perks[0].allocation, {
  kind: "perkPointsBudget",
  totalLabel: "infinity",
});

const snapshotPerksDir = mkdtempSync(join(tmpdir(), "giga-extension-allocation-snapshot-"));
writeFileSync(
  join(snapshotPerksDir, "enchanting.json"),
  JSON.stringify({
    skillId: "enchanting",
    perks: [
      {
        id: "enchanting-artifact-enchanter",
        name: "Artifact Enchanter",
        skillReq: 100,
        extension: "enchanting-artifact-enchanter",
        allocation: { kind: "perkPointsBudget", totalLabel: "X" },
        effects: [],
        position: { x: 9, y: 0 },
        prerequisites: [],
        prerequisitesAny: [],
      },
    ],
  }),
);
const extensionSnapshots = loadPerkGraphSnapshots(snapshotPerksDir);
const importLikeTrees = {
  "enchanting.json": {
    skillId: "enchanting",
    perks: [
      {
        id: "enchanting-artifact-enchanter-new",
        name: "Artifact Enchanter",
        skillReq: 100,
        effects: [{ type: "derivedStat", stat: "priceModifier", value: 99, isPercent: true }],
        position: { x: 9, y: 0 },
        prerequisites: [],
        prerequisitesAny: [],
      },
    ],
  },
};
applyPerkGraphSnapshots(importLikeTrees, extensionSnapshots);
assert.deepEqual(importLikeTrees["enchanting.json"].perks[0].allocation, {
  kind: "perkPointsBudget",
  totalLabel: "X",
});
applyPerkExtensionBindings(importLikeTrees, bindings);
assert.deepEqual(importLikeTrees["enchanting.json"].perks[0].allocation, {
  kind: "perkPointsBudget",
  totalLabel: "infinity",
});

const perksDir = mkdtempSync(join(tmpdir(), "giga-extension-bindings-"));
writeFileSync(
  join(perksDir, "speech.json"),
  JSON.stringify({
    skillId: "speech",
    perks: [
      {
        id: "speech-haggling",
        name: "Haggling",
        skillReq: 0,
        extension: "speech-haggling",
        effects: [],
      },
    ],
  }),
);

const snapshots = loadPerkGraphSnapshots(perksDir);
const rebuilt = {
  "speech.json": {
    skillId: "speech",
    perks: [
      {
        id: "speech-haggling-new",
        name: "Haggling",
        skillReq: 0,
        effects: [{ type: "derivedStat", stat: "priceModifier", value: 99, isPercent: true }],
      },
    ],
  },
};
applyPerkGraphSnapshots(rebuilt, snapshots);
assert.equal(rebuilt["speech.json"].perks[0].extension, "speech-haggling");
assert.deepEqual(rebuilt["speech.json"].perks[0].effects, []);

const root = mkdtempSync(join(tmpdir(), "giga-extension-validate-"));
mkdirSync(join(root, "extensions", "perks"), { recursive: true });
mkdirSync(join(root, "extensions", "character-options"), { recursive: true });
writeFileSync(join(root, "extensions", "perks", "speech-haggling.ts"), "export default {};\n");
writeFileSync(
  join(root, "extensions", "perks", "enchanting-artifact-enchanter.ts"),
  "export default {};\n",
);
writeFileSync(join(root, "extensions", "character-options", "oghma-infinium.ts"), "export default {};\n");
writeFileSync(
  join(root, "extensions", "character-options", "supernatural-vampire.ts"),
  "export default {};\n",
);
writeFileSync(
  join(root, "extensions", "character-options", "supernatural-werewolf.ts"),
  "export default {};\n",
);

const warnings = validateExtensionBindings({
  bindings,
  trees: {
    "speech.json": {
      skillId: "speech",
      perks: [{ id: "speech-haggling", name: "Haggling", extension: "speech-haggling", effects: [] }],
    },
    "enchanting.json": {
      skillId: "enchanting",
      perks: [
        {
          id: "enchanting-artifact-enchanter",
          name: "Artifact Enchanter",
          extension: "enchanting-artifact-enchanter",
          allocation: { kind: "perkPointsBudget", totalLabel: "infinity" },
          effects: [],
        },
      ],
    },
  },
  characterOptionsPath: "data/game/character-options.json",
  extensionsDir: join(root, "extensions"),
});
assert.equal(warnings.length, 0, warnings.join("\n"));

const driftWarnings = validateExtensionBindings({
  bindings,
  trees: {
    "speech.json": {
      skillId: "speech",
      perks: [{ id: "speech-haggling", name: "Haggling", extension: "speech-haggling", effects: [] }],
    },
    "enchanting.json": {
      skillId: "enchanting",
      perks: [
        {
          id: "enchanting-artifact-enchanter",
          name: "Artifact Enchanter",
          extension: "enchanting-artifact-enchanter",
          effects: [],
        },
      ],
    },
  },
  characterOptionsPath: "data/game/character-options.json",
  extensionsDir: join(root, "extensions"),
});
assert.equal(
  driftWarnings.filter((warning) => warning.includes("allocation")).length,
  1,
);

const lookup = buildPerkExtensionLookup(bindings);
assert.equal(lookup.get("speech:haggling"), "speech-haggling");

console.log("extension-bindings: ok");
