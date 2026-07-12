import type { GameData } from "@/data/schemas";
import type { CodecRegistrySnapshot } from "@/data/codecRegistrySnapshots";
import { getCodecRegistrySnapshot } from "@/data/codecRegistrySnapshots";

export interface BuildCodecRegistry {
  game: GameData;
  modpackVersion: string;
  races: readonly string[];
  birthsigns: readonly string[];
  deities: readonly string[];
  traits: readonly string[];
  skills: readonly string[];
  perks: readonly string[];
  characterOptions?: readonly string[];
  characterOptionChoices?: readonly (readonly string[])[];
  raceIndex: ReadonlyMap<string, number>;
  birthsignIndex: ReadonlyMap<string, number>;
  deityIndex: ReadonlyMap<string, number>;
  traitIndex: ReadonlyMap<string, number>;
  skillIndex: ReadonlyMap<string, number>;
  perkIndex: ReadonlyMap<string, number>;
  characterOptionIndex?: ReadonlyMap<string, number>;
}

function indexById(ids: string[]): ReadonlyMap<string, number> {
  return new Map(ids.map((id, index) => [id, index]));
}

function collectPerkIds(game: GameData): string[] {
  const ids: string[] = [];
  for (const skillId of game.manifest.skills) {
    const tree = game.perkTrees[skillId];
    if (!tree) continue;
    for (const perk of tree.perks) {
      ids.push(perk.id);
    }
  }
  return ids;
}

function createRegistryFromLists(
  game: GameData,
  lists: {
    version: string;
    races: readonly string[];
    birthsigns: readonly string[];
    deities: readonly string[];
    traits: readonly string[];
    skills: readonly string[];
    perks: readonly string[];
    characterOptions?: readonly string[];
    characterOptionChoices?: readonly (readonly string[])[];
  },
): BuildCodecRegistry {
  return {
    game,
    modpackVersion: lists.version,
    races: lists.races,
    birthsigns: lists.birthsigns,
    deities: lists.deities,
    traits: lists.traits,
    skills: lists.skills,
    perks: lists.perks,
    characterOptions: lists.characterOptions,
    characterOptionChoices: lists.characterOptionChoices,
    raceIndex: indexById([...lists.races]),
    birthsignIndex: indexById([...lists.birthsigns]),
    deityIndex: indexById([...lists.deities]),
    traitIndex: indexById([...lists.traits]),
    skillIndex: indexById([...lists.skills]),
    perkIndex: indexById([...lists.perks]),
    characterOptionIndex: lists.characterOptions
      ? indexById([...lists.characterOptions])
      : undefined,
  };
}

export function createBuildCodecRegistryFromSnapshot(
  game: GameData,
  snapshot: CodecRegistrySnapshot,
): BuildCodecRegistry {
  return createRegistryFromLists(game, snapshot);
}

export function createBuildCodecRegistryForVersion(
  game: GameData,
  modpackVersion: string,
): BuildCodecRegistry {
  const snapshot = getCodecRegistrySnapshot(modpackVersion);
  if (snapshot) {
    return createBuildCodecRegistryFromSnapshot(game, snapshot);
  }
  return createBuildCodecRegistry(game);
}

export function createBuildCodecRegistry(game: GameData): BuildCodecRegistry {
  const races = game.races.map((race) => race.id);
  const birthsigns = game.birthsigns.map((birthsign) => birthsign.id);
  const deities = game.deities.map((deity) => deity.id);
  const traits = game.traits.map((trait) => trait.id);
  const skills = game.skills.map((skill) => skill.id);
  const perks = collectPerkIds(game);

  return createRegistryFromLists(game, {
    version: game.manifest.version,
    races,
    birthsigns,
    deities,
    traits,
    skills,
    perks,
  });
}

export function lookupIndex(
  map: ReadonlyMap<string, number>,
  id: string | null | undefined,
  label: string,
): number | undefined {
  if (id === null || id === undefined) return undefined;
  const index = map.get(id);
  if (index === undefined) {
    throw new Error(`Unknown ${label}: ${id}`);
  }
  return index;
}

export function lookupId(list: readonly string[], index: number | undefined, label: string): string | null {
  if (index === undefined) return null;
  const id = list[index];
  if (id === undefined) {
    throw new Error(`Invalid ${label} index: ${index}`);
  }
  return id;
}

/** Best-effort decode lookup: returns null for missing or out-of-range indices. */
export function lookupIdSafe(list: readonly string[], index: number | undefined): string | null {
  if (index === undefined) return null;
  return list[index] ?? null;
}
