import type { GameData } from "@/data/schemas";
import { LEGACY_OGHMA_CHOICE_MAP } from "@/lib/oghmaLegacyChoices";
import type { BuildState } from "@/engine/buildEngine";

export const OGHMA_INFINIUM_OPTION_ID = "oghma-infinium";
export const OGHMA_INFINIUM_CLAIMED_CHOICE = "claimed";

/** Legacy path presets migrated from older warrior/mage/thief choices. */
export const LEGACY_OGHMA_PATH_SKILLS: Record<string, readonly string[]> = {
  warrior: ["one-handed", "two-handed", "block", "heavy-armor", "smithing", "enchanting"],
  mage: [
    "destruction",
    "conjuration",
    "alteration",
    "illusion",
    "restoration",
    "enchanting",
  ],
  thief: ["sneak", "evasion", "finesse", "wayfarer", "speech", "alchemy"],
};

export function isOghmaInfiniumActive(state: BuildState): boolean {
  return (
    state.characterOptionChoices[OGHMA_INFINIUM_OPTION_ID] === OGHMA_INFINIUM_CLAIMED_CHOICE
  );
}

export function getOghmaSkillLimit(game: GameData): number {
  return game.mechanics.oghmaInfinium?.maxSkills ?? 6;
}

export function getOghmaFreeSkillLevels(game: GameData): number {
  return game.mechanics.oghmaInfinium?.freeSkillLevels ?? 5;
}

export function getOghmaPerkPointBonus(game: GameData): number {
  return game.mechanics.oghmaInfinium?.perkPoints ?? 3;
}

export function getActiveOghmaSkillIds(state: BuildState): string[] {
  if (!isOghmaInfiniumActive(state)) return [];
  return state.oghmaSkillIds;
}

export function isOghmaSkillActive(state: BuildState, skillId: string): boolean {
  return getActiveOghmaSkillIds(state).includes(skillId);
}

export function getOghmaFloorBonus(game: GameData, state: BuildState, skillId: string): number {
  if (!isOghmaSkillActive(state, skillId)) return 0;
  return getOghmaFreeSkillLevels(game);
}

export function migrateOghmaInfiniumBuild(_game: GameData, build: BuildState): BuildState {
  let choice = build.characterOptionChoices[OGHMA_INFINIUM_OPTION_ID];
  if (choice && LEGACY_OGHMA_CHOICE_MAP[choice]) {
    choice = LEGACY_OGHMA_CHOICE_MAP[choice];
  }
  if (!choice || choice === "none" || choice === OGHMA_INFINIUM_CLAIMED_CHOICE) {
    return { ...build, oghmaSkillIds: build.oghmaSkillIds ?? [] };
  }

  const legacySkills = LEGACY_OGHMA_PATH_SKILLS[choice];
  if (!legacySkills) {
    return {
      ...build,
      oghmaSkillIds: build.oghmaSkillIds ?? [],
      characterOptionChoices: {
        ...build.characterOptionChoices,
        [OGHMA_INFINIUM_OPTION_ID]: "none",
      },
    };
  }

  return {
    ...build,
    oghmaSkillIds:
      build.oghmaSkillIds && build.oghmaSkillIds.length > 0
        ? build.oghmaSkillIds
        : [...legacySkills],
    characterOptionChoices: {
      ...build.characterOptionChoices,
      [OGHMA_INFINIUM_OPTION_ID]: OGHMA_INFINIUM_CLAIMED_CHOICE,
    },
  };
}
