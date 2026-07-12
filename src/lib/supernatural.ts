import type { GameData, SupernaturalForm, SupernaturalRacialBonus } from "@/data/schemas";
import type { BuildState } from "@/engine/buildEngine";
import { getSelectedCharacterOptionChoice } from "@/lib/characterOptions";

export const VAMPIRE_OPTION_ID = "vampire";
export const WEREWOLF_OPTION_ID = "werewolf";
export const SUPERNATURAL_CLAIMED_CHOICE = "claimed";

export const VAMPIRE_STAGE_IDS = ["stage-1", "stage-2", "stage-3", "stage-4"] as const;
export type VampireStageId = (typeof VAMPIRE_STAGE_IDS)[number];
export const DEFAULT_VAMPIRE_STAGE: VampireStageId = "stage-1";

export const VAMPIRE_SKILL_ID = "vampire";
export const WEREWOLF_SKILL_ID = "werewolf";

export const SUPERNATURAL_OPTION_IDS = [VAMPIRE_OPTION_ID, WEREWOLF_OPTION_ID] as const;

export function isVampireStageId(choiceId: string): choiceId is VampireStageId {
  return VAMPIRE_STAGE_IDS.includes(choiceId as VampireStageId);
}

export function isSupernaturalOptionId(optionId: string): boolean {
  return SUPERNATURAL_OPTION_IDS.includes(optionId as (typeof SUPERNATURAL_OPTION_IDS)[number]);
}

/** Vampire hunger stage change while the curse is already active (no perk/trait/floor churn). */
export function isVampireStageOnlyChange(
  build: BuildState,
  optionId: string,
  choiceId: string,
): boolean {
  return (
    optionId === VAMPIRE_OPTION_ID &&
    isVampireActive(build) &&
    isVampireStageId(choiceId)
  );
}

export function getVampireChoiceId(state: BuildState): string {
  return state.characterOptionChoices[VAMPIRE_OPTION_ID] ?? "none";
}

export function isVampireActive(state: BuildState): boolean {
  return isVampireStageId(getVampireChoiceId(state));
}

export function isWerewolfActive(state: BuildState): boolean {
  return state.characterOptionChoices[WEREWOLF_OPTION_ID] === SUPERNATURAL_CLAIMED_CHOICE;
}

export function hasSupernaturalCurse(state: BuildState): boolean {
  return isVampireActive(state) || isWerewolfActive(state);
}

export function getActiveSupernaturalSkillId(state: BuildState): string | null {
  if (isVampireActive(state)) return VAMPIRE_SKILL_ID;
  if (isWerewolfActive(state)) return WEREWOLF_SKILL_ID;
  return null;
}

function resolveRaceId(state: BuildState): string | null {
  return state.raceId && state.raceId !== "none" ? state.raceId : null;
}

export function getVampireStage(
  game: GameData,
  stageId: string,
): SupernaturalForm | undefined {
  if (!isVampireStageId(stageId)) return undefined;
  return game.supernatural.vampirism.stages.find((entry) => entry.id === stageId);
}

export function getActiveVampireStage(
  game: GameData,
  state: BuildState,
): SupernaturalForm | undefined {
  const stageId = getVampireChoiceId(state);
  return getVampireStage(game, stageId);
}

const VAMPIRE_STAGE_REWARD_LABEL_KEYS: Record<VampireStageId, string> = {
  "stage-1": "vampireStage1Reward",
  "stage-2": "vampireStage2Reward",
  "stage-3": "vampireStage3Reward",
  "stage-4": "vampireStage4Reward",
};

const VAMPIRE_STAGE_REWARD_FALLBACKS: Record<VampireStageId, string> = {
  "stage-1": "Fed Vampire",
  "stage-2": "Hungry Vampire",
  "stage-3": "Starving Vampire",
  "stage-4": "Blood Starved Vampire",
};

export function getVampireStageRewardLabel(
  stageId: string,
  labels?: Record<string, string>,
): string | undefined {
  if (!isVampireStageId(stageId)) return undefined;
  const labelKey = VAMPIRE_STAGE_REWARD_LABEL_KEYS[stageId];
  return labels?.[labelKey] ?? VAMPIRE_STAGE_REWARD_FALLBACKS[stageId];
}

export function getWerewolfForm(game: GameData): SupernaturalForm | undefined {
  return game.supernatural.lycanthropy.forms.find((entry) => entry.id === "werewolf");
}

export function getVampireRacialBonusForRace(
  game: GameData,
  raceId: string,
): SupernaturalRacialBonus | undefined {
  if (!raceId || raceId === "none") return undefined;
  return game.supernatural.vampirism.racialBonuses[raceId];
}

export function getWerewolfRacialBonusForRace(
  game: GameData,
  raceId: string,
): SupernaturalRacialBonus | undefined {
  if (!raceId || raceId === "none") return undefined;
  return game.supernatural.lycanthropy.racialBonuses[raceId];
}

export function getVampireRacialBonus(
  game: GameData,
  state: BuildState,
): SupernaturalRacialBonus | undefined {
  const raceId = resolveRaceId(state);
  if (!raceId || !isVampireActive(state)) return undefined;
  return getVampireRacialBonusForRace(game, raceId);
}

export function getWerewolfRacialBonus(
  game: GameData,
  state: BuildState,
): SupernaturalRacialBonus | undefined {
  const raceId = resolveRaceId(state);
  if (!raceId || !isWerewolfActive(state)) return undefined;
  return getWerewolfRacialBonusForRace(game, raceId);
}

export function getOtherSupernaturalOptionId(optionId: string): string | null {
  if (optionId === VAMPIRE_OPTION_ID) return WEREWOLF_OPTION_ID;
  if (optionId === WEREWOLF_OPTION_ID) return VAMPIRE_OPTION_ID;
  return null;
}

export function isTraitBlockedBySupernatural(
  game: GameData,
  state: BuildState,
  traitId: string,
): boolean {
  if (!hasSupernaturalCurse(state)) return false;
  return game.supernatural.incompatibleTraitIds.includes(traitId);
}

export function stripPerksForSkillTree(
  game: GameData,
  build: BuildState,
  skillId: string,
): BuildState {
  const tree = game.perkTrees[skillId];
  if (!tree) return build;

  const perkIds = new Set(tree.perks.map((perk) => perk.id));
  return {
    ...build,
    selectedPerkIds: build.selectedPerkIds.filter((perkId) => !perkIds.has(perkId)),
  };
}

export function normalizeSupernaturalState(game: GameData, build: BuildState): BuildState {
  let next = { ...build };

  const vampireChoice = next.characterOptionChoices[VAMPIRE_OPTION_ID];
  if (vampireChoice === SUPERNATURAL_CLAIMED_CHOICE) {
    next = {
      ...next,
      characterOptionChoices: {
        ...next.characterOptionChoices,
        [VAMPIRE_OPTION_ID]: "stage-4",
      },
    };
  }

  const vampireActive = isVampireActive(next);
  const werewolfActive = isWerewolfActive(next);

  if (vampireActive && werewolfActive) {
    next = {
      ...next,
      characterOptionChoices: {
        ...next.characterOptionChoices,
        [WEREWOLF_OPTION_ID]: "none",
      },
    };
    next = stripPerksForSkillTree(game, next, WEREWOLF_SKILL_ID);
  }

  const traitIds = next.traitIds.filter(
    (traitId) => !isTraitBlockedBySupernatural(game, next, traitId),
  );

  return {
    ...next,
    traitIds,
  };
}

export function applySupernaturalOptionChange(
  game: GameData,
  build: BuildState,
  optionId: string,
  choiceId: string,
): BuildState {
  if (!isSupernaturalOptionId(optionId)) {
    return build;
  }

  const option = game.characterOptions.find((entry) => entry.id === optionId);
  if (!option) return build;

  const claimed = choiceId !== option.defaultChoice;
  const otherOptionId = getOtherSupernaturalOptionId(optionId);

  let next: BuildState = {
    ...build,
    characterOptionChoices: {
      ...build.characterOptionChoices,
      [optionId]: choiceId,
    },
  };

  if (!claimed) {
    const skillId = optionId === VAMPIRE_OPTION_ID ? VAMPIRE_SKILL_ID : WEREWOLF_SKILL_ID;
    next = stripPerksForSkillTree(game, next, skillId);
  }

  if (claimed && otherOptionId) {
    next = {
      ...next,
      characterOptionChoices: {
        ...next.characterOptionChoices,
        [otherOptionId]: "none",
      },
    };
    const otherSkillId =
      otherOptionId === VAMPIRE_OPTION_ID ? VAMPIRE_SKILL_ID : WEREWOLF_SKILL_ID;
    next = stripPerksForSkillTree(game, next, otherSkillId);
  }

  return normalizeSupernaturalState(game, next);
}

export function migrateLegacySupernaturalBuild(build: BuildState): BuildState {
  const legacy = build as BuildState & {
    vampirismId?: string;
    lycanthropyId?: string;
  };

  if (!legacy.vampirismId && !legacy.lycanthropyId) {
    return build;
  }

  const characterOptionChoices = { ...build.characterOptionChoices };

  if (legacy.vampirismId && legacy.vampirismId !== "none") {
    const stageId = isVampireStageId(legacy.vampirismId)
      ? legacy.vampirismId
      : DEFAULT_VAMPIRE_STAGE;
    characterOptionChoices[VAMPIRE_OPTION_ID] = stageId;
  }
  if (legacy.lycanthropyId && legacy.lycanthropyId !== "none") {
    characterOptionChoices[WEREWOLF_OPTION_ID] = SUPERNATURAL_CLAIMED_CHOICE;
  }

  const { vampirismId, lycanthropyId, ...rest } = legacy;
  void vampirismId;
  void lycanthropyId;

  return {
    ...rest,
    characterOptionChoices,
  };
}
