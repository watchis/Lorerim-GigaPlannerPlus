import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import {
  compareLoadOrderSources,
  parsePluginsTxtContent,
  readPluginsTxtFromPath,
  resolvePluginLoadOrder,
} from "./lorerim-install.mjs";

assert.deepEqual(
  parsePluginsTxtContent(`
# comment
*Skyrim.esm
*Update.esm
SomeDisabled.esp
*Ordinator - Perks of Skyrim.esp
`),
  ["Skyrim.esm", "Update.esm", "Ordinator - Perks of Skyrim.esp"],
);

const root = mkdtempSync(join(tmpdir(), "giga-plugins-txt-"));
const installDir = join(root, "Lorerim");
const profileDir = join(installDir, "profiles", "Default");
mkdirSync(join(installDir, "Stock Game", "Data"), { recursive: true });
mkdirSync(profileDir, { recursive: true });

writeFileSync(
  join(profileDir, "plugins.txt"),
  "*Alpha.esp\nBeta.esp\n*Gamma.esp\n",
);
writeFileSync(join(profileDir, "loadorder.txt"), "Alpha.esp\nGamma.esp\n");

const fromProfile = readPluginsTxtFromPath(join(profileDir, "plugins.txt"));
assert.deepEqual(fromProfile, ["Alpha.esp", "Gamma.esp"]);

const resolved = resolvePluginLoadOrder(installDir, profileDir);
assert.equal(resolved.source, "plugins.txt");
assert.deepEqual(resolved.loadOrder, ["Alpha.esp", "Gamma.esp"]);

assert.equal(compareLoadOrderSources(["Alpha.esp", "Gamma.esp"], join(profileDir, "loadorder.txt")), null);

writeFileSync(join(profileDir, "loadorder.txt"), "Gamma.esp\nAlpha.esp\n");
const mismatch = compareLoadOrderSources(
  ["Alpha.esp", "Gamma.esp"],
  join(profileDir, "loadorder.txt"),
);
assert.equal(mismatch?.kind, "order-mismatch");
assert.equal(mismatch?.index, 0);

const fallbackProfile = mkdtempSync(join(tmpdir(), "giga-loadorder-fallback-"));
mkdirSync(fallbackProfile, { recursive: true });
writeFileSync(join(fallbackProfile, "loadorder.txt"), "Only.esp\n");
const fallback = resolvePluginLoadOrder(installDir, fallbackProfile);
assert.equal(fallback.source, "loadorder.txt");
assert.deepEqual(fallback.loadOrder, ["Only.esp"]);

console.log("plugins-txt.test.mjs: ok");
