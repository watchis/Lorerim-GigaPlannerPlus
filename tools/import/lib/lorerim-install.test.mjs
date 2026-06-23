import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import {
  buildPluginSourceIndex,
  readEnabledMods,
  resolvePluginFile,
  resolvePluginPaths,
} from "./lorerim-install.mjs";

const root = mkdtempSync(join(tmpdir(), "giga-mo2-"));
const installDir = join(root, "Lorerim");
const profileDir = join(installDir, "profiles", "Default");
const modsDir = join(installDir, "mods");

mkdirSync(join(modsDir, "Ordinator - Perks of Skyrim"), { recursive: true });
mkdirSync(join(modsDir, "LoreRim - xEdit64 Output"), { recursive: true });
mkdirSync(profileDir, { recursive: true });

writeFileSync(
  join(modsDir, "Ordinator - Perks of Skyrim", "Ordinator - Perks of Skyrim.esp"),
  "base",
);
writeFileSync(
  join(modsDir, "LoreRim - xEdit64 Output", "Ordinator - Perks of Skyrim.esp"),
  "patched",
);
writeFileSync(
  join(modsDir, "LoreRim - xEdit64 Output", "LoreRim - Global Modifiers.esp"),
  "global",
);
writeFileSync(
  join(profileDir, "modlist.txt"),
  "+LoreRim - xEdit64 Output\n+Ordinator - Perks of Skyrim\n",
);
writeFileSync(
  join(profileDir, "loadorder.txt"),
  "Ordinator - Perks of Skyrim.esp\nLoreRim - Global Modifiers.esp\n",
);

const enabledMods = readEnabledMods(profileDir);
assert.deepEqual(enabledMods, ["LoreRim - xEdit64 Output", "Ordinator - Perks of Skyrim"]);

const pluginIndex = buildPluginSourceIndex(installDir, enabledMods);
const ordinator = resolvePluginFile(pluginIndex, "Ordinator - Perks of Skyrim.esp");
assert.equal(
  ordinator?.path,
  join(modsDir, "LoreRim - xEdit64 Output", "Ordinator - Perks of Skyrim.esp"),
);
assert.equal(ordinator?.modName, "LoreRim - xEdit64 Output");

const plugins = resolvePluginPaths(
  ["Ordinator - Perks of Skyrim.esp", "LoreRim - Global Modifiers.esp"],
  installDir,
  enabledMods,
);
assert.equal(plugins.length, 2);
assert.equal(plugins[0].modName, "LoreRim - xEdit64 Output");
assert.equal(plugins[1].modName, "LoreRim - xEdit64 Output");

console.log("lorerim-install.test.mjs: ok");
