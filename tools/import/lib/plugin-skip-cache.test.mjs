import assert from "node:assert/strict";
import { mkdirSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import {
  filterPluginsForImport,
  loadSkipCache,
  saveSkipCache,
} from "./plugin-skip-cache.mjs";

const root = mkdtempSync(join(tmpdir(), "giga-skip-cache-"));
const cachePath = join(root, "cache.json");
const pluginsDir = join(root, "plugins");
mkdirSync(pluginsDir, { recursive: true });

writeFileSync(join(pluginsDir, "MeshOnly.esp"), "mesh");
writeFileSync(join(pluginsDir, "HasPerk.esp"), "perk");

const meshPlugin = {
  pluginName: "MeshOnly.esp",
  path: join(pluginsDir, "MeshOnly.esp"),
  modName: "Test Mod",
};
const perkPlugin = {
  pluginName: "HasPerk.esp",
  path: join(pluginsDir, "HasPerk.esp"),
  modName: "Test Mod",
};

const classifyCalls = [];
async function mockClassify(path) {
  classifyCalls.push(path);
  if (path.endsWith("MeshOnly.esp")) {
    return { hasMechanics: false, recordTypes: [] };
  }
  return { hasMechanics: true, recordTypes: ["PERK"] };
}

const { toScan, skipped } = await filterPluginsForImport([meshPlugin, perkPlugin], {
  cachePath,
  rescanAll: true,
  classifyFn: mockClassify,
});

assert.equal(skipped.length, 1);
assert.equal(skipped[0].pluginName, "MeshOnly.esp");
assert.equal(toScan.length, 1);
assert.equal(toScan[0].pluginName, "HasPerk.esp");
assert.ok(existsSync(cachePath));

const cache = loadSkipCache(cachePath);
assert.ok(cache.plugins["meshonly.esp"]);

classifyCalls.length = 0;
const cachedRun = await filterPluginsForImport([meshPlugin, perkPlugin], {
  cachePath,
  classifyFn: mockClassify,
});

assert.equal(cachedRun.skipped.length, 1);
assert.equal(cachedRun.skipped[0].reason, "cached-non-mechanics");
assert.equal(cachedRun.toScan.length, 1);
assert.equal(classifyCalls.length, 1, "cached mesh plugin should not be reclassified");

saveSkipCache({ version: 1, plugins: { test: { size: 1, mtimeMs: 1 } } }, cachePath);
const written = JSON.parse(readFileSync(cachePath, "utf8"));
assert.ok(written.plugins.test);

console.log("plugin-skip-cache.test.mjs: ok");
