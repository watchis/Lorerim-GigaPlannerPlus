import type { GameData } from "@/data/schemas";

export interface BuildCodecRegistry {
  game: GameData;
  modpackVersion: string;
  races: readonly string[];
  birthsigns: readonly string[];
  deities: readonly string[];
  traits: readonly string[];
  skills: readonly string[];
  perks: readonly string[];
  characterOptions: readonly string[];
  characterOptionChoices: readonly (readonly string[])[];
  raceIndex: ReadonlyMap<string, number>;
  birthsignIndex: ReadonlyMap<string, number>;
  deityIndex: ReadonlyMap<string, number>;
  traitIndex: ReadonlyMap<string, number>;
  skillIndex: ReadonlyMap<string, number>;
  perkIndex: ReadonlyMap<string, number>;
  characterOptionIndex: ReadonlyMap<string, number>;
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

export function createBuildCodecRegistry(game: GameData): BuildCodecRegistry {
  const races = game.races.map((race) => race.id);
  const birthsigns = game.birthsigns.map((birthsign) => birthsign.id);
  const deities = game.deities.map((deity) => deity.id);
  const traits = game.traits.map((trait) => trait.id);
  const skills = game.skills.map((skill) => skill.id);
  const perks = collectPerkIds(game);
  const characterOptions = game.characterOptions.map((option) => option.id);
  const characterOptionChoices = game.characterOptions.map((option) =>
    option.choices.map((choice) => choice.id),
  );

  return {
    game,
    modpackVersion: game.manifest.version,
    races,
    birthsigns,
    deities,
    traits,
    skills,
    perks,
    characterOptions,
    characterOptionChoices,
    raceIndex: indexById(races),
    birthsignIndex: indexById(birthsigns),
    deityIndex: indexById(deities),
    traitIndex: indexById(traits),
    skillIndex: indexById(skills),
    perkIndex: indexById(perks),
    characterOptionIndex: indexById(characterOptions),
  };
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

export function lookupCharacterOptionChoiceIndex(
  registry: BuildCodecRegistry,
  optionId: string,
  choiceId: string,
): number {
  const optionIndex = lookupIndex(registry.characterOptionIndex, optionId, "character option");
  const choices = registry.characterOptionChoices[optionIndex!];
  const choiceIndex = choices.indexOf(choiceId);
  if (choiceIndex === -1) {
    throw new Error(`Unknown character option choice: ${optionId}/${choiceId}`);
  }
  return choiceIndex;
}

export function lookupCharacterOptionChoiceId(
  registry: BuildCodecRegistry,
  optionIndex: number,
  choiceIndex: number,
): string {
  const optionId = lookupId(registry.characterOptions, optionIndex, "character option");
  const choices = registry.characterOptionChoices[optionIndex];
  const choiceId = choices?.[choiceIndex];
  if (!optionId || choiceId === undefined) {
    throw new Error(`Invalid character option choice index: ${optionIndex}/${choiceIndex}`);
  }
  return choiceId;
}

export function lookupCharacterOptionChoiceIdSafe(
  registry: BuildCodecRegistry,
  optionIndex: number,
  choiceIndex: number,
): string | null {
  const optionId = lookupIdSafe(registry.characterOptions, optionIndex);
  if (!optionId) return null;
  return registry.characterOptionChoices[optionIndex]?.[choiceIndex] ?? null;
}
