import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { transformStandingStoneRecords } from "./lorerim-transform.mjs";

const dir = mkdtempSync(join(tmpdir(), "giga-transform-progress-"));
const birthsignsPath = join(dir, "birthsigns.json");
writeFileSync(birthsignsPath, JSON.stringify({ birthsigns: [] }));

const progress = [];
transformStandingStoneRecords([], [], birthsignsPath, {
  onProgress(category, name) {
    progress.push(`${category} [${name}]`);
  },
});

assert.ok(progress.some((entry) => entry === "Birthsigns [Apprentice]"));
assert.ok(progress.some((entry) => entry === "Birthsigns [Warrior]"));

console.log("lorerim-transform-progress.test.mjs: ok");
