import type { GameData } from "@/data/schemas";
import type { CharacterOptionExtension, PerkExtension } from "@/extension-api";

const characterOptionModules = import.meta.glob(
  "../../extensions/character-options/!(*.test).ts",
  { eager: true },
);

const perkModules = import.meta.glob("../../extensions/perks/!(*.test).ts", {
  eager: true,
});

function loadExtensionMap<T extends { id: string }>(
  modules: Record<string, unknown>,
  kind: string,
): Map<string, T> {
  const map = new Map<string, T>();

  for (const [path, mod] of Object.entries(modules)) {
    const ext = (mod as { default: T }).default;
    if (!ext?.id) {
      throw new Error(`Extension module ${path} must default-export an object with an id`);
    }
    if (map.has(ext.id)) {
      throw new Error(`Duplicate ${kind} extension id: ${ext.id}`);
    }
    map.set(ext.id, ext);
  }

  return map;
}

const characterOptionExtensions = loadExtensionMap<CharacterOptionExtension>(
  characterOptionModules,
  "character-option",
);

const perkExtensions = loadExtensionMap<PerkExtension>(perkModules, "perk");

export function getCharacterOptionExtension(id: string): CharacterOptionExtension | undefined {
  return characterOptionExtensions.get(id);
}

export function getPerkExtension(id: string): PerkExtension | undefined {
  return perkExtensions.get(id);
}

export function getCharacterOptionExtensions(): ReadonlyMap<string, CharacterOptionExtension> {
  return characterOptionExtensions;
}

export function getPerkExtensions(): ReadonlyMap<string, PerkExtension> {
  return perkExtensions;
}

export function validateExtensionRegistry(game: GameData): void {
  const referencedCharacterOptionExtensions = new Set<string>();
  const referencedPerkExtensions = new Set<string>();

  for (const option of game.characterOptions) {
    if (!option.extension) continue;
    if (!characterOptionExtensions.has(option.extension)) {
      throw new Error(
        `character-options.json references unknown extension "${option.extension}" for option "${option.id}"`,
      );
    }
    referencedCharacterOptionExtensions.add(option.extension);
  }

  for (const tree of Object.values(game.perkTrees)) {
    for (const perk of tree.perks) {
      if (!perk.extension) continue;
      if (!perkExtensions.has(perk.extension)) {
        throw new Error(
          `Perk "${perk.id}" references unknown extension "${perk.extension}"`,
        );
      }
      referencedPerkExtensions.add(perk.extension);
    }
  }

  for (const id of characterOptionExtensions.keys()) {
    if (!referencedCharacterOptionExtensions.has(id)) {
      throw new Error(`Orphan character-option extension "${id}" is not referenced in game data`);
    }
  }

  for (const id of perkExtensions.keys()) {
    if (!referencedPerkExtensions.has(id)) {
      throw new Error(`Orphan perk extension "${id}" is not referenced in game data`);
    }
  }
}
