import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  exportCodecRegistryFromPaths,
  shouldExportCodecRegistry,
  writeCodecRegistrySnapshot,
} from "./export-codec-registry.mjs";

const repoRoot = mkdtempSync(join(tmpdir(), "codec-registry-repo-"));
const gameDir = join(repoRoot, "data", "game");
mkdirSync(join(gameDir, "perks"), { recursive: true });

writeFileSync(
  join(gameDir, "manifest.json"),
  JSON.stringify({
    version: "9.9.9.9",
    skills: ["block"],
  }),
);
writeFileSync(join(gameDir, "skills.json"), JSON.stringify({ skills: [{ id: "block" }] }));
writeFileSync(join(gameDir, "races.json"), JSON.stringify({ races: [{ id: "nord" }] }));
writeFileSync(join(gameDir, "birthsigns.json"), JSON.stringify({ birthsigns: [{ id: "lover" }] }));
writeFileSync(join(gameDir, "deities.json"), JSON.stringify({ deities: [{ id: "none" }] }));
writeFileSync(join(gameDir, "traits.json"), JSON.stringify({ traits: [{ id: "athletic" }] }));
writeFileSync(
  join(gameDir, "character-options.json"),
  JSON.stringify({
    options: [{ id: "oghma-infinium", choices: [{ id: "none" }, { id: "claimed" }] }],
  }),
);
writeFileSync(join(gameDir, "perks", "index.json"), JSON.stringify({ block: "block.json" }));
writeFileSync(
  join(gameDir, "perks", "block.json"),
  JSON.stringify({
    perks: [{ id: "block-improved-blocking" }],
  }),
);

const snapshot = exportCodecRegistryFromPaths({ game: gameDir });
assert.equal(snapshot.version, "9.9.9.9");
assert.deepEqual(snapshot.skills, ["block"]);
assert.deepEqual(snapshot.perks, ["block-improved-blocking"]);
assert.deepEqual(snapshot.characterOptions, ["oghma-infinium"]);
assert.deepEqual(snapshot.characterOptionChoices, [["none", "claimed"]]);

const written = writeCodecRegistrySnapshot({ snapshot, repoRoot });
const index = JSON.parse(
  readFileSync(join(repoRoot, "data", "codec-registries", "index.json"), "utf8"),
);
assert.ok(index.versions.includes("9.9.9.9"));
assert.equal(written.perkCount, 1);

assert.equal(
  shouldExportCodecRegistry({ previousVersion: "5.0.3.6", modpackVersion: "5.0.4.2" }),
  true,
);
assert.equal(
  shouldExportCodecRegistry({ previousVersion: "5.0.4.2", modpackVersion: "5.0.4.2" }),
  false,
);
assert.equal(shouldExportCodecRegistry({ previousVersion: null, modpackVersion: "5.0.4.2" }), true);

console.log("export-codec-registry.test.mjs: ok");
