#!/usr/bin/env node
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";
import {
  exportCodecRegistry,
  writeCodecRegistrySnapshot,
} from "./import/lib/export-codec-registry.mjs";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const dataRoot = join(repoRoot, "data", "game");

function exportFromGitRevision(revision) {
  const read = (relativePath) =>
    JSON.parse(
      execSync(`git show ${revision}:data/game/${relativePath}`, {
        cwd: repoRoot,
        encoding: "utf8",
      }),
    );

  const manifest = read("manifest.json");
  const index = read("perks/index.json");
  const perks = [];
  for (const skillId of manifest.skills) {
    const file = index[skillId];
    if (!file) continue;
    const tree = read(`perks/${file}`);
    for (const perk of tree.perks) {
      perks.push(perk.id);
    }
  }

  return {
    version: manifest.version,
    races: read("races.json").races.map((entry) => entry.id),
    birthsigns: read("birthsigns.json").birthsigns.map((entry) => entry.id),
    deities: read("deities.json").deities.map((entry) => entry.id),
    traits: read("traits.json").traits.map((entry) => entry.id),
    skills: read("skills.json").skills.map((entry) => entry.id),
    perks,
  };
}

function main() {
  const revisionFlag = process.argv.find((arg) => arg.startsWith("--git-rev="));
  if (revisionFlag) {
    const snapshot = exportFromGitRevision(revisionFlag.split("=")[1]);
    const result = writeCodecRegistrySnapshot({ snapshot, repoRoot });
    console.log(`Exported codec registry for ${result.version} (${result.perkCount} perks)`);
    return;
  }

  const result = exportCodecRegistry({ gameDir: dataRoot, repoRoot });
  console.log(`Exported codec registry for ${result.version} (${result.perkCount} perks)`);
}

main();
