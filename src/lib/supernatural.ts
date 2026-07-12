import type { GameData, SupernaturalForm, SupernaturalRacialBonus } from "@/data/schemas";
import type { BuildState } from "@/engine/buildEngine";

export const VAMPIRE_OPTION_ID = "vampire";
export const WEREWOLF_OPTION_ID = "werewolf";
export const LICH_OPTION_ID = "lich";
export const SUPERNATURAL_CLAIMED_CHOICE = "claimed";

export const VAMPIRE_STAGE_IDS = ["stage-1", "stage-2", "stage-3", "stage-4"] as const;
export type VampireStageId = (typeof VAMPIRE_STAGE_IDS)[number];
export const DEFAULT_VAMPIRE_STAGE: VampireStageId = "stage-1";

export const VAMPIRE_SKILL_ID = "vampire";
export const WEREWOLF_SKILL_ID = "werewolf";
export const LICH_SKILL_ID = "lich";

export const SUPERNATURAL_OPTION_IDS = [
  VAMPIRE_OPTION_ID,
  WEREWOLF_OPTION_ID,
  LICH_OPTION_ID,
] as const;

export type SupernaturalOptionId = (typeof SUPERNATURAL_OPTION_IDS)[number];

const OPTION_TO_SKILL_ID: Record<SupernaturalOptionId, string> = {
  [VAMPIRE_OPTION_ID]: VAMPIRE_SKILL_ID,
  [WEREWOLF_OPTION_ID]: WEREWOLF_SKILL_ID,
  [LICH_OPTION_ID]: LICH_SKILL_ID,
};

export function isSupernaturalPerkTreeSkillId(skillId: string): boolean {
  return (
    skillId === VAMPIRE_SKILL_ID ||
    skillId === WEREWOLF_SKILL_ID ||
    skillId === LICH_SKILL_ID
  );
}

export function isVampireStageId(choiceId: string): choiceId is VampireStageId {
  return VAMPIRE_STAGE_IDS.includes(choiceId as VampireStageId);
}

export function isSupernaturalOptionId(optionId: string): optionId is SupernaturalOptionId {
  return SUPERNATURAL_OPTION_IDS.includes(optionId as SupernaturalOptionId);
}

export function getSupernaturalSkillId(optionId: string): string | null {
  if (!isSupernaturalOptionId(optionId)) return null;
  return OPTION_TO_SKILL_ID[optionId];
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

export function isLichActive(state: BuildState): boolean {
  return state.characterOptionChoices[LICH_OPTION_ID] === SUPERNATURAL_CLAIMED_CHOICE;
}

export function hasSupernaturalCurse(state: BuildState): boolean {
  return isVampireActive(state) || isWerewolfActive(state) || isLichActive(state);
}

export function getActiveSupernaturalSkillId(state: BuildState): string | null {
  if (isVampireActive(state)) return VAMPIRE_SKILL_ID;
  if (isWerewolfActive(state)) return WEREWOLF_SKILL_ID;
  if (isLichActive(state)) return LICH_SKILL_ID;
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

export function getLichForm(game: GameData): SupernaturalForm | undefined {
  return game.supernatural.lichdom.forms.find((entry) => entry.id === "lich");
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

export function getLichRacialBonusForRace(
  game: GameData,
  raceId: string,
): SupernaturalRacialBonus | undefined {
  if (!raceId || raceId === "none") return undefined;
  return game.supernatural.lichdom.racialBonuses[raceId];
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

export function getLichRacialBonus(
  game: GameData,
  state: BuildState,
): SupernaturalRacialBonus | undefined {
  const raceId = resolveRaceId(state);
  if (!raceId || !isLichActive(state)) return undefined;
  return getLichRacialBonusForRace(game, raceId);
}

export function getOtherSupernaturalOptionIds(optionId: string): SupernaturalOptionId[] {
  if (!isSupernaturalOptionId(optionId)) return [];
  return SUPERNATURAL_OPTION_IDS.filter((id) => id !== optionId);
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

function isOptionClaimed(state: BuildState, optionId: SupernaturalOptionId): boolean {
  if (optionId === VAMPIRE_OPTION_ID) return isVampireActive(state);
  if (optionId === WEREWOLF_OPTION_ID) return isWerewolfActive(state);
  return isLichActive(state);
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

  const activeOptionId = SUPERNATURAL_OPTION_IDS.find((optionId) =>
    isOptionClaimed(next, optionId),
  );

  if (activeOptionId) {
    for (const otherOptionId of getOtherSupernaturalOptionIds(activeOptionId)) {
      if (!isOptionClaimed(next, otherOptionId)) continue;
      next = {
        ...next,
        characterOptionChoices: {
          ...next.characterOptionChoices,
          [otherOptionId]: "none",
        },
      };
      next = stripPerksForSkillTree(game, next, OPTION_TO_SKILL_ID[otherOptionId]);
    }
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
  const otherOptionIds = getOtherSupernaturalOptionIds(optionId);

  let next: BuildState = {
    ...build,
    characterOptionChoices: {
      ...build.characterOptionChoices,
      [optionId]: choiceId,
    },
  };

  if (!claimed) {
    next = stripPerksForSkillTree(game, next, OPTION_TO_SKILL_ID[optionId]);
  }

  if (claimed) {
    const clearedChoices = { ...next.characterOptionChoices };
    for (const otherOptionId of otherOptionIds) {
      clearedChoices[otherOptionId] = "none";
    }
    next = {
      ...next,
      characterOptionChoices: clearedChoices,
    };
    for (const otherOptionId of otherOptionIds) {
      next = stripPerksForSkillTree(game, next, OPTION_TO_SKILL_ID[otherOptionId]);
    }
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
