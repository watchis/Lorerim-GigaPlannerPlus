import type { GameData, SupernaturalForm } from "@/data/schemas";
import type { BuildState } from "@/engine/buildEngine";

export const VAMPIRISM_NONE_ID = "none";
export const LYCANTHROPY_NONE_ID = "none";

export function isVampirismActive(state: BuildState): boolean {
  return (state.vampirismId ?? VAMPIRISM_NONE_ID) !== VAMPIRISM_NONE_ID;
}

export function isLycanthropyActive(state: BuildState): boolean {
  return (state.lycanthropyId ?? LYCANTHROPY_NONE_ID) !== LYCANTHROPY_NONE_ID;
}

export function hasSupernaturalCurse(state: BuildState): boolean {
  return isVampirismActive(state) || isLycanthropyActive(state);
}

export function getVampirismStage(
  game: GameData,
  vampirismId: string | undefined,
): SupernaturalForm | undefined {
  const id = vampirismId ?? VAMPIRISM_NONE_ID;
  return game.supernatural.vampirism.stages.find((stage) => stage.id === id);
}

export function getLycanthropyForm(
  game: GameData,
  lycanthropyId: string | undefined,
): SupernaturalForm | undefined {
  const id = lycanthropyId ?? LYCANTHROPY_NONE_ID;
  return game.supernatural.lycanthropy.forms.find((form) => form.id === id);
}

export function isTraitBlockedBySupernatural(game: GameData, state: BuildState, traitId: string): boolean {
  if (!hasSupernaturalCurse(state)) return false;
  return game.supernatural.incompatibleTraitIds.includes(traitId);
}

export function normalizeSupernaturalState(game: GameData, build: BuildState): BuildState {
  const vampirismStages = game.supernatural.vampirism.stages;
  const lycanthropyForms = game.supernatural.lycanthropy.forms;

  let vampirismId = build.vampirismId ?? VAMPIRISM_NONE_ID;
  let lycanthropyId = build.lycanthropyId ?? LYCANTHROPY_NONE_ID;

  if (!vampirismStages.some((stage) => stage.id === vampirismId)) {
    vampirismId = VAMPIRISM_NONE_ID;
  }
  if (!lycanthropyForms.some((form) => form.id === lycanthropyId)) {
    lycanthropyId = LYCANTHROPY_NONE_ID;
  }

  if (isVampirismActive({ ...build, vampirismId }) && isLycanthropyActive({ ...build, lycanthropyId })) {
    lycanthropyId = LYCANTHROPY_NONE_ID;
  }

  const traitIds = build.traitIds.filter(
    (traitId) => !isTraitBlockedBySupernatural(game, { ...build, vampirismId, lycanthropyId }, traitId),
  );

  return {
    ...build,
    vampirismId,
    lycanthropyId,
    traitIds,
  };
}

export function applyVampirismSelection(
  game: GameData,
  build: BuildState,
  vampirismId: string,
): BuildState {
  const normalizedId = game.supernatural.vampirism.stages.some((stage) => stage.id === vampirismId)
    ? vampirismId
    : VAMPIRISM_NONE_ID;

  return normalizeSupernaturalState(game, {
    ...build,
    vampirismId: normalizedId,
    lycanthropyId:
      normalizedId !== VAMPIRISM_NONE_ID ? LYCANTHROPY_NONE_ID : build.lycanthropyId ?? LYCANTHROPY_NONE_ID,
  });
}

export function applyLycanthropySelection(
  game: GameData,
  build: BuildState,
  lycanthropyId: string,
): BuildState {
  const normalizedId = game.supernatural.lycanthropy.forms.some((form) => form.id === lycanthropyId)
    ? lycanthropyId
    : LYCANTHROPY_NONE_ID;

  return normalizeSupernaturalState(game, {
    ...build,
    lycanthropyId: normalizedId,
    vampirismId:
      normalizedId !== LYCANTHROPY_NONE_ID ? VAMPIRISM_NONE_ID : build.vampirismId ?? VAMPIRISM_NONE_ID,
  });
}
