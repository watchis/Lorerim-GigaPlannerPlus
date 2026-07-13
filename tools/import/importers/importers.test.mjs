import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { IMPORT_DOMAINS } from "../lib/import-cli.mjs";
import { mergeDomainFiles } from "../lib/import-io.mjs";
import { resolveDomainList } from "../lib/import-orchestrator.mjs";
import { importManifest } from "./manifest.mjs";
import { importTraits } from "./traits.mjs";

assert.deepEqual(IMPORT_DOMAINS, [
  "perks",
  "traits",
  "races",
  "birthsigns",
  "deities",
  "supernatural",
  "gear",
  "manifest",
]);

assert.deepEqual(resolveDomainList(["perks", "traits"]), ["perks", "traits"]);
assert.deepEqual(resolveDomainList(null), IMPORT_DOMAINS);

const context = {
  install: { installDir: mkdtempSync(join(tmpdir(), "lorerim-import-")) },
  plugins: [],
  scan: {
    spellRecords: [
      {
        edid: "Traits_TestAb",
        name: "Test Trait",
        description: "Flavor text. Bonus: +10 health.",
      },
    ],
    traitsFormList: null,
    mastersByPath: new Map(),
  },
  derived: {},
  paths: {
    dataDir: mkdtempSync(join(tmpdir(), "lorerim-data-")),
    perksDir: mkdtempSync(join(tmpdir(), "lorerim-perks-")),
    repoRoot: mkdtempSync(join(tmpdir(), "lorerim-repo-")),
  },
};

const traitResult = await importTraits(context);
assert.equal(traitResult.files.length, 1);
assert.equal(traitResult.files[0][0], "traits.json");
assert.ok(traitResult.summary.traits >= 1);

const manifestPath = join(context.paths.dataDir, "manifest.json");
writeFileSync(manifestPath, JSON.stringify({ version: "1.0.0", name: "LoreRim", limits: {}, skills: [] }));

const manifestResult = await importManifest({
  ...context,
  paths: {
    ...context.paths,
    manifestPath,
  },
});

assert.equal(manifestResult.files[0][0], "manifest.json");
assert.equal(manifestResult.files[0][1].name, "LoreRim");

const merged = mergeDomainFiles([traitResult, manifestResult]);
assert.ok(merged.files.length >= 2);

console.log("importers.test.mjs: ok");
