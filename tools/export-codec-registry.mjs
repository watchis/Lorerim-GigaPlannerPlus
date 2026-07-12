#!/usr/bin/env node
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const dataRoot = join(root, "data", "game");
const outDir = join(root, "data", "codec-registries");

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function collectPerks(manifest, index, perksRoot) {
  const perks = [];
  for (const skillId of manifest.skills) {
    const file = index[skillId];
    if (!file) continue;
    const tree = readJson(join(perksRoot, file));
    for (const perk of tree.perks) {
      perks.push(perk.id);
    }
  }
  return perks;
}

export function exportCodecRegistryFromPaths(paths) {
  const manifest = readJson(join(paths.game, "manifest.json"));
  const index = readJson(join(paths.game, "perks", "index.json"));
  return {
    version: manifest.version,
    races: readJson(join(paths.game, "races.json")).races.map((entry) => entry.id),
    birthsigns: readJson(join(paths.game, "birthsigns.json")).birthsigns.map((entry) => entry.id),
    deities: readJson(join(paths.game, "deities.json")).deities.map((entry) => entry.id),
    traits: readJson(join(paths.game, "traits.json")).traits.map((entry) => entry.id),
    skills: readJson(join(paths.game, "skills.json")).skills.map((entry) => entry.id),
    perks: collectPerks(manifest, index, join(paths.game, "perks")),
    characterOptions: readJson(join(paths.game, "character-options.json")).options.map(
      (entry) => entry.id,
    ),
    characterOptionChoices: readJson(join(paths.game, "character-options.json")).options.map(
      (entry) => entry.choices.map((choice) => choice.id),
    ),
  };
}

function exportFromGitRevision(revision) {
  const read = (relativePath) =>
    JSON.parse(execSync(`git show ${revision}:data/game/${relativePath}`, {
      cwd: root,
      encoding: "utf8",
    }));

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
    characterOptions: read("character-options.json").options.map((entry) => entry.id),
    characterOptionChoices: read("character-options.json").options.map((entry) =>
      entry.choices.map((choice) => choice.id),
    ),
  };
}

function listSnapshotVersions() {
  if (!existsSync(outDir)) return [];
  return readdirSync(outDir)
    .filter((name) => name.endsWith(".json") && name !== "index.json")
    .map((name) => name.replace(/\.json$/, ""));
}

function writeSnapshot(snapshot) {
  mkdirSync(outDir, { recursive: true });
  writeFileSync(
    join(outDir, `${snapshot.version}.json`),
    `${JSON.stringify(snapshot, null, 2)}\n`,
  );

  const versions = new Set(listSnapshotVersions());
  versions.add(snapshot.version);
  writeFileSync(
    join(outDir, "index.json"),
    `${JSON.stringify({ versions: [...versions].sort() }, null, 2)}\n`,
  );
}

function main() {
  const revisionFlag = process.argv.find((arg) => arg.startsWith("--git-rev="));
  const snapshot = revisionFlag
    ? exportFromGitRevision(revisionFlag.split("=")[1])
    : exportCodecRegistryFromPaths({ game: dataRoot });

  writeSnapshot(snapshot);
  console.log(
    `Exported codec registry for ${snapshot.version} (${snapshot.perks.length} perks)`,
  );
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
