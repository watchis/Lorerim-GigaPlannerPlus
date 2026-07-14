import type { GameData, Mechanics, Perk, PerkTree, Race, SkillLevelBaseline } from "@/data/schemas";
import {
  normalizeCharacterOptionChoices,
} from "@/lib/characterOptions";
import {
  collectBuildChanges,
  sumCollectedBudgetEffects,
} from "@/lib/buildModifications";
import { createBuildEvaluation, type BuildEvaluation } from "@/lib/buildEvaluation";
import {
  aggregateEffects,
  computeTrackedStats,
  type TrackedStatEntry,
} from "@/lib/trackedStats";
import type { ConditionalBonusEntry } from "@/lib/conditionalBonuses";
import {
  clampTrainingRangeCount,
  computeTrainingSkillPointCredit,
  getSkillLevelRequiredForTrainingRanges,
  getSkillTrainingRanges,
  getTrainingTierDefinitions,
  migrateLegacySkillTrainingCounts,
  normalizeTrainingRangesForSkill,
  sumTrainingRanges,
} from "@/lib/skillTraining";
import {
  getFrontPerkIdAtPosition,
  getNextRankInStack,
  getVisiblePerkInStack,
  resolvePerkTakeTarget,
  sortPerkStack,
} from "@/lib/perkTreeGrid";
import { meaningfulPlayerLevelReq } from "@/lib/perkRequirements";
import {
  getBypassSkillIncreaseGrantBonus,
  getSkillLevelGrantBonus,
  getSkillLevelGrantFloorBonus,
  getSkillLevelGrantFreeTopLevels,
} from "@/lib/skillLevelGrants";
import {
  getOghmaSkillLimit,
  getOghmaFloorBonus,
  migrateOghmaInfiniumBuild,
} from "@/lib/oghmaInfinium";
import {
  isTraitBlockedBySupernatural,
  LICH_SKILL_ID,
  migrateLegacySupernaturalBuild,
  normalizeSupernaturalState,
} from "@/lib/supernatural";
export {
  formatTrainingTierRange,
  getMaxTrainingSkillLevel,
  getSkillTrainingRanges,
  getTrainingTierDefinitions,
} from "@/lib/skillTraining";

export interface Attributes {
  health: number;
  magicka: number;
  stamina: number;
}

export interface BuildState {
  raceId: string | null;
  birthsignId: string | null;
  deityId: string | null;
  traitIds: string[];
  majorSkillIds: string[];
  minorSkillIds: string[];
  oghmaSkillIds: string[];
  attributeBonus: Attributes;
  characterOptionChoices: Record<string, string>;
  selectedPerkIds: string[];
  skillLevels: Record<string, number>;
  /** Trained level counts per cost tier (parallel to training tier definitions). */
  skillTrainingRanges: Record<string, number[]>;
  playerLevel: number;
  description: string;
}

export interface BuildReconcileOptions {
  /** Force allocation: ignore skill-point budget when raising skill levels. */
  ignoreSkillPointCap?: boolean;
  /** Force allocation: ignore training budget when raising skill levels. */
  ignoreTrainingCap?: boolean;
  /** Force allocation: ignore perk-point budget when selecting perks. */
  ignorePerkPointCap?: boolean;
  /** Force allocation: raise player level to cover point budgets, not only skill/perk gates. */
  ensureMinimumPlayerLevel?: boolean;
}

export interface SkillReqConflictPerk {
  id: string;
  name: string;
  skillReq: number;
  skillId: string;
}

export interface PlayerLevelSkillCap {
  skillId: string;
  skillName: string;
  skillLevel: number;
  maxAllowed: number;
}

export interface PlayerLevelSkillIncreaseConflict {
  skillId: string;
  skillName: string;
  skillLevel: number;
  requiredLevel: number;
}

export interface TrainingBudgetConflict {
  trainingUsed: number;
  trainingEarned: number;
  requiredLevel: number;
}

export interface PlayerLevelConflictPerk {
  id: string;
  name: string;
  playerLevelReq: number;
  skillId: string;
}

export interface DestinyPerkBudgetConflict {
  id: string;
  name: string;
}

export interface BuildPlayerLevelWarnings {
  skills: PlayerLevelSkillCap[];
  skillIncreases: PlayerLevelSkillIncreaseConflict[];
  training: TrainingBudgetConflict | null;
  perks: PlayerLevelConflictPerk[];
  destinyPerksOverBudget: DestinyPerkBudgetConflict[];
  attributeChoicesOverBy: number;
}

export interface DerivedStatResult {
  id: string;
  label: string;
  value: number;
  isPercent: boolean;
}

export type AppliedBonusEntry = TrackedStatEntry;

export interface ComputedBuild {
  attributes: Attributes;
  carryWeight: number;
  unarmedDamage: number;
  moveSpeedBonus: number;
  derivedStats: DerivedStatResult[];
  appliedBonuses: AppliedBonusEntry[];
  conditionalBonuses: ConditionalBonusEntry[];
  skillLevels: Record<string, number>;
  playerLevel: number;
  skillPointsSpent: number;
  skillPointsRemaining: number;
  skillPointsPerLevel: number;
  trainingLevelsUsed: number;
  trainingLevelsRemaining: number;
  trainingLevelsPerLevel: number;
  perkPointsSpent: number;
  perkPointsRemaining: number;
  perkPointsPerLevel: number;
  plannerNotesByPerkId: Record<string, string[]>;
  playerLevelWarnings: BuildPlayerLevelWarnings;
  skillReqConflicts: SkillReqConflictPerk[];
  /** Lowest player level that satisfies skills, perks, and point budgets. */
  minimumPlayerLevel: number;
  destinyPerkPointsRemaining: number;
  traitLimit: number;
}

function emptyAttributes(): Attributes {
  return { health: 0, magicka: 0, stamina: 0 };
}

function resolveRace(game: GameData, raceId: string | null): Race | undefined {
  if (!raceId || raceId === "none") return undefined;
  return game.races.find((race) => race.id === raceId);
}

function computeDerivedStats(
  mechanics: Mechanics,
  attributes: Attributes,
  derivedBonuses: Record<string, number>,
): DerivedStatResult[] {
  return mechanics.derivedStats.map((stat) => {
    const weighted =
      attributes.health * stat.weights.health +
      attributes.magicka * stat.weights.magicka +
      attributes.stamina * stat.weights.stamina;

    const base = stat.prefactor * (weighted / stat.threshold);
    const bonus = derivedBonuses[stat.id] ?? 0;
    const value = Math.round((base + bonus) * 100) / 100;

    return {
      id: stat.id,
      label: stat.label,
      value,
      isPercent: stat.isPercent,
    };
  });
}

export function getMaxSkillLevel(game: GameData): number {
  return game.mechanics.leveling.maxSkillLevel;
}

/** Highest skill level allowed at the current player level: min(maxSkillLevel, playerLevel + maxSkillAbovePlayerLevel). */
export function getMaxAllowedSkillLevel(game: GameData, state: BuildState): number {
  const { baseLevel, maxSkillAbovePlayerLevel } = game.mechanics.leveling;
  const playerLevel = state.playerLevel ?? baseLevel;
  return Math.min(getMaxSkillLevel(game), playerLevel + maxSkillAbovePlayerLevel);
}

export function getMaxPlayerLevel(game: GameData): number {
  return game.mechanics.leveling.maxPlayerLevel;
}

export function isAllocatableSkill(game: GameData, skillId: string): boolean {
  return !game.manifest.nonAllocatableSkills.includes(skillId);
}

export function getSkillLevelBaseline(
  game: GameData,
  state: BuildState,
  skillId: string,
  baseline: SkillLevelBaseline,
  evaluation?: BuildEvaluation,
): number {
  if (baseline === "skillFloor") {
    return getEffectiveSkillFloor(game, state, skillId, evaluation);
  }
  if (baseline === "raceStarting") {
    const race = resolveRace(game, state.raceId);
    return race?.startingSkills[skillId] ?? 0;
  }
  return 0;
}

export function getSkillIncreaseAboveBaseline(
  game: GameData,
  state: BuildState,
  skillId: string,
  level: number,
  baseline: SkillLevelBaseline,
  evaluation?: BuildEvaluation,
): number {
  const base = getSkillLevelBaseline(game, state, skillId, baseline, evaluation);
  return Math.max(0, level - base);
}

export function getSkillPointsPerLevel(
  game: GameData,
  state: BuildState,
  evaluation?: BuildEvaluation,
): number {
  const collected = evaluation?.collected ?? collectBuildChanges(game, state);
  const bonus = aggregateEffects(collected.sourcedEffects.map((entry) => entry.effect))
    .skillPointsPerLevel;

  return game.mechanics.leveling.skillPointsPerLevel + bonus;
}

export function getSkillLevelIncreaseCost(mechanics: Mechanics, targetLevel: number): number {
  const maxSkillLevel = mechanics.leveling.maxSkillLevel;
  const clamped = Math.min(maxSkillLevel, Math.max(1, targetLevel));
  const tier = mechanics.leveling.skillLevelCosts.find(
    (entry) => clamped >= entry.minLevel && clamped <= entry.maxLevel,
  );
  return tier?.cost ?? mechanics.leveling.skillLevelCosts.at(-1)!.cost;
}

export function computeSkillPointsToReach(
  mechanics: Mechanics,
  fromLevel: number,
  toLevel: number,
): number {
  if (toLevel <= fromLevel) return 0;

  let total = 0;
  for (let level = fromLevel + 1; level <= toLevel; level++) {
    total += getSkillLevelIncreaseCost(mechanics, level);
  }
  return total;
}

export function getEffectiveSkillFloor(
  game: GameData,
  state: BuildState,
  skillId: string,
  evaluation?: BuildEvaluation,
): number {
  return (
    getSkillFloor(game, state, skillId) +
    getSkillLevelGrantFloorBonus(game, state, skillId, evaluation) +
    getOghmaFloorBonus(game, state, skillId)
  );
}

export function getStoredSkillLevel(
  game: GameData,
  state: BuildState,
  skillId: string,
  evaluation?: BuildEvaluation,
): number {
  const floor = getEffectiveSkillFloor(game, state, skillId, evaluation);
  const stored = state.skillLevels[skillId] ?? floor;
  return Math.min(getMaxSkillLevel(game), Math.max(floor, stored));
}

export function getEffectiveSkillLevel(
  game: GameData,
  state: BuildState,
  skillId: string,
  evaluation?: BuildEvaluation,
): number {
  const stored = getStoredSkillLevel(game, state, skillId, evaluation);
  const grantBonus = getSkillLevelGrantBonus(game, state, skillId, evaluation);
  return Math.min(getMaxSkillLevel(game), stored + grantBonus);
}

export function getTrainingLevelsPerPlayerLevel(game: GameData): number {
  return game.mechanics.leveling.skillLevelIncreasesPerPlayerLevel;
}

export function getEarnedTrainingLevels(game: GameData, state: BuildState): number {
  const { baseLevel } = game.mechanics.leveling;
  const playerLevel = state.playerLevel ?? baseLevel;
  return playerLevel * getTrainingLevelsPerPlayerLevel(game);
}

export function getStoredSkillTraining(
  game: GameData,
  state: BuildState,
  skillId: string,
): number {
  return sumTrainingRanges(getSkillTrainingRanges(game, state, skillId));
}

export function getSkillLevelFromTraining(
  game: GameData,
  state: BuildState,
  skillId: string,
): number {
  const floor = getEffectiveSkillFloor(game, state, skillId);
  return getSkillLevelRequiredForTrainingRanges(
    game,
    floor,
    getSkillTrainingRanges(game, state, skillId),
  );
}

export function getTotalTrainingUsed(game: GameData, state: BuildState): number {
  let total = 0;

  for (const skillId of game.manifest.skills) {
    if (!isAllocatableSkill(game, skillId)) continue;
    total += getStoredSkillTraining(game, state, skillId);
  }

  return total;
}

export function getRemainingTrainingLevels(game: GameData, state: BuildState): number {
  return getEarnedTrainingLevels(game, state) - getTotalTrainingUsed(game, state);
}

export function getRequiredPlayerLevelFromTraining(
  game: GameData,
  state: BuildState,
): number {
  const { baseLevel } = game.mechanics.leveling;
  const trainingUsed = getTotalTrainingUsed(game, state);
  const perLevel = getTrainingLevelsPerPlayerLevel(game);
  if (trainingUsed <= 0) return baseLevel;

  return clampPlayerLevel(game, Math.ceil(trainingUsed / perLevel));
}

/** Player level needed so skill levels stay within the per-level gain above `playerLevelSkillBaseline`. */
function getRequiredPlayerLevelFromSkillLevelIncreases(
  game: GameData,
  state: BuildState,
  evaluation?: BuildEvaluation,
): number {
  const { baseLevel, playerLevelSkillBaseline, skillLevelIncreasesPerPlayerLevel } =
    game.mechanics.leveling;
  if (skillLevelIncreasesPerPlayerLevel <= 0) return baseLevel;

  let required = baseLevel;

  for (const skillId of game.manifest.skills) {
    if (!isAllocatableSkill(game, skillId)) continue;

    const level = getStoredSkillLevel(game, state, skillId, evaluation);
    const bypassIncrease = getBypassSkillIncreaseGrantBonus(game, state, skillId, evaluation);
    const increase = getSkillIncreaseAboveBaseline(
      game,
      state,
      skillId,
      Math.max(0, level - bypassIncrease),
      playerLevelSkillBaseline,
      evaluation,
    );
    if (increase <= 0) continue;

    required = Math.max(
      required,
      baseLevel + Math.ceil(increase / skillLevelIncreasesPerPlayerLevel),
    );
  }

  return clampPlayerLevel(game, required);
}

export function isSkillOverPlayerLevelCap(
  game: GameData,
  state: BuildState,
  skillId: string,
): boolean {
  return getStoredSkillLevel(game, state, skillId) > getMaxAllowedSkillLevel(game, state);
}

/** Keep per-skill skill-point spend and training ranges when race or skill floors change. */
export function preserveSkillPointAllocations(
  game: GameData,
  previousBuild: BuildState,
  nextBuild: BuildState,
): BuildState {
  const skillLevels = { ...nextBuild.skillLevels };
  const skillTrainingRanges = { ...nextBuild.skillTrainingRanges };

  for (const skillId of game.manifest.skills) {
    if (!isAllocatableSkill(game, skillId)) continue;

    const previousLevel = getStoredSkillLevel(game, previousBuild, skillId);
    const previousFloor = getEffectiveSkillFloor(game, previousBuild, skillId);
    const previousRanges = getSkillTrainingRanges(game, previousBuild, skillId);
    const floor = getEffectiveSkillFloor(
      game,
      { ...nextBuild, skillLevels, skillTrainingRanges },
      skillId,
    );
    const skillLevel = Math.max(previousLevel, floor);
    const preservedRanges = normalizeTrainingRangesForSkill(
      game,
      { ...nextBuild, skillLevels, skillTrainingRanges },
      skillId,
      previousRanges,
      floor,
      skillLevel,
    );

    if (sumTrainingRanges(preservedRanges) > 0) {
      skillTrainingRanges[skillId] = preservedRanges;
    } else {
      delete skillTrainingRanges[skillId];
    }

    const nextState = { ...nextBuild, skillLevels, skillTrainingRanges };
    const trainingFloor = getSkillLevelFromTraining(game, nextState, skillId);
    const hadInvestmentAboveFloor = previousLevel > previousFloor;
    const oghmaFloorChanged =
      getOghmaFloorBonus(game, previousBuild, skillId) !==
      getOghmaFloorBonus(game, nextState, skillId);
    const targetLevel = oghmaFloorChanged || hadInvestmentAboveFloor
      ? Math.max(previousLevel, floor)
      : floor;
    skillLevels[skillId] = Math.min(getMaxSkillLevel(game), Math.max(trainingFloor, targetLevel));
  }

  return normalizeSkillTraining(game, { ...nextBuild, skillLevels, skillTrainingRanges });
}

function computePaidSkillPoints(
  game: GameData,
  state: BuildState,
  skillId: string,
  level: number,
  evaluation?: BuildEvaluation,
): number {
  const { skillPointBaseline, skillPointFreeThroughFloor } = game.mechanics.leveling;
  const pointBase = getSkillLevelBaseline(game, state, skillId, skillPointBaseline, evaluation);
  const floor = getEffectiveSkillFloor(game, state, skillId, evaluation);
  const effectiveLevel = Math.max(floor, Math.min(getMaxSkillLevel(game), level));
  const chargeFrom = skillPointFreeThroughFloor
    ? Math.max(pointBase, floor)
    : pointBase;
  const freeTopLevels = getSkillLevelGrantFreeTopLevels(game, state, skillId, evaluation);
  const paidToLevel = Math.max(chargeFrom, effectiveLevel - freeTopLevels);
  const gross = computeSkillPointsToReach(game.mechanics, chargeFrom, paidToLevel);
  const trainingCredit = computeTrainingSkillPointCredit(
    game.mechanics,
    game,
    getSkillTrainingRanges(game, state, skillId),
  );

  return Math.max(0, gross - trainingCredit);
}

export function computeTotalSkillPointsForLevels(
  game: GameData,
  state: BuildState,
  levels: Record<string, number>,
  evaluation?: BuildEvaluation,
): number {
  let total = 0;

  for (const skillId of game.manifest.skills) {
    if (!isAllocatableSkill(game, skillId)) continue;
    const floor = getEffectiveSkillFloor(game, state, skillId, evaluation);
    total += computePaidSkillPoints(game, state, skillId, levels[skillId] ?? floor, evaluation);
  }

  return total;
}

export function computeSkillPointsSpentOnSkill(
  game: GameData,
  state: BuildState,
  skillId: string,
): number {
  return computePaidSkillPoints(
    game,
    state,
    skillId,
    getStoredSkillLevel(game, state, skillId),
  );
}

export function computeTotalSkillPointsSpent(
  game: GameData,
  state: BuildState,
  evaluation?: BuildEvaluation,
): number {
  const levels: Record<string, number> = {};

  for (const skillId of game.manifest.skills) {
    if (!isAllocatableSkill(game, skillId)) continue;
    levels[skillId] = getStoredSkillLevel(game, state, skillId, evaluation);
  }

  return computeTotalSkillPointsForLevels(game, state, levels, evaluation);
}

export function getEarnedSkillPoints(
  game: GameData,
  state: BuildState,
  evaluation?: BuildEvaluation,
): number {
  const { baseLevel } = game.mechanics.leveling;
  const playerLevel = state.playerLevel ?? baseLevel;
  const levelsAboveBase = Math.max(0, playerLevel - baseLevel);
  return levelsAboveBase * getSkillPointsPerLevel(game, state, evaluation);
}

export function getRemainingSkillPoints(game: GameData, state: BuildState): number {
  return getEarnedSkillPoints(game, state) - computeTotalSkillPointsSpent(game, state);
}

export function getPerkPointsPerLevel(game: GameData): number {
  return game.mechanics.leveling.perkPointsPerLevel;
}

export function getInitialPerkPoints(game: GameData): number {
  return game.mechanics.leveling.initialPerkPoints;
}

export function perkCostsPerkPoint(game: GameData, perkId: string): boolean {
  const perk = getPerkById(game, perkId);
  if (!perk) return false;

  const skillId = getPerkSkillId(game, perkId);
  if (!skillId || !isAllocatableSkill(game, skillId)) return false;

  return perk.costsPerkPoint;
}

export function getEarnedPerkPoints(
  game: GameData,
  state: BuildState,
  evaluation?: BuildEvaluation,
): number {
  const { baseLevel } = game.mechanics.leveling;
  const playerLevel = state.playerLevel ?? baseLevel;
  const levelsAboveBase = Math.max(0, playerLevel - baseLevel);
  const perkPoints =
    evaluation?.budgetEffects.perkPoints ??
    sumCollectedBudgetEffects(collectBuildChanges(game, state)).perkPoints;
  return (
    getInitialPerkPoints(game) +
    levelsAboveBase * getPerkPointsPerLevel(game) +
    perkPoints
  );
}

export function computePerkPointsSpent(game: GameData, state: BuildState): number {
  return state.selectedPerkIds.filter((perkId) => perkCostsPerkPoint(game, perkId)).length;
}

export function getRemainingPerkPoints(game: GameData, state: BuildState): number {
  return getEarnedPerkPoints(game, state) - computePerkPointsSpent(game, state);
}

const DESTINY_SKILL_ID = "destiny";
const DESTINY_PERK_POINTS_MAX = 7;
const DESTINY_PERK_POINTS_INTERVAL_LEVELS = 5;

function getDestinyEarnedRaw(playerLevel: number): number {
  // Destiny points are granted at character levels: 1, 5, 10, 15, ...
  // So total points at level L is: 1 + floor(L / 5), capped.
  return 1 + Math.floor(playerLevel / DESTINY_PERK_POINTS_INTERVAL_LEVELS);
}

export function getEarnedDestinyPerkPoints(game: GameData, state: BuildState): number {
  const { baseLevel } = game.mechanics.leveling;
  const playerLevel = state.playerLevel ?? baseLevel;
  return Math.min(DESTINY_PERK_POINTS_MAX, Math.max(0, getDestinyEarnedRaw(playerLevel)));
}

export function computeDestinyPerkPointsSpent(game: GameData, state: BuildState): number {
  return state.selectedPerkIds.reduce((spent, perkId) => {
    const perk = getPerkById(game, perkId);
    if (!perk) return spent;
    const skillId = getPerkSkillId(game, perk.id);
    if (skillId !== DESTINY_SKILL_ID) return spent;
    if (!perk.costsPerkPoint) return spent;
    return spent + 1;
  }, 0);
}

export function getRemainingDestinyPerkPoints(game: GameData, state: BuildState): number {
  return getEarnedDestinyPerkPoints(game, state) - computeDestinyPerkPointsSpent(game, state);
}

function getSelectedDestinyCostingPerkIds(
  game: GameData,
  selectedPerkIds: string[],
): string[] {
  return selectedPerkIds.filter((perkId) => {
    const perk = getPerkById(game, perkId);
    if (!perk) return false;
    const skillId = getPerkSkillId(game, perk.id);
    return skillId === DESTINY_SKILL_ID && perk.costsPerkPoint;
  });
}

/** Selected destiny perks that exceed the earned destiny point budget at the current player level. */
export function getDestinyPerksOverPointBudget(
  game: GameData,
  state: BuildState,
): Perk[] {
  const earned = getEarnedDestinyPerkPoints(game, state);
  const overBudgetIds = getSelectedDestinyCostingPerkIds(game, state.selectedPerkIds).slice(earned);
  return overBudgetIds.flatMap((perkId) => {
    const perk = getPerkById(game, perkId);
    return perk ? [perk] : [];
  });
}

export function clampPlayerLevel(game: GameData, level: number): number {
  const { baseLevel, maxPlayerLevel } = game.mechanics.leveling;
  return Math.min(maxPlayerLevel, Math.max(baseLevel, Math.floor(level)));
}

export function getRequiredPlayerLevelFromSkills(
  game: GameData,
  state: BuildState,
  evaluation?: BuildEvaluation,
): number {
  const { baseLevel, maxSkillAbovePlayerLevel } = game.mechanics.leveling;
  let required = baseLevel;

  for (const skillId of game.manifest.skills) {
    if (!isAllocatableSkill(game, skillId)) continue;
    const level = getStoredSkillLevel(game, state, skillId, evaluation);
    required = Math.max(required, level - maxSkillAbovePlayerLevel);
  }

  required = Math.max(required, getRequiredPlayerLevelFromSkillLevelIncreases(game, state, evaluation));

  return clampPlayerLevel(game, required);
}

export function getRequiredPlayerLevelFromPerks(game: GameData, state: BuildState): number {
  const { baseLevel } = game.mechanics.leveling;
  let required = baseLevel;

  for (const perkId of state.selectedPerkIds) {
    const perk = getPerkById(game, perkId);
    const playerLevelReq = meaningfulPlayerLevelReq(perk?.playerLevelReq);
    if (playerLevelReq) {
      required = Math.max(required, playerLevelReq);
    }
  }

  return clampPlayerLevel(game, required);
}

export function getRequiredPlayerLevel(
  game: GameData,
  state: BuildState,
  evaluation?: BuildEvaluation,
): number {
  return clampPlayerLevel(
    game,
    Math.max(
      getRequiredPlayerLevelFromSkills(game, state, evaluation),
      getRequiredPlayerLevelFromPerks(game, state),
    ),
  );
}

function getRequiredPlayerLevelFromAttributeChoices(game: GameData, state: BuildState): number {
  const { baseLevel } = game.mechanics.leveling;
  return baseLevel + getUsedAttributeChoices(state);
}

function getRequiredPlayerLevelFromSkillPointBudget(
  game: GameData,
  state: BuildState,
  evaluation?: BuildEvaluation,
): number {
  const { baseLevel, maxPlayerLevel } = game.mechanics.leveling;
  const spent = computeTotalSkillPointsSpent(game, state, evaluation);
  const perLevel = getSkillPointsPerLevel(game, state, evaluation);
  if (spent <= 0) return baseLevel;
  if (perLevel <= 0) return maxPlayerLevel;

  return baseLevel + Math.ceil(spent / perLevel);
}

function getRequiredPlayerLevelFromPerkPointBudget(
  game: GameData,
  state: BuildState,
  evaluation?: BuildEvaluation,
): number {
  const { baseLevel, maxPlayerLevel } = game.mechanics.leveling;
  const spent = computePerkPointsSpent(game, state);
  const perLevel = getPerkPointsPerLevel(game);
  const perkPoints =
    evaluation?.budgetEffects.perkPoints ??
    sumCollectedBudgetEffects(collectBuildChanges(game, state)).perkPoints;
  const deficit = spent - getInitialPerkPoints(game) - perkPoints;
  if (deficit <= 0) return baseLevel;
  if (perLevel <= 0) return maxPlayerLevel;

  return baseLevel + Math.ceil(deficit / perLevel);
}

function getRequiredPlayerLevelFromDestinyPointBudget(game: GameData, state: BuildState): number {
  const { baseLevel, maxPlayerLevel } = game.mechanics.leveling;
  const spent = computeDestinyPerkPointsSpent(game, state);
  if (spent <= 0) return baseLevel;

  for (let level = baseLevel; level <= maxPlayerLevel; level++) {
    if (getEarnedDestinyPerkPoints(game, { ...state, playerLevel: level }) >= spent) {
      return level;
    }
  }

  return maxPlayerLevel;
}

/** Lowest player level that satisfies the current build's skills, perks, and point budgets. */
export function getMinimumPlayerLevelForBuild(
  game: GameData,
  state: BuildState,
  evaluation?: BuildEvaluation,
): number {
  return clampPlayerLevel(
    game,
    Math.max(
      getRequiredPlayerLevel(game, state, evaluation),
      getRequiredPlayerLevelFromTraining(game, state),
      getRequiredPlayerLevelFromAttributeChoices(game, state),
      getRequiredPlayerLevelFromSkillPointBudget(game, state, evaluation),
      getRequiredPlayerLevelFromPerkPointBudget(game, state, evaluation),
      getRequiredPlayerLevelFromDestinyPointBudget(game, state),
    ),
  );
}

/** Raise player level when skills or perks require it. Does not lower level. */
export function ensurePlayerLevelForBuild(
  game: GameData,
  build: BuildState,
  options?: BuildReconcileOptions,
): BuildState {
  const reconciled = reconcileBuild(game, build, options);
  const requiredLevel = options?.ensureMinimumPlayerLevel
    ? getMinimumPlayerLevelForBuild(game, reconciled)
    : getRequiredPlayerLevel(game, reconciled);
  if (reconciled.playerLevel >= requiredLevel) {
    return reconciled;
  }

  return reconcileBuild(
    game,
    { ...reconciled, playerLevel: requiredLevel },
    options,
  );
}

export function applySkillLevelChange(
  game: GameData,
  build: BuildState,
  skillId: string,
  level: number,
  options?: BuildReconcileOptions,
): BuildState {
  const trainingFloor = getSkillLevelFromTraining(game, build, skillId);
  const clampedLevel = Math.max(
    trainingFloor,
    clampSkillLevel(game, build, skillId, level),
  );

  const next = reconcileBuild(
    game,
    {
      ...build,
      skillLevels: { ...build.skillLevels, [skillId]: clampedLevel },
    },
    options,
  );

  return ensurePlayerLevelForBuild(game, next, options);
}

export function applySkillTrainingRangeChange(
  game: GameData,
  build: BuildState,
  skillId: string,
  tierIndex: number,
  count: number,
  options?: BuildReconcileOptions,
): BuildState {
  const floor = getEffectiveSkillFloor(game, build, skillId);
  const currentRanges = getSkillTrainingRanges(game, build, skillId);

  const nextCount = clampTrainingRangeCount(
    game,
    build,
    skillId,
    tierIndex,
    count,
    floor,
    currentRanges,
  );

  const newRanges = [...currentRanges];
  newRanges[tierIndex] = nextCount;

  let workingBuild = build;
  const isIncreasing = nextCount > (currentRanges[tierIndex] ?? 0);
  if (isIncreasing && nextCount > 0) {
    const tier = getTrainingTierDefinitions(game)[tierIndex];
    const currentLevel = getStoredSkillLevel(game, workingBuild, skillId);
    if (tier && currentLevel < tier.minLevel) {
      workingBuild = applySkillLevelChange(game, workingBuild, skillId, tier.minLevel, options);
    }
  }

  const skillTrainingRanges = { ...(workingBuild.skillTrainingRanges ?? {}) };
  const trainedTotal = sumTrainingRanges(newRanges);
  if (trainedTotal > 0) {
    skillTrainingRanges[skillId] = newRanges;
  } else {
    delete skillTrainingRanges[skillId];
  }

  const requiredTrainingLevel = getSkillLevelRequiredForTrainingRanges(game, floor, newRanges);
  const currentLevel = getStoredSkillLevel(game, workingBuild, skillId);
  const newLevel = isIncreasing
    ? Math.max(currentLevel, requiredTrainingLevel)
    : currentLevel;

  const next = reconcileBuild(
    game,
    {
      ...workingBuild,
      skillTrainingRanges,
      skillLevels: { ...workingBuild.skillLevels, [skillId]: newLevel },
    },
    options,
  );

  return ensurePlayerLevelForBuild(game, next, options);
}

function isKnownId(ids: readonly { id: string }[], id: string | null | undefined): id is string {
  return id != null && ids.some((entry) => entry.id === id);
}

/** Drop references that no longer exist in the current game data before reconciling imports. */
export function sanitizeImportedBuildReferences(game: GameData, build: BuildState): BuildState {
  const allocatableSkillIds = new Set(
    game.skills.filter((skill) => isAllocatableSkill(game, skill.id)).map((skill) => skill.id),
  );

  const filterSkills = (skillIds: string[]) =>
    skillIds.filter((skillId) => allocatableSkillIds.has(skillId));

  const majorSkillIds = filterSkills(build.majorSkillIds).slice(0, game.manifest.limits.majorSkills);
  const minorSkillIds = filterSkills(build.minorSkillIds)
    .filter((skillId) => !majorSkillIds.includes(skillId))
    .slice(0, game.manifest.limits.minorSkills);

  const skillLevels: BuildState["skillLevels"] = {};
  for (const [skillId, level] of Object.entries(build.skillLevels)) {
    if (allocatableSkillIds.has(skillId)) {
      skillLevels[skillId] = level;
    }
  }

  const skillTrainingRanges: BuildState["skillTrainingRanges"] = {};
  for (const [skillId, ranges] of Object.entries(build.skillTrainingRanges ?? {})) {
    if (allocatableSkillIds.has(skillId)) {
      skillTrainingRanges[skillId] = ranges;
    }
  }

  return {
    ...build,
    raceId: isKnownId(game.races, build.raceId) ? build.raceId : "none",
    birthsignId: isKnownId(game.birthsigns, build.birthsignId) ? build.birthsignId : "none",
    deityId: isKnownId(game.deities, build.deityId) ? build.deityId : "none",
    traitIds: build.traitIds.filter((traitId) => isKnownId(game.traits, traitId)),
    majorSkillIds,
    minorSkillIds,
    oghmaSkillIds: filterSkills(build.oghmaSkillIds),
    selectedPerkIds: build.selectedPerkIds.filter((perkId) => getPerkById(game, perkId) !== undefined),
    skillLevels,
    skillTrainingRanges,
  };
}

export function reconcileImportedBuild(game: GameData, build: BuildState): BuildState {
  const importReconcileOptions: BuildReconcileOptions = {
    ignoreSkillPointCap: true,
    ignoreTrainingCap: true,
    ignorePerkPointCap: true,
    ensureMinimumPlayerLevel: true,
  };
  return reconcileBuild(
    game,
    migrateBuildState(sanitizeImportedBuildReferences(game, build)),
    importReconcileOptions,
  );
}

export function reconcileBuild(
  game: GameData,
  build: BuildState,
  options?: BuildReconcileOptions,
): BuildState {
  const legacyOghmaChoice = (build as BuildState & { oghmaChoice?: number }).oghmaChoice;
  const legacyBirthsignId = (build as BuildState & { standingStoneId?: string | null }).standingStoneId;
  const playerLevel = clampPlayerLevel(
    game,
    build.playerLevel ?? game.mechanics.leveling.baseLevel,
  );

  const leveledBuild = migrateSkillTrainingStorage(
    game,
    (() => {
      const migratedOghma = migrateOghmaInfiniumBuild(game, {
        ...build,
        birthsignId: build.birthsignId ?? legacyBirthsignId ?? "none",
        playerLevel,
        skillTrainingRanges: build.skillTrainingRanges ?? {},
        oghmaSkillIds: build.oghmaSkillIds ?? [],
        characterOptionChoices: build.characterOptionChoices ?? {},
      });

      return {
        ...migratedOghma,
        characterOptionChoices: normalizeCharacterOptionChoices(
          game,
          migratedOghma.characterOptionChoices,
          legacyOghmaChoice,
        ),
      };
    })(),
  );

  const traitLimit =
    game.manifest.limits.traits + sumCollectedBudgetEffects(collectBuildChanges(game, leveledBuild)).traitSlots;
  const traitIds =
    leveledBuild.traitIds.length > traitLimit
      ? leveledBuild.traitIds.slice(0, traitLimit)
      : leveledBuild.traitIds;

  const normalized = normalizeBuildSkillLevels(
    game,
    normalizeSupernaturalState(game, { ...leveledBuild, traitIds }),
    options,
  );
  return normalized;
}

function migrateSkillTrainingStorage(game: GameData, build: BuildState): BuildState {
  const legacyTraining = (build as BuildState & { skillTraining?: Record<string, number> })
    .skillTraining;
  const hasRanges =
    build.skillTrainingRanges && Object.keys(build.skillTrainingRanges).length > 0;

  if (hasRanges || !legacyTraining || Object.keys(legacyTraining).length === 0) {
    const { skillTraining, ...rest } = build as BuildState & {
      skillTraining?: Record<string, number>;
    };
    void skillTraining;
    return rest;
  }

  const { skillTraining, ...rest } = build as BuildState & {
    skillTraining?: Record<string, number>;
  };
  void skillTraining;

  return {
    ...rest,
    skillTrainingRanges: migrateLegacySkillTrainingCounts(game, legacyTraining),
  };
}

export function getSkillFloor(game: GameData, state: BuildState, skillId: string): number {
  let floor = 0;

  for (const source of game.mechanics.leveling.skillFloorSources) {
    if (source.type === "raceStarting") {
      const race = resolveRace(game, state.raceId);
      floor = Math.max(floor, race?.startingSkills[skillId] ?? 0);
      continue;
    }

    const selected =
      source.selection === "major" ? state.majorSkillIds : state.minorSkillIds;
    if (selected.includes(skillId)) {
      floor += game.mechanics[source.bonusField];
    }
  }

  return floor;
}

export function clampSkillLevel(
  game: GameData,
  state: BuildState,
  skillId: string,
  level: number,
): number {
  const floor = getEffectiveSkillFloor(game, state, skillId);
  return Math.min(getMaxSkillLevel(game), Math.max(floor, level));
}

export function computeSkillLevels(
  game: GameData,
  state: BuildState,
): Record<string, number> {
  const levels: Record<string, number> = {};

  for (const skillId of game.manifest.skills) {
    if (!isAllocatableSkill(game, skillId)) continue;
    const floor = getEffectiveSkillFloor(game, state, skillId);
    const stored = state.skillLevels[skillId] ?? floor;
    levels[skillId] = clampSkillLevel(game, state, skillId, stored);
  }

  return levels;
}

export function getSkillLevelForPerkChecks(
  game: GameData,
  state: BuildState,
  skillId: string,
): number {
  return getEffectiveSkillLevel(game, state, skillId);
}

/** Selected perks whose skill requirement exceeds the current skill level. */
export function getSelectedPerksBelowSkillRequirement(
  game: GameData,
  state: BuildState,
): SkillReqConflictPerk[] {
  return state.selectedPerkIds.flatMap((perkId) => {
    const perk = getPerkById(game, perkId);
    if (!perk) return [];

    const skillId = getPerkSkillId(game, perkId);
    if (!skillId || skillId === DESTINY_SKILL_ID) return [];

    const skillLevel = getSkillLevelForPerkChecks(game, state, skillId);
    if (skillLevel >= perk.skillReq) return [];

    return [{ id: perk.id, name: perk.name, skillReq: perk.skillReq, skillId }];
  });
}

/** Selected perks whose player level requirement exceeds the given player level. */
export function getPerksRequiringHigherPlayerLevel(
  game: GameData,
  state: BuildState,
  playerLevel: number,
): Perk[] {
  return state.selectedPerkIds.flatMap((perkId) => {
    const perk = getPerkById(game, perkId);
    if (!perk) return [];
    const playerLevelReq = meaningfulPlayerLevelReq(perk.playerLevelReq);
    if (!playerLevelReq || playerLevelReq <= playerLevel) return [];
    return [perk];
  });
}

/** Skills whose level exceeds the cap allowed at the given player level. */
export function getSkillsExceedingPlayerLevelCap(
  game: GameData,
  state: BuildState,
  playerLevel: number,
  evaluation?: BuildEvaluation,
): PlayerLevelSkillCap[] {
  const maxAllowed = getMaxAllowedSkillLevel(game, { ...state, playerLevel });
  const skills: PlayerLevelSkillCap[] = [];

  for (const skillId of game.manifest.skills) {
    if (!isAllocatableSkill(game, skillId)) continue;

    const skillLevel = getStoredSkillLevel(game, state, skillId, evaluation);
    if (skillLevel <= maxAllowed) continue;

    const tree = game.perkTrees[skillId];
    skills.push({
      skillId,
      skillName: tree?.skillName ?? skillId,
      skillLevel,
      maxAllowed,
    });
  }

  return skills.sort((a, b) => b.skillLevel - a.skillLevel);
}

/** Skills whose level exceeds the per-level gain allowed at the given player level. */
export function getSkillsExceedingSkillLevelIncreaseLimit(
  game: GameData,
  state: BuildState,
  playerLevel: number,
  evaluation?: BuildEvaluation,
): PlayerLevelSkillIncreaseConflict[] {
  const { baseLevel, playerLevelSkillBaseline, skillLevelIncreasesPerPlayerLevel } =
    game.mechanics.leveling;
  if (skillLevelIncreasesPerPlayerLevel <= 0) return [];

  const skills: PlayerLevelSkillIncreaseConflict[] = [];

  for (const skillId of game.manifest.skills) {
    if (!isAllocatableSkill(game, skillId)) continue;

    const skillLevel = getStoredSkillLevel(game, state, skillId, evaluation);
    const bypassIncrease = getBypassSkillIncreaseGrantBonus(game, state, skillId, evaluation);
    const increase = getSkillIncreaseAboveBaseline(
      game,
      state,
      skillId,
      Math.max(0, skillLevel - bypassIncrease),
      playerLevelSkillBaseline,
      evaluation,
    );
    if (increase <= 0) continue;

    const requiredLevel =
      baseLevel + Math.ceil(increase / skillLevelIncreasesPerPlayerLevel);
    if (playerLevel >= requiredLevel) continue;

    const tree = game.perkTrees[skillId];
    skills.push({
      skillId,
      skillName: tree?.skillName ?? skillId,
      skillLevel,
      requiredLevel,
    });
  }

  return skills.sort((a, b) => b.skillLevel - a.skillLevel);
}

export function getTrainingBudgetConflict(
  game: GameData,
  state: BuildState,
  playerLevel: number,
): TrainingBudgetConflict | null {
  const trainingEarned = playerLevel * getTrainingLevelsPerPlayerLevel(game);
  const trainingUsed = getTotalTrainingUsed(game, state);
  if (trainingUsed <= trainingEarned) return null;

  return {
    trainingUsed,
    trainingEarned,
    requiredLevel: getRequiredPlayerLevelFromTraining(game, state),
  };
}

export function normalizeSkillTraining(
  game: GameData,
  build: BuildState,
  _options?: BuildReconcileOptions,
): BuildState {
  const skillTrainingRanges: Record<string, number[]> = {};

  for (const skillId of game.manifest.skills) {
    if (!isAllocatableSkill(game, skillId)) continue;

    const floor = getEffectiveSkillFloor(game, build, skillId);
    const storedRanges = getSkillTrainingRanges(game, build, skillId);
    const skillLevel = getStoredSkillLevel(game, build, skillId);
    const ranges = normalizeTrainingRangesForSkill(
      game,
      build,
      skillId,
      storedRanges,
      floor,
      skillLevel,
    );

    if (sumTrainingRanges(ranges) > 0) {
      skillTrainingRanges[skillId] = ranges;
    }
  }

  const skillLevels = { ...build.skillLevels };
  for (const skillId of game.manifest.skills) {
    if (!isAllocatableSkill(game, skillId)) continue;

    const stored = skillLevels[skillId] ?? getEffectiveSkillFloor(game, build, skillId);
    const trainingFloor = getSkillLevelFromTraining(
      game,
      { ...build, skillTrainingRanges },
      skillId,
    );
    skillLevels[skillId] = Math.max(stored, trainingFloor);
  }

  return { ...build, skillTrainingRanges, skillLevels };
}

export function getBuildPlayerLevelWarnings(
  game: GameData,
  state: BuildState,
  evaluation?: BuildEvaluation,
): BuildPlayerLevelWarnings {
  const playerLevel = state.playerLevel ?? game.mechanics.leveling.baseLevel;
  const perks = getPerksRequiringHigherPlayerLevel(game, state, playerLevel);

  return {
    skills: getSkillsExceedingPlayerLevelCap(game, state, playerLevel, evaluation),
    skillIncreases: getSkillsExceedingSkillLevelIncreaseLimit(
      game,
      state,
      playerLevel,
      evaluation,
    ),
    training: getTrainingBudgetConflict(game, state, playerLevel),
    perks: perks.flatMap((perk) => {
      const skillId = getPerkSkillId(game, perk.id);
      if (!skillId) return [];
      return [
        {
          id: perk.id,
          name: perk.name,
          playerLevelReq: perk.playerLevelReq!,
          skillId,
        },
      ];
    }),
    attributeChoicesOverBy: Math.max(
      0,
      getUsedAttributeChoices(state) - getEarnedAttributeChoices(game, state),
    ),
    destinyPerksOverBudget: getDestinyPerksOverPointBudget(game, state).map((perk) => ({
      id: perk.id,
      name: perk.name,
    })),
  };
}

export function normalizeBuildSkillLevels(
  game: GameData,
  build: BuildState,
  options?: BuildReconcileOptions,
): BuildState {
  const skillLevels = { ...build.skillLevels };

  for (const skillId of game.manifest.skills) {
    if (!isAllocatableSkill(game, skillId)) continue;
    const floor = getEffectiveSkillFloor(game, build, skillId);
    const stored = skillLevels[skillId] ?? floor;
    skillLevels[skillId] = Math.min(
      getMaxSkillLevel(game),
      Math.max(floor, stored),
    );
  }

  const nextBuild = normalizeSkillTraining(game, { ...build, skillLevels }, options);

  return {
    ...nextBuild,
    selectedPerkIds: build.selectedPerkIds,
  };
}

export function computeBuild(game: GameData, state: BuildState): ComputedBuild {
  const evaluation = createBuildEvaluation(game, state);
  const race = resolveRace(game, state.raceId);
  const baseAttributes = race
    ? {
        health: race.startingAttributes.health + race.attributeBonus.health,
        magicka: race.startingAttributes.magicka + race.attributeBonus.magicka,
        stamina: race.startingAttributes.stamina + race.attributeBonus.stamina,
      }
    : emptyAttributes();

  const attributes: Attributes = {
    health:
      baseAttributes.health +
      state.attributeBonus.health * getAttributePointsPerChoice(game, "health"),
    magicka:
      baseAttributes.magicka +
      state.attributeBonus.magicka * getAttributePointsPerChoice(game, "magicka"),
    stamina:
      baseAttributes.stamina +
      state.attributeBonus.stamina * getAttributePointsPerChoice(game, "stamina"),
  };

  const buildChanges = evaluation.collected;
  const sourcedEffects = buildChanges.sourcedEffects;
  const aggregated = aggregateEffects(sourcedEffects.map((entry) => entry.effect));

  for (const { effect } of sourcedEffects) {
    if (effect.type === "attribute") {
      attributes[effect.stat] += effect.value;
    }
  }

  const derivedStats = computeDerivedStats(
    game.mechanics,
    attributes,
    aggregated.derivedStats,
  );
  const appliedBonuses = computeTrackedStats(game, state, sourcedEffects, attributes);
  const skillLevels: Record<string, number> = {};
  for (const skillId of game.manifest.skills) {
    if (!isAllocatableSkill(game, skillId)) continue;
    skillLevels[skillId] = getEffectiveSkillLevel(game, state, skillId, evaluation);
  }

  const plannerNotesByPerkId = Object.fromEntries(buildChanges.plannerNotesByPerkId);

  const skillPointsPerLevel = getSkillPointsPerLevel(game, state, evaluation);
  const skillPointsSpent = computeTotalSkillPointsSpent(game, state, evaluation);
  const skillPointsRemaining = getEarnedSkillPoints(game, state, evaluation) - skillPointsSpent;
  const trainingLevelsPerLevel = getTrainingLevelsPerPlayerLevel(game);
  const trainingLevelsUsed = getTotalTrainingUsed(game, state);
  const trainingLevelsRemaining = getEarnedTrainingLevels(game, state) - trainingLevelsUsed;
  const perkPointsPerLevel = getPerkPointsPerLevel(game);
  const perkPointsSpent = computePerkPointsSpent(game, state);
  const perkPointsRemaining = getEarnedPerkPoints(game, state, evaluation) - perkPointsSpent;
  const playerLevelWarnings = getBuildPlayerLevelWarnings(game, state, evaluation);
  const skillReqConflicts = getSelectedPerksBelowSkillRequirement(game, state);
  const minimumPlayerLevel = getMinimumPlayerLevelForBuild(game, state, evaluation);
  const destinyPerkPointsRemaining = getRemainingDestinyPerkPoints(game, state);
  const traitLimit = getTraitLimit(game, state, evaluation);

  return {
    attributes,
    carryWeight: race?.startingCarryWeight ?? 0,
    unarmedDamage: race?.unarmedDamage ?? 0,
    moveSpeedBonus: race?.speedBonus ?? 0,
    derivedStats,
    appliedBonuses,
    conditionalBonuses: [],
    skillLevels,
    playerLevel: state.playerLevel,
    skillPointsSpent,
    skillPointsRemaining,
    skillPointsPerLevel,
    trainingLevelsUsed,
    trainingLevelsRemaining,
    trainingLevelsPerLevel,
    perkPointsSpent,
    perkPointsRemaining,
    perkPointsPerLevel,
    plannerNotesByPerkId,
    playerLevelWarnings,
    skillReqConflicts,
    minimumPlayerLevel,
    destinyPerkPointsRemaining,
    traitLimit,
  };
}

export function getOrderedPerkTrees(game: GameData): PerkTree[] {
  return game.manifest.skills
    .map((skillId) => game.perkTrees[skillId])
    .filter((tree): tree is PerkTree => tree !== undefined)
    // Lich has no custom perk tree (phylactery souls); keep an empty placeholder for catalog/codec.
    .filter((tree) => tree.skillId !== LICH_SKILL_ID || tree.perks.length > 0);
}

export function getPerkById(game: GameData, perkId: string): Perk | undefined {
  return game.perkById[perkId];
}

export function getPerkSkillId(game: GameData, perkId: string): string | undefined {
  return game.perkSkillIdByPerkId[perkId];
}

function getPerkTreeForPerk(game: GameData, perkId: string): PerkTree | undefined {
  const skillId = getPerkSkillId(game, perkId);
  return skillId ? game.perkTrees[skillId] : undefined;
}

/**
 * Lower tiers at the same grid cell, ordered from root upward.
 *
 * Ordering follows the stack order (stable sort by skillReq, preserving the
 * rank-chain order from import) rather than a strict skillReq comparison, so
 * multi-rank perks whose ranks share the same skill requirement (e.g. Finesse
 * "Sound Body", both ranks at Pickpocket 30) still gate the lower rank.
 */
function getLowerStackTiers(game: GameData, perk: Perk): Perk[] {
  const tree = getPerkTreeForPerk(game, perk.id);
  if (!tree) return [];

  const stack = tree.perks.filter(
    (candidate) =>
      candidate.position.x === perk.position.x &&
      candidate.position.y === perk.position.y,
  );
  const sorted = sortPerkStack(stack);
  const index = sorted.findIndex((candidate) => candidate.id === perk.id);
  return index <= 0 ? [] : sorted.slice(0, index);
}

function ensureLowerStackTiersAllocated(
  game: GameData,
  build: BuildState,
  perk: Perk,
): BuildState | null {
  let next = build;

  for (const tier of getLowerStackTiers(game, perk)) {
    if (next.selectedPerkIds.includes(tier.id)) continue;

    const allocated = allocatePerkInternal(game, next, tier.id);
    if (!allocated) return null;
    next = allocated;
  }

  return next;
}

function canForceSelectPerk(game: GameData, state: BuildState, perkId: string): boolean {
  const perk = getPerkById(game, perkId);
  if (!perk) return false;
  if (state.selectedPerkIds.includes(perkId)) {
    // Stackable perks can be allocated multiple times, but must still be
    // affordable under the current perk-point budget.
    if (perk.allocation?.kind === "perkPointsBudget") {
      return canSelectPerk(game, state, perkId);
    }
    return true;
  }
  if (!arePrerequisitesMet(game, state, perk)) return false;

  const skillId = getPerkSkillId(game, perkId);
  if (!skillId) return false;

  if (skillId === DESTINY_SKILL_ID) {
    if (!perk.costsPerkPoint) return true;
    const earned = getEarnedDestinyPerkPoints(game, state);
    const spent = computeDestinyPerkPointsSpent(game, state);
    return spent + 1 <= earned;
  }

  return getStoredSkillLevel(game, state, skillId) >= perk.skillReq;
}

const FORCE_ALLOCATE_OPTIONS: BuildReconcileOptions = {
  ignoreSkillPointCap: true,
  ignoreTrainingCap: true,
  ignorePerkPointCap: true,
  ensureMinimumPlayerLevel: true,
};

function getRequiredPlayerLevelForSkillLevel(
  game: GameData,
  state: BuildState,
  skillId: string,
  skillLevel: number,
): number {
  const {
    baseLevel,
    maxSkillAbovePlayerLevel,
    playerLevelSkillBaseline,
    skillLevelIncreasesPerPlayerLevel,
  } = game.mechanics.leveling;

  let required = baseLevel;
  required = Math.max(required, skillLevel - maxSkillAbovePlayerLevel);

  if (skillLevelIncreasesPerPlayerLevel > 0) {
    const increase = getSkillIncreaseAboveBaseline(
      game,
      state,
      skillId,
      skillLevel,
      playerLevelSkillBaseline,
    );
    required = Math.max(
      required,
      baseLevel + Math.ceil(increase / skillLevelIncreasesPerPlayerLevel),
    );
  }

  return clampPlayerLevel(game, required);
}

function allocatePerkAfterRequirements(
  game: GameData,
  build: BuildState,
  perkId: string,
): BuildState | null {
  const perk = getPerkById(game, perkId);
  if (!perk) return null;

  let next = build;

  for (const prereqId of perk.prerequisites) {
    const allocated = allocatePerkInternal(game, next, prereqId);
    if (!allocated) return null;
    next = allocated;
  }

  const isStackable = perk.allocation?.kind === "perkPointsBudget";
  if (next.selectedPerkIds.includes(perkId) && !isStackable) {
    return next;
  }

  const skillId = getPerkSkillId(game, perkId);
  if (!skillId) return null;

  if (skillId === DESTINY_SKILL_ID) {
    if (perk.costsPerkPoint !== false && !next.selectedPerkIds.includes(perkId)) {
      const spent = computeDestinyPerkPointsSpent(game, next);
      if (spent + 1 > DESTINY_PERK_POINTS_MAX) return null;
      const ensured = ensureDestinyPointsForAllocation(game, next, spent + 1);
      if (!ensured) return null;
      next = ensured;
    }
  } else {
    const currentLevel = getStoredSkillLevel(game, next, skillId);
    if (currentLevel < perk.skillReq) {
      const ensured = ensureSkillLevelForAllocation(game, next, skillId, perk.skillReq);
      if (!ensured) return null;
      next = ensured;
    }
  }

  if (!canForceSelectPerk(game, next, perkId)) return null;

  const { baseLevel } = game.mechanics.leveling;
  const requiredPlayerLevel = clampPlayerLevel(
    game,
    Math.max(next.playerLevel, meaningfulPlayerLevelReq(perk.playerLevelReq) ?? baseLevel),
  );

  return reconcileBuild(
    game,
    {
      ...next,
      playerLevel: requiredPlayerLevel,
      selectedPerkIds: [...next.selectedPerkIds, perkId],
    },
    FORCE_ALLOCATE_OPTIONS,
  );
}

export function needsPerkAllocationChoice(game: GameData, state: BuildState, perk: Perk): boolean {
  if (perk.prerequisitesAny?.length) {
    const satisfiesAny = perk.prerequisitesAny.some((id) => state.selectedPerkIds.includes(id));
    if (!satisfiesAny) return true;
  }

  for (const prereqId of perk.prerequisites) {
    const prereq = getPerkById(game, prereqId);
    if (prereq && needsPerkAllocationChoice(game, state, prereq)) {
      return true;
    }
  }

  return false;
}

function ensureSkillLevelForAllocation(
  game: GameData,
  build: BuildState,
  skillId: string,
  targetLevel: number,
): BuildState | null {
  const floor = getEffectiveSkillFloor(game, build, skillId);
  const desiredLevel = Math.min(getMaxSkillLevel(game), Math.max(floor, targetLevel));

  if (getStoredSkillLevel(game, build, skillId) >= desiredLevel) {
    return build;
  }

  const requiredPlayerLevel = getRequiredPlayerLevelForSkillLevel(
    game,
    build,
    skillId,
    desiredLevel,
  );

  const next = reconcileBuild(
    game,
    {
      ...build,
      playerLevel: Math.max(build.playerLevel, requiredPlayerLevel),
      skillLevels: { ...build.skillLevels, [skillId]: desiredLevel },
    },
    FORCE_ALLOCATE_OPTIONS,
  );

  return getStoredSkillLevel(game, next, skillId) >= desiredLevel ? next : null;
}

function ensureDestinyPointsForAllocation(
  game: GameData,
  build: BuildState,
  totalRequired: number,
): BuildState | null {
  if (totalRequired > DESTINY_PERK_POINTS_MAX) return null;

  if (getEarnedDestinyPerkPoints(game, build) >= totalRequired) {
    return build;
  }

  const { maxPlayerLevel } = game.mechanics.leveling;
  let playerLevel = build.playerLevel;
  let next = build;

  while (playerLevel < maxPlayerLevel) {
    playerLevel += 1;
    next = reconcileBuild(game, { ...next, playerLevel }, FORCE_ALLOCATE_OPTIONS);
    if (getEarnedDestinyPerkPoints(game, next) >= totalRequired) {
      return next;
    }
  }

  return null;
}

function allocatePerkInternal(game: GameData, build: BuildState, perkId: string): BuildState | null {
  const perk = getPerkById(game, perkId);
  if (!perk) return null;

  const withStackTiers = ensureLowerStackTiersAllocated(game, build, perk);
  if (!withStackTiers) return null;

  let next = withStackTiers;

  if (perk.prerequisitesAny?.length) {
    const selectedAny = perk.prerequisitesAny.filter((id) => next.selectedPerkIds.includes(id));
    if (selectedAny.length > 0) {
      for (const anyId of selectedAny) {
        const allocated = allocatePerkInternal(game, next, anyId);
        if (!allocated) return null;
        next = allocated;
      }
    } else {
      for (const anyId of perk.prerequisitesAny) {
        const withBranch = allocatePerkInternal(game, next, anyId);
        if (!withBranch) continue;

        const allocated = allocatePerkAfterRequirements(game, withBranch, perkId);
        if (allocated) {
          return allocated;
        }
      }

      return null;
    }
  }

  return allocatePerkAfterRequirements(game, next, perkId);
}

function getPerkStackAtPosition(tree: PerkTree, perk: Perk): Perk[] {
  return tree.perks.filter(
    (candidate) =>
      candidate.position.x === perk.position.x &&
      candidate.position.y === perk.position.y,
  );
}

/** Resolve the perk id to take when the user clicks a tree node (handles multi-rank stacks). */
function resolveTakeTargetId(game: GameData, build: BuildState, perkId: string): string | null {
  const perk = getPerkById(game, perkId);
  if (!perk) return null;

  const tree = getPerkTreeForPerk(game, perkId);
  if (!tree) return null;

  const stack = getPerkStackAtPosition(tree, perk);
  if (stack.length <= 1) return perkId;

  return resolvePerkTakeTarget(stack, build.selectedPerkIds);
}

/** Resolve the perk id for double-click force allocation (next unselected stack tier). */
function resolveForceAllocateTargetId(
  game: GameData,
  build: BuildState,
  perkId: string,
): string | null {
  const perk = getPerkById(game, perkId);
  if (!perk) return null;

  const tree = getPerkTreeForPerk(game, perkId);
  if (!tree) return null;

  const stack = getPerkStackAtPosition(tree, perk);
  if (stack.length <= 1) return perkId;

  return getFrontPerkIdAtPosition(stack, build.selectedPerkIds);
}

export function allocatePerk(game: GameData, build: BuildState, perkId: string): BuildState | null {
  const targetId = resolveForceAllocateTargetId(game, build, perkId);
  if (!targetId) return null;

  const skillId = getPerkSkillId(game, targetId);
  if (skillId === DESTINY_SKILL_ID) {
    const { maxPlayerLevel } = game.mechanics.leveling;
    const previewBuild = reconcileBuild(
      game,
      { ...build, playerLevel: maxPlayerLevel },
      FORCE_ALLOCATE_OPTIONS,
    );
    const preview = allocatePerkInternal(game, previewBuild, targetId);
    if (!preview) return null;

    const totalRequired = computeDestinyPerkPointsSpent(game, preview);
    if (totalRequired > DESTINY_PERK_POINTS_MAX) return null;

    let nextBuild = build;
    if (getEarnedDestinyPerkPoints(game, build) < totalRequired) {
      const ensured = ensureDestinyPointsForAllocation(game, build, totalRequired);
      if (!ensured) return null;
      nextBuild = ensured;
    }

    return allocatePerkInternal(game, nextBuild, targetId);
  }

  return allocatePerkInternal(game, build, targetId);
}

/** Single-click take: no auto prereqs or skill-level bumps (original tryTakePerk). */
export function tryTakePerk(game: GameData, build: BuildState, perkId: string): BuildState | null {
  const targetId = resolveTakeTargetId(game, build, perkId);
  if (!targetId) return null;
  const targetPerk = getPerkById(game, targetId);
  const isStackable = targetPerk?.allocation?.kind === "perkPointsBudget";
  if (build.selectedPerkIds.includes(targetId) && !isStackable) return null;
  if (!canSelectPerk(game, build, targetId)) return null;

  return {
    ...build,
    selectedPerkIds: [...build.selectedPerkIds, targetId],
  };
}

function getSelectedIdsAfterRemoval(
  selected: ReadonlySet<string>,
  rootId: string,
  removeIds: ReadonlySet<string>,
): string[] {
  return [...selected].filter(
    (candidateId) => candidateId !== rootId && !removeIds.has(candidateId),
  );
}

function addSelectedDependentsInStack(
  game: GameData,
  selected: ReadonlySet<string>,
  dependents: Set<string>,
  queue: string[],
  perkId: string,
): void {
  const perk = getPerkById(game, perkId);
  if (!perk) {
    if (selected.has(perkId) && !dependents.has(perkId)) {
      dependents.add(perkId);
      queue.push(perkId);
    }
    return;
  }

  const tree = getPerkTreeForPerk(game, perkId);
  const stack = tree ? getPerkStackAtPosition(tree, perk) : [perk];

  for (const tier of stack) {
    if (!selected.has(tier.id) || dependents.has(tier.id)) continue;
    dependents.add(tier.id);
    queue.push(tier.id);
  }
}

function collectSelectedDependents(
  game: GameData,
  rootId: string,
  selected: ReadonlySet<string>,
): Set<string> {
  const dependents = new Set<string>();
  const queue = [rootId];

  while (queue.length > 0) {
    const current = queue.shift()!;

    for (const id of selected) {
      if (id === rootId || dependents.has(id)) continue;

      const perk = getPerkById(game, id);
      if (!perk) continue;

      const referencesCurrent =
        perk.prerequisites.includes(current) ||
        (perk.prerequisitesAny?.includes(current) ?? false);
      if (!referencesCurrent) continue;

      const remainingSelected = getSelectedIdsAfterRemoval(selected, rootId, dependents);
      const preview: BuildState = { ...createInitialBuildState(), selectedPerkIds: remainingSelected };

      // Keep dependents that still satisfy prerequisites via another OR branch.
      if (!arePrerequisitesMet(game, preview, perk)) {
        addSelectedDependentsInStack(game, selected, dependents, queue, id);
      }
    }
  }

  return dependents;
}

function countPerkAllocations(selectedPerkIds: string[], perkId: string): number {
  return selectedPerkIds.filter((id) => id === perkId).length;
}

function removeOnePerkAllocation(selectedPerkIds: string[], perkId: string): string[] {
  const index = selectedPerkIds.lastIndexOf(perkId);
  if (index < 0) return selectedPerkIds;
  return [...selectedPerkIds.slice(0, index), ...selectedPerkIds.slice(index + 1)];
}

/** Right-click removal: the clicked perk and selected perks further up its dependency chain. */
export function removePerk(game: GameData, build: BuildState, perkId: string): BuildState {
  if (!build.selectedPerkIds.includes(perkId)) {
    return build;
  }

  const perk = getPerkById(game, perkId);
  if (
    perk?.allocation?.kind === "perkPointsBudget" &&
    countPerkAllocations(build.selectedPerkIds, perkId) > 1
  ) {
    return {
      ...build,
      selectedPerkIds: removeOnePerkAllocation(build.selectedPerkIds, perkId),
    };
  }

  const selected = new Set(build.selectedPerkIds);
  const removeIds = new Set<string>([
    perkId,
    ...collectSelectedDependents(game, perkId, selected),
  ]);
  const selectedPerkIds = build.selectedPerkIds.filter((id) => !removeIds.has(id));

  return { ...build, selectedPerkIds };
}

export function togglePerkSelection(
  game: GameData,
  build: BuildState,
  perkId: string,
): BuildState | null {
  const perk = getPerkById(game, perkId);
  if (!perk) return null;

  const tree = getPerkTreeForPerk(game, perkId);
  if (!tree) return null;

  const stack = tree.perks.filter(
    (candidate) =>
      candidate.position.x === perk.position.x && candidate.position.y === perk.position.y,
  );

  if (stack.length > 1) {
    const visible = getVisiblePerkInStack(stack, build.selectedPerkIds);
    const isVisibleSelected = build.selectedPerkIds.includes(visible.id);
    const nextRank = getNextRankInStack(stack, build.selectedPerkIds);

    if (isVisibleSelected) {
      if (nextRank) {
        return allocatePerkInternal(game, build, nextRank.id);
      }
      return deselectPerk(game, build, visible.id);
    }

    const frontId = getFrontPerkIdAtPosition(stack, build.selectedPerkIds);
    return allocatePerkInternal(game, build, frontId);
  }

  if (build.selectedPerkIds.includes(perkId)) {
    return deselectPerk(game, build, perkId);
  }

  return allocatePerkInternal(game, build, perkId);
}

export function deselectPerk(_game: GameData, build: BuildState, perkId: string): BuildState {
  if (!build.selectedPerkIds.includes(perkId)) {
    return build;
  }

  return {
    ...build,
    selectedPerkIds: build.selectedPerkIds.filter((id) => id !== perkId),
  };
}

export function arePrerequisitesMet(_game: GameData, state: BuildState, perk: Perk): boolean {
  const allMet =
    perk.prerequisites.length === 0 ||
    perk.prerequisites.every((id) => state.selectedPerkIds.includes(id));
  const anyMet =
    !perk.prerequisitesAny?.length ||
    perk.prerequisitesAny.some((id) => state.selectedPerkIds.includes(id));
  return allMet && anyMet;
}

export function getSkillLevelForPerk(game: GameData, state: BuildState, perk: Perk): number {
  const skillId = getPerkSkillId(game, perk.id);
  if (!skillId) return 0;
  return getStoredSkillLevel(game, state, skillId);
}

export function canSelectPerk(game: GameData, state: BuildState, perkId: string): boolean {
  const perk = getPerkById(game, perkId);
  if (!perk) return false;
  const alreadySelected = state.selectedPerkIds.includes(perkId);
  const isStackable = perk.allocation?.kind === "perkPointsBudget";
  if (alreadySelected && !isStackable) return true;
  if (!arePrerequisitesMet(game, state, perk)) return false;
  const playerLevelReq = meaningfulPlayerLevelReq(perk.playerLevelReq);
  if (playerLevelReq != null && state.playerLevel < playerLevelReq) return false;

  const skillId = getPerkSkillId(game, perkId);
  if (skillId === DESTINY_SKILL_ID) {
    if (!perk.costsPerkPoint) return true;
    const earned = getEarnedDestinyPerkPoints(game, state);
    const spent = computeDestinyPerkPointsSpent(game, state);
    return spent + 1 <= earned;
  }

  if (getSkillLevelForPerk(game, state, perk) < perk.skillReq) return false;
  if (perkCostsPerkPoint(game, perkId) && getRemainingPerkPoints(game, state) <= 0) {
    return false;
  }
  return true;
}


export function getAttributePointsPerChoice(
  game: GameData,
  stat: keyof Attributes,
): number {
  const index = stat === "health" ? 0 : stat === "magicka" ? 1 : 2;
  return game.mechanics.leveling.attributePointsPerLevel[index];
}

export function getUsedAttributeChoices(state: BuildState): number {
  return (
    state.attributeBonus.health + state.attributeBonus.magicka + state.attributeBonus.stamina
  );
}

export function getEarnedAttributeChoices(game: GameData, state: BuildState): number {
  const { baseLevel } = game.mechanics.leveling;
  const playerLevel = state.playerLevel ?? baseLevel;
  return Math.max(0, playerLevel - baseLevel);
}

export function getRemainingAttributePoints(game: GameData, state: BuildState): number {
  return getEarnedAttributeChoices(game, state) - getUsedAttributeChoices(state);
}

export function canSelectMajorSkill(game: GameData, state: BuildState, skillId: string): boolean {
  if (state.majorSkillIds.includes(skillId)) return true;
  if (state.majorSkillIds.length >= game.manifest.limits.majorSkills) return false;
  if (state.minorSkillIds.includes(skillId)) return false;
  const skill = game.skills.find((s) => s.id === skillId);
  return skill?.majorEligible ?? false;
}

export function canSelectOghmaSkill(
  game: GameData,
  state: BuildState,
  skillId: string,
): boolean {
  if (!isAllocatableSkill(game, skillId)) return false;
  if (state.oghmaSkillIds.includes(skillId)) return true;
  return state.oghmaSkillIds.length < getOghmaSkillLimit(game);
}

export function canSelectMinorSkill(game: GameData, state: BuildState, skillId: string): boolean {
  if (state.minorSkillIds.includes(skillId)) return true;
  if (state.minorSkillIds.length >= game.manifest.limits.minorSkills) return false;
  if (state.majorSkillIds.includes(skillId)) return false;
  const skill = game.skills.find((s) => s.id === skillId);
  return skill?.minorEligible ?? false;
}

export function getTraitLimit(
  game: GameData,
  state: BuildState,
  evaluation?: BuildEvaluation,
): number {
  const traitSlots =
    evaluation?.budgetEffects.traitSlots ??
    sumCollectedBudgetEffects(collectBuildChanges(game, state)).traitSlots;
  return game.manifest.limits.traits + traitSlots;
}

export function canSelectTrait(game: GameData, state: BuildState, traitId: string): boolean {
  if (state.traitIds.includes(traitId)) return true;
  if (isTraitBlockedBySupernatural(game, state, traitId)) return false;
  return state.traitIds.length < getTraitLimit(game, state);
}

export function getRaceById(game: GameData, raceId: string | null): Race | undefined {
  return resolveRace(game, raceId);
}

export function migrateBuildState(
  build: BuildState & { blessingId?: string | null },
): BuildState {
  const withOghma: BuildState = {
    ...build,
    oghmaSkillIds: build.oghmaSkillIds ?? [],
  };
  const withSupernatural = migrateLegacySupernaturalBuild(withOghma);

  if ("blessingId" in withSupernatural && withSupernatural.blessingId !== undefined) {
    const { blessingId, ...rest } = withSupernatural as BuildState & { blessingId?: string | null };
    return {
      ...rest,
      oghmaSkillIds: build.oghmaSkillIds ?? [],
      deityId: blessingId ?? "none",
    };
  }

  return withSupernatural;
}
function stringArraysEqual(a: string[] | undefined, b: string[] | undefined): boolean {
  const left = a ?? [];
  const right = b ?? [];
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function numberArraysEqual(a: number[], b: number[]): boolean {
  return a.length === b.length && a.every((value, index) => value === b[index]);
}

function stringRecordEqual(
  a: Record<string, string> | undefined,
  b: Record<string, string> | undefined,
): boolean {
  const left = a ?? {};
  const right = b ?? {};
  const aKeys = Object.keys(left);
  const bKeys = Object.keys(right);
  if (aKeys.length !== bKeys.length) return false;
  return aKeys.every((key) => left[key] === right[key]);
}

function numberRecordEqual(
  a: Record<string, number> | undefined,
  b: Record<string, number> | undefined,
): boolean {
  const left = a ?? {};
  const right = b ?? {};
  const aKeys = Object.keys(left);
  const bKeys = Object.keys(right);
  if (aKeys.length !== bKeys.length) return false;
  return aKeys.every((key) => left[key] === right[key]);
}

function trainingRangesEqual(
  a: Record<string, number[]> | undefined,
  b: Record<string, number[]> | undefined,
): boolean {
  const left = a ?? {};
  const right = b ?? {};
  const aKeys = Object.keys(left);
  const bKeys = Object.keys(right);
  if (aKeys.length !== bKeys.length) return false;
  return aKeys.every((key) => numberArraysEqual(left[key] ?? [], right[key] ?? []));
}

export function areBuildStatesEqual(a: BuildState, b: BuildState): boolean {
  const aAttrs = a.attributeBonus ?? emptyAttributes();
  const bAttrs = b.attributeBonus ?? emptyAttributes();
  return (
    a.raceId === b.raceId &&
    a.birthsignId === b.birthsignId &&
    a.deityId === b.deityId &&
    stringArraysEqual(a.traitIds, b.traitIds) &&
    stringArraysEqual(a.majorSkillIds, b.majorSkillIds) &&
    stringArraysEqual(a.minorSkillIds, b.minorSkillIds) &&
    stringArraysEqual(a.oghmaSkillIds, b.oghmaSkillIds) &&
    aAttrs.health === bAttrs.health &&
    aAttrs.magicka === bAttrs.magicka &&
    aAttrs.stamina === bAttrs.stamina &&
    stringRecordEqual(a.characterOptionChoices, b.characterOptionChoices) &&
    stringArraysEqual(a.selectedPerkIds, b.selectedPerkIds) &&
    numberRecordEqual(a.skillLevels, b.skillLevels) &&
    trainingRangesEqual(a.skillTrainingRanges, b.skillTrainingRanges) &&
    a.playerLevel === b.playerLevel &&
    (a.description ?? "") === (b.description ?? "")
  );
}

export function createInitialBuildState(): BuildState {
  return {
    raceId: "none",
    birthsignId: "none",
    deityId: "none",
    traitIds: [],
    majorSkillIds: [],
    minorSkillIds: [],
    oghmaSkillIds: [],
    attributeBonus: emptyAttributes(),
    characterOptionChoices: {},
    selectedPerkIds: [],
    skillLevels: {},
    skillTrainingRanges: {},
    playerLevel: 1,
    description: "",
  };
}
