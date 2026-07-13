import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const importLibRoot = dirname(fileURLToPath(import.meta.url));
const defaultRepoRoot = join(importLibRoot, "..", "..", "..");

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

function collectCharacterOptions(game) {
  const path = join(game, "character-options.json");
  if (!existsSync(path)) return {};
  const options = readJson(path).options ?? [];
  return {
    characterOptions: options.map((option) => option.id),
    characterOptionChoices: options.map((option) =>
      (option.choices ?? []).map((choice) => choice.id),
    ),
  };
}

export function exportCodecRegistryFromPaths({ game }) {
  const manifest = readJson(join(game, "manifest.json"));
  const index = readJson(join(game, "perks", "index.json"));
  return {
    version: manifest.version,
    races: readJson(join(game, "races.json")).races.map((entry) => entry.id),
    birthsigns: readJson(join(game, "birthsigns.json")).birthsigns.map((entry) => entry.id),
    deities: readJson(join(game, "deities.json")).deities.map((entry) => entry.id),
    traits: readJson(join(game, "traits.json")).traits.map((entry) => entry.id),
    skills: readJson(join(game, "skills.json")).skills.map((entry) => entry.id),
    perks: collectPerks(manifest, index, join(game, "perks")),
    ...collectCharacterOptions(game),
  };
}

function listSnapshotVersions(outDir) {
  if (!existsSync(outDir)) return [];
  return readdirSync(outDir)
    .filter((name) => name.endsWith(".json") && name !== "index.json")
    .map((name) => name.replace(/\.json$/, ""));
}

export function writeCodecRegistrySnapshot({ snapshot, repoRoot = defaultRepoRoot }) {
  const outDir = join(repoRoot, "data", "codec-registries");
  mkdirSync(outDir, { recursive: true });
  writeFileSync(
    join(outDir, `${snapshot.version}.json`),
    `${JSON.stringify(snapshot, null, 2)}\n`,
  );

  const versions = new Set(listSnapshotVersions(outDir));
  versions.add(snapshot.version);
  writeFileSync(
    join(outDir, "index.json"),
    `${JSON.stringify({ versions: [...versions].sort() }, null, 2)}\n`,
  );

  return {
    outDir,
    version: snapshot.version,
    perkCount: snapshot.perks.length,
  };
}

export function shouldExportCodecRegistry({ previousVersion, modpackVersion }) {
  const next = modpackVersion?.trim();
  if (!next) return false;
  const previous = previousVersion?.trim() ?? "";
  return next !== previous;
}

export function exportCodecRegistry({ gameDir, repoRoot = defaultRepoRoot }) {
  const snapshot = exportCodecRegistryFromPaths({ game: gameDir });
  // Preserve existing option order/indices when refreshing the same modpack version.
  const existingPath = join(repoRoot, "data", "codec-registries", `${snapshot.version}.json`);
  if (existsSync(existingPath)) {
    const existing = readJson(existingPath);
    if (Array.isArray(existing.characterOptions)) {
      snapshot.characterOptions = existing.characterOptions;
    }
    if (Array.isArray(existing.characterOptionChoices)) {
      snapshot.characterOptionChoices = existing.characterOptionChoices;
    }
  }
  return writeCodecRegistrySnapshot({ snapshot, repoRoot });
}
