import type { GameData, Mechanics } from "@/data/schemas";
import type { BuildState } from "@/engine/buildEngine";

export interface TrainingTierDefinition {
  minLevel: number;
  maxLevel: number;
  tierCapacity: number;
}

export function getMaxTrainingSkillLevel(game: GameData): number {
  return game.mechanics.leveling.maxTrainingSkillLevel;
}

export function getTrainingTierDefinitions(game: GameData): TrainingTierDefinition[] {
  const maxTraining = getMaxTrainingSkillLevel(game);

  return game.mechanics.leveling.skillLevelCosts
    .filter((tier) => tier.minLevel <= maxTraining)
    .map((tier) => {
      const maxLevel = Math.min(tier.maxLevel, maxTraining);
      return {
        minLevel: tier.minLevel,
        maxLevel,
        tierCapacity: maxLevel - tier.minLevel + 1,
      };
    });
}

export function formatTrainingTierRange(tier: TrainingTierDefinition): string {
  return `${tier.minLevel}–${tier.maxLevel}`;
}

export function getSkillTrainingRanges(
  game: GameData,
  state: BuildState,
  skillId: string,
): number[] {
  const tierCount = getTrainingTierDefinitions(game).length;
  const stored = state.skillTrainingRanges?.[skillId] ?? [];
  return Array.from({ length: tierCount }, (_, index) => Math.max(0, stored[index] ?? 0));
}

export function sumTrainingRanges(ranges: number[]): number {
  return ranges.reduce((total, count) => total + count, 0);
}

export function hasSkillTrainingAssigned(
  game: GameData,
  state: BuildState,
  skillId: string,
): boolean {
  return sumTrainingRanges(getSkillTrainingRanges(game, state, skillId)) > 0;
}

/** Skill points waived by training: one tier cost per trained level in that tier. */
export function computeTrainingSkillPointCredit(
  mechanics: Mechanics,
  game: GameData,
  ranges: number[],
): number {
  const tiers = getTrainingTierDefinitions(game);

  return tiers.reduce((total, tier, index) => {
    const count = ranges[index] ?? 0;
    if (count <= 0) return total;

    const tierCost =
      mechanics.leveling.skillLevelCosts.find(
        (entry) => tier.minLevel >= entry.minLevel && tier.minLevel <= entry.maxLevel,
      )?.cost ?? mechanics.leveling.skillLevelCosts.at(-1)!.cost;

    return total + count * tierCost;
  }, 0);
}

export function distributeTrainingCountAcrossTiers(
  game: GameData,
  count: number,
): number[] {
  const tiers = getTrainingTierDefinitions(game);
  const ranges = tiers.map(() => 0);
  let remaining = Math.max(0, count);

  for (let index = 0; index < tiers.length && remaining > 0; index++) {
    const assign = Math.min(remaining, tiers[index].tierCapacity);
    ranges[index] = assign;
    remaining -= assign;
  }

  return ranges;
}

export function trimTrainingRangesToBudget(
  game: GameData,
  ranges: number[],
  maxTotal: number,
): number[] {
  const tiers = getTrainingTierDefinitions(game);
  const next = ranges.map((count, index) =>
    Math.min(Math.max(0, count), tiers[index]?.tierCapacity ?? 0),
  );
  let total = sumTrainingRanges(next);
  if (total <= maxTotal) return next;

  for (let index = next.length - 1; index >= 0 && total > maxTotal; index--) {
    const removable = Math.min(next[index], total - maxTotal);
    next[index] -= removable;
    total -= removable;
  }

  return next;
}

export function getMaxTrainingOnSkill(
  game: GameData,
  _state: BuildState,
  _skillId: string,
  floor: number,
): number {
  return Math.max(0, getMaxTrainingSkillLevel(game) - floor);
}

export function clampTrainingRangeCount(
  game: GameData,
  state: BuildState,
  skillId: string,
  tierIndex: number,
  count: number,
  floor: number,
  currentRanges: number[],
): number {
  const tiers = getTrainingTierDefinitions(game);
  const tier = tiers[tierIndex];
  if (!tier) return 0;

  const otherTotal = sumTrainingRanges(
    currentRanges.map((value, index) => (index === tierIndex ? 0 : value)),
  );
  const maxOnSkill = getMaxTrainingOnSkill(game, state, skillId, floor);

  return Math.min(
    Math.max(0, Math.floor(count)),
    tier.tierCapacity,
    maxOnSkill - otherTotal,
  );
}

export function getSkillLevelRequiredForTrainingRanges(
  game: GameData,
  floor: number,
  ranges: number[],
): number {
  const tiers = getTrainingTierDefinitions(game);
  let required = floor;

  for (let index = 0; index < tiers.length; index++) {
    const count = ranges[index] ?? 0;
    if (count <= 0) continue;
    required = Math.max(required, tiers[index].minLevel + count - 1);
  }

  return Math.min(getMaxTrainingSkillLevel(game), required);
}

export function migrateLegacySkillTrainingCounts(
  game: GameData,
  legacyCounts: Record<string, number>,
): Record<string, number[]> {
  const migrated: Record<string, number[]> = {};

  for (const [skillId, count] of Object.entries(legacyCounts)) {
    if (count <= 0) continue;
    migrated[skillId] = distributeTrainingCountAcrossTiers(game, count);
  }

  return migrated;
}
