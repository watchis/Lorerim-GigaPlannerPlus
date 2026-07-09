import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  applyPerkExtensionBindings,
  defaultExtensionBindingsPath,
  loadExtensionBindings,
} from "../lib/extension-bindings.mjs";
import { resolveImportPaths } from "../lib/import-cli.mjs";

const bindings = loadExtensionBindings();
assert.ok(bindings.perks.length >= 2, "expected extension bindings from repo data");

const otherCwd = mkdtempSync(join(tmpdir(), "perks-extension-cwd-"));
const previousCwd = process.cwd();
process.chdir(otherCwd);
try {
  const fromWrongCwd = loadExtensionBindings("data/game/extension-bindings.json");
  assert.equal(fromWrongCwd.perks.length, 0, "relative bindings path should fail outside repo root");

  const fromAbsolute = loadExtensionBindings(defaultExtensionBindingsPath());
  assert.ok(fromAbsolute.perks.length >= 2, "absolute bindings path should load from any cwd");
} finally {
  process.chdir(previousCwd);
}

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
    ],
  },
};

const importPaths = resolveImportPaths();
const { applied } = applyPerkExtensionBindings(trees, loadExtensionBindings(importPaths.extensionBindingsPath));
assert.equal(applied, 1);
assert.equal(trees["speech.json"].perks[0].extension, "speech-haggling");

console.log("perks-extension.test.mjs: ok");
