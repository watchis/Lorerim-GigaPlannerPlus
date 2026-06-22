import type { Effect, GameData, Mechanics, Perk, PerkTree, Race, SkillLevelBaseline } from "@/data/schemas";
import {
  getFrontPerkIdAtPosition,
  getNextRankInStack,
  getVisiblePerkInStack,
} from "@/lib/perkTreeGrid";

export interface Attributes {
  health: number;
  magicka: number;
  stamina: number;
}

export interface BuildState {
  raceId: string | null;
  standingStoneId: string | null;
  blessingId: string | null;
  traitIds: string[];
  majorSkillIds: string[];
  minorSkillIds: string[];
  attributeBonus: Attributes;
  selectedPerkIds: string[];
  skillLevels: Record<string, number>;
  playerLevel: number;
  description: string;
}

export interface BuildReconcileOptions {
  /** Force allocation: ignore skill-point budget when raising skill levels. */
  ignoreSkillPointCap?: boolean;
  /** Force allocation: ignore perk-point budget when selecting perks. */
  ignorePerkPointCap?: boolean;
}

export interface SkillReqConflictPerk {
  id: string;
  name: string;
  skillReq: number;
}

export interface SkillReqConflict {
  skillId: string;
  skillLevel: number;
  droppedPerks: SkillReqConflictPerk[];
}

export interface DerivedStatResult {
  id: string;
  label: string;
  value: number;
  isPercent: boolean;
}

export interface ComputedBuild {
  attributes: Attributes;
  carryWeight: number;
  unarmedDamage: number;
  moveSpeedBonus: number;
  derivedStats: DerivedStatResult[];
  skillLevels: Record<string, number>;
  playerLevel: number;
  skillPointsSpent: number;
  skillPointsRemaining: number;
  skillPointsPerLevel: number;
  perkPointsSpent: number;
  perkPointsRemaining: number;
  perkPointsPerLevel: number;
}

function emptyAttributes(): Attributes {
  return { health: 0, magicka: 0, stamina: 0 };
}

function applyEffect(attributes: Attributes, derived: Record<string, number>, effect: Effect): void {
  if (effect.type === "skillPointsPerLevel") return;
  if (effect.type === "attribute") {
    attributes[effect.stat] += effect.value;
    return;
  }
  derived[effect.stat] = (derived[effect.stat] ?? 0) + effect.value;
}

function resolveRace(game: GameData, raceId: string | null): Race | undefined {
  if (!raceId || raceId === "none") return undefined;
  return game.races.find((race) => race.id === raceId);
}

function collectEffects(game: GameData, state: BuildState): Effect[] {
  const effects: Effect[] = [];

  const race = resolveRace(game, state.raceId);
  if (race) effects.push(...race.effects);

  const stone = game.standingStones.find((s) => s.id === state.standingStoneId);
  if (stone) effects.push(...stone.effects);

  const blessing = game.blessings.find((b) => b.id === state.blessingId);
  if (blessing) effects.push(...blessing.effects);

  for (const traitId of state.traitIds) {
    const trait = game.traits.find((t) => t.id === traitId);
    if (trait) effects.push(...trait.effects);
  }

  for (const perkId of state.selectedPerkIds) {
    for (const tree of Object.values(game.perkTrees)) {
      const perk = tree.perks.find((p) => p.id === perkId);
      if (perk) effects.push(...perk.effects);
    }
  }

  return effects;
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

/** Highest skill level allowed for the current build: min(maxSkillLevel, player level + maxSkillAbovePlayerLevel). */
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
): number {
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
): number {
  const base = getSkillLevelBaseline(game, state, skillId, baseline);
  return Math.max(0, level - base);
}

export function getSkillPointsPerLevel(game: GameData, state: BuildState): number {
  let bonus = 0;

  for (const traitId of state.traitIds) {
    const trait = game.traits.find((entry) => entry.id === traitId);
    if (!trait) continue;

    for (const effect of trait.effects) {
      if (effect.type === "skillPointsPerLevel") {
        bonus += effect.value;
      }
    }
  }

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

export function getStoredSkillLevel(game: GameData, state: BuildState, skillId: string): number {
  const floor = getSkillFloor(game, state, skillId);
  const stored = state.skillLevels[skillId] ?? floor;
  return Math.min(getMaxAllowedSkillLevel(game, state), Math.max(floor, stored));
}

function computePaidSkillPoints(
  game: GameData,
  state: BuildState,
  skillId: string,
  level: number,
): number {
  const { skillPointBaseline, skillPointFreeThroughFloor } = game.mechanics.leveling;
  const pointBase = getSkillLevelBaseline(game, state, skillId, skillPointBaseline);
  const floor = getSkillFloor(game, state, skillId);
  const maxSkill = getMaxAllowedSkillLevel(game, state);
  const effectiveLevel = Math.max(floor, Math.min(maxSkill, level));
  const totalFromBase = computeSkillPointsToReach(game.mechanics, pointBase, effectiveLevel);

  if (!skillPointFreeThroughFloor) {
    return Math.max(0, totalFromBase);
  }

  const freeSetup = computeSkillPointsToReach(
    game.mechanics,
    pointBase,
    Math.max(pointBase, floor),
  );
  return Math.max(0, totalFromBase - freeSetup);
}

export function computeTotalSkillPointsForLevels(
  game: GameData,
  state: BuildState,
  levels: Record<string, number>,
): number {
  let total = 0;

  for (const skillId of game.manifest.skills) {
    if (!isAllocatableSkill(game, skillId)) continue;
    const floor = getSkillFloor(game, state, skillId);
    total += computePaidSkillPoints(game, state, skillId, levels[skillId] ?? floor);
  }

  return total;
}

export function computeSkillPointsSpentOnSkill(
  game: GameData,
  state: BuildState,
  skillId: string,
): number {
  const floor = getSkillFloor(game, state, skillId);
  const current = computeSkillLevels(game, state)[skillId] ?? floor;
  return computePaidSkillPoints(game, state, skillId, current);
}

export function computeTotalSkillPointsSpent(game: GameData, state: BuildState): number {
  const levels = computeSkillLevels(game, state);
  return computeTotalSkillPointsForLevels(game, state, levels);
}

export function getEarnedSkillPoints(game: GameData, state: BuildState): number {
  const { baseLevel } = game.mechanics.leveling;
  const playerLevel = state.playerLevel ?? baseLevel;
  const levelsAboveBase = Math.max(0, playerLevel - baseLevel);
  return levelsAboveBase * getSkillPointsPerLevel(game, state);
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

export function getEarnedPerkPoints(game: GameData, state: BuildState): number {
  const { baseLevel } = game.mechanics.leveling;
  const playerLevel = state.playerLevel ?? baseLevel;
  const levelsAboveBase = Math.max(0, playerLevel - baseLevel);
  return (
    getInitialPerkPoints(game) + levelsAboveBase * getPerkPointsPerLevel(game)
  );
}

export function computePerkPointsSpent(game: GameData, state: BuildState): number {
  return state.selectedPerkIds.filter((perkId) => perkCostsPerkPoint(game, perkId)).length;
}

export function getRemainingPerkPoints(game: GameData, state: BuildState): number {
  return getEarnedPerkPoints(game, state) - computePerkPointsSpent(game, state);
}

export function filterPerksByPerkPointBudget(
  game: GameData,
  state: BuildState,
  selectedPerkIds: string[],
): string[] {
  const earned = getEarnedPerkPoints(game, state);
  const costingIds = selectedPerkIds.filter((perkId) => perkCostsPerkPoint(game, perkId));
  if (costingIds.length <= earned) return selectedPerkIds;

  const dropSet = new Set(costingIds.slice(earned));
  return selectedPerkIds.filter((perkId) => !dropSet.has(perkId));
}

export function getMaxAffordableSkillLevel(
  game: GameData,
  state: BuildState,
  skillId: string,
): number {
  const floor = getSkillFloor(game, state, skillId);
  const earned = getEarnedSkillPoints(game, state);
  const storedLevels: Record<string, number> = {};

  for (const id of game.manifest.skills) {
    if (!isAllocatableSkill(game, id)) continue;
    storedLevels[id] = getStoredSkillLevel(game, state, id);
  }

  let max = floor;
  const maxSkill = getMaxAllowedSkillLevel(game, state);
  for (let level = floor + 1; level <= maxSkill; level++) {
    const trialLevels = { ...storedLevels, [skillId]: level };
    if (computeTotalSkillPointsForLevels(game, state, trialLevels) <= earned) {
      max = level;
    } else {
      break;
    }
  }

  return max;
}

export function clampPlayerLevel(game: GameData, level: number): number {
  const { baseLevel, maxPlayerLevel } = game.mechanics.leveling;
  return Math.min(maxPlayerLevel, Math.max(baseLevel, Math.floor(level)));
}

export function getRequiredPlayerLevelFromSkills(game: GameData, state: BuildState): number {
  const { baseLevel, maxSkillAbovePlayerLevel } = game.mechanics.leveling;
  let required = baseLevel;

  for (const skillId of game.manifest.skills) {
    if (!isAllocatableSkill(game, skillId)) continue;
    const level = getStoredSkillLevel(game, state, skillId);
    required = Math.max(required, level - maxSkillAbovePlayerLevel);
  }

  return clampPlayerLevel(game, required);
}

export function reconcileBuild(
  game: GameData,
  build: BuildState,
  options?: BuildReconcileOptions,
): BuildState {
  const playerLevel = Math.max(
    build.playerLevel ?? game.mechanics.leveling.baseLevel,
    getRequiredPlayerLevelFromSkills(game, build),
  );

  return normalizeBuildSkillLevels(
    game,
    {
      ...build,
      playerLevel: clampPlayerLevel(game, playerLevel),
    },
    options,
  );
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
  options?: BuildReconcileOptions,
): number {
  const floor = getSkillFloor(game, state, skillId);
  const bounded = Math.min(getMaxAllowedSkillLevel(game, state), Math.max(floor, level));
  if (options?.ignoreSkillPointCap) {
    return bounded;
  }
  return Math.min(bounded, getMaxAffordableSkillLevel(game, state, skillId));
}

export function computeSkillLevels(
  game: GameData,
  state: BuildState,
  options?: BuildReconcileOptions,
): Record<string, number> {
  const levels: Record<string, number> = {};

  for (const skillId of game.manifest.skills) {
    if (!isAllocatableSkill(game, skillId)) continue;
    const floor = getSkillFloor(game, state, skillId);
    const stored = state.skillLevels[skillId] ?? floor;
    levels[skillId] = clampSkillLevel(game, state, skillId, stored, options);
  }

  return levels;
}

export function filterPerksBySkillLevels(
  game: GameData,
  state: BuildState,
  selectedPerkIds: string[],
  options?: BuildReconcileOptions,
): string[] {
  const skillLevels = computeSkillLevels(game, state, options);

  return selectedPerkIds.filter((perkId) => {
    const perk = getPerkById(game, perkId);
    if (!perk) return false;
    const tree = Object.values(game.perkTrees).find((t) => t.perks.some((p) => p.id === perkId));
    if (!tree) return false;
    return skillLevels[tree.skillId] >= perk.skillReq;
  });
}

/** Perks removed because the reconciled build no longer meets their skill requirement. */
export function getPerksDroppedBelowSkillRequirement(
  game: GameData,
  previousBuild: BuildState,
  nextBuild: BuildState,
): Perk[] {
  const removedIds = previousBuild.selectedPerkIds.filter(
    (id) => !nextBuild.selectedPerkIds.includes(id),
  );

  return removedIds.flatMap((perkId) => {
    const perk = getPerkById(game, perkId);
    if (!perk) return [];

    const skillId = getPerkSkillId(game, perkId);
    if (!skillId) return [];

    const skillLevel = getStoredSkillLevel(game, nextBuild, skillId);
    return skillLevel < perk.skillReq ? [perk] : [];
  });
}

export function createSkillReqConflict(
  game: GameData,
  nextBuild: BuildState,
  droppedPerks: Perk[],
): SkillReqConflict | null {
  if (droppedPerks.length === 0) return null;

  const skillId = getPerkSkillId(game, droppedPerks[0].id);
  if (!skillId) return null;

  return {
    skillId,
    skillLevel: getStoredSkillLevel(game, nextBuild, skillId),
    droppedPerks: droppedPerks.map((perk) => ({
      id: perk.id,
      name: perk.name,
      skillReq: perk.skillReq,
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
    const floor = getSkillFloor(game, build, skillId);
    const stored = skillLevels[skillId] ?? floor;
    skillLevels[skillId] = clampSkillLevel(game, build, skillId, stored, options);
  }

  const nextBuild = { ...build, skillLevels };
  let normalized: BuildState = {
    ...nextBuild,
    selectedPerkIds: filterPerksBySkillLevels(game, nextBuild, build.selectedPerkIds, options),
  };

  if (!options?.ignorePerkPointCap) {
    normalized = {
      ...normalized,
      selectedPerkIds: filterPerksByPerkPointBudget(
        game,
        normalized,
        normalized.selectedPerkIds,
      ),
    };
  }

  return normalized;
}

export function computeBuild(game: GameData, state: BuildState): ComputedBuild {
  const race = resolveRace(game, state.raceId);
  const baseAttributes = race
    ? {
        health: race.startingAttributes.health + race.attributeBonus.health,
        magicka: race.startingAttributes.magicka + race.attributeBonus.magicka,
        stamina: race.startingAttributes.stamina + race.attributeBonus.stamina,
      }
    : emptyAttributes();

  const attributes: Attributes = {
    health: baseAttributes.health + state.attributeBonus.health,
    magicka: baseAttributes.magicka + state.attributeBonus.magicka,
    stamina: baseAttributes.stamina + state.attributeBonus.stamina,
  };

  const derivedBonuses: Record<string, number> = {};
  for (const effect of collectEffects(game, state)) {
    applyEffect(emptyAttributes(), derivedBonuses, effect);
  }

  for (const effect of collectEffects(game, state)) {
    if (effect.type === "attribute") {
      attributes[effect.stat] += effect.value;
    }
  }

  const derivedStats = computeDerivedStats(game.mechanics, attributes, derivedBonuses);
  const skillLevels = computeSkillLevels(game, state);
  const skillPointsPerLevel = getSkillPointsPerLevel(game, state);
  const skillPointsSpent = computeTotalSkillPointsSpent(game, state);
  const skillPointsRemaining = getEarnedSkillPoints(game, state) - skillPointsSpent;
  const perkPointsPerLevel = getPerkPointsPerLevel(game);
  const perkPointsSpent = computePerkPointsSpent(game, state);
  const perkPointsRemaining = getEarnedPerkPoints(game, state) - perkPointsSpent;

  return {
    attributes,
    carryWeight: race?.startingCarryWeight ?? 0,
    unarmedDamage: race?.unarmedDamage ?? 0,
    moveSpeedBonus: race?.speedBonus ?? 0,
    derivedStats,
    skillLevels,
    playerLevel: state.playerLevel,
    skillPointsSpent,
    skillPointsRemaining,
    skillPointsPerLevel,
    perkPointsSpent,
    perkPointsRemaining,
    perkPointsPerLevel,
  };
}

export function getOrderedPerkTrees(game: GameData): PerkTree[] {
  return game.manifest.skills
    .map((skillId) => game.perkTrees[skillId])
    .filter((tree): tree is PerkTree => tree !== undefined);
}

export function getPerkById(game: GameData, perkId: string): Perk | undefined {
  for (const tree of Object.values(game.perkTrees)) {
    const perk = tree.perks.find((p) => p.id === perkId);
    if (perk) return perk;
  }
  return undefined;
}

export function getPerkSkillId(game: GameData, perkId: string): string | undefined {
  for (const [skillId, tree] of Object.entries(game.perkTrees)) {
    if (tree.perks.some((perk) => perk.id === perkId)) {
      return skillId;
    }
  }
  return undefined;
}

function getPerkTreeForPerk(game: GameData, perkId: string): PerkTree | undefined {
  const skillId = getPerkSkillId(game, perkId);
  return skillId ? game.perkTrees[skillId] : undefined;
}

/** Lower tiers at the same grid cell, ordered from root (lowest skillReq) upward. */
function getLowerStackTiers(game: GameData, perk: Perk): Perk[] {
  const tree = getPerkTreeForPerk(game, perk.id);
  if (!tree) return [];

  return tree.perks
    .filter(
      (candidate) =>
        candidate.position.x === perk.position.x &&
        candidate.position.y === perk.position.y &&
        candidate.skillReq < perk.skillReq,
    )
    .sort((a, b) => a.skillReq - b.skillReq);
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
  if (state.selectedPerkIds.includes(perkId)) return true;
  if (!arePrerequisitesMet(game, state, perk)) return false;

  const skillId = getPerkSkillId(game, perkId);
  if (!skillId) return false;

  return getStoredSkillLevel(game, state, skillId) >= perk.skillReq;
}

const FORCE_ALLOCATE_OPTIONS: BuildReconcileOptions = {
  ignoreSkillPointCap: true,
  ignorePerkPointCap: true,
};

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

  if (next.selectedPerkIds.includes(perkId)) {
    return next;
  }

  const skillId = getPerkSkillId(game, perkId);
  if (!skillId) return null;

  const currentLevel = getStoredSkillLevel(game, next, skillId);
  if (currentLevel < perk.skillReq) {
    const ensured = ensureSkillLevelForAllocation(game, next, skillId, perk.skillReq);
    if (!ensured) return null;
    next = ensured;
  }

  if (!canForceSelectPerk(game, next, perkId)) return null;

  return reconcileBuild(
    game,
    {
      ...next,
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
  const floor = getSkillFloor(game, build, skillId);
  const clampedTarget = Math.min(getMaxAllowedSkillLevel(game, build), Math.max(floor, targetLevel));

  let next: BuildState = {
    ...build,
    skillLevels: { ...build.skillLevels, [skillId]: clampedTarget },
  };
  next = reconcileBuild(game, next, FORCE_ALLOCATE_OPTIONS);

  let actual = getStoredSkillLevel(game, next, skillId);
  if (actual >= clampedTarget) {
    return next;
  }

  const { maxPlayerLevel } = game.mechanics.leveling;
  let playerLevel = next.playerLevel;

  while (playerLevel < maxPlayerLevel) {
    playerLevel += 1;
    next = reconcileBuild(
      game,
      {
        ...next,
        playerLevel,
        skillLevels: { ...next.skillLevels, [skillId]: clampedTarget },
      },
      FORCE_ALLOCATE_OPTIONS,
    );
    actual = getStoredSkillLevel(game, next, skillId);
    if (actual >= clampedTarget) {
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

export function allocatePerk(game: GameData, build: BuildState, perkId: string): BuildState | null {
  return allocatePerkInternal(game, build, perkId);
}

/** Single-click take: no auto prereqs or skill-level bumps (original tryTakePerk). */
export function tryTakePerk(game: GameData, build: BuildState, perkId: string): BuildState | null {
  const perk = getPerkById(game, perkId);
  if (!perk) return null;
  if (build.selectedPerkIds.includes(perkId)) return null;
  if (!canSelectPerk(game, build, perkId)) return null;

  return reconcileBuild(game, {
    ...build,
    selectedPerkIds: [...build.selectedPerkIds, perkId],
  });
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

      const dependsOnCurrent =
        perk.prerequisites.includes(current) ||
        (perk.prerequisitesAny?.includes(current) ?? false);

      if (dependsOnCurrent) {
        dependents.add(id);
        queue.push(id);
      }
    }
  }

  return dependents;
}

/** Right-click removal: the clicked perk and selected perks further up its dependency chain. */
export function removePerk(game: GameData, build: BuildState, perkId: string): BuildState {
  if (!build.selectedPerkIds.includes(perkId)) {
    return build;
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
  const tree = Object.values(game.perkTrees).find((t) => t.perks.some((p) => p.id === perk.id));
  if (!tree) return 0;
  return computeSkillLevels(game, state)[tree.skillId] ?? 0;
}

export function canSelectPerk(game: GameData, state: BuildState, perkId: string): boolean {
  const perk = getPerkById(game, perkId);
  if (!perk) return false;
  if (state.selectedPerkIds.includes(perkId)) return true;
  if (!arePrerequisitesMet(game, state, perk)) return false;
  if (getSkillLevelForPerk(game, state, perk) < perk.skillReq) return false;
  if (perk.playerLevelReq != null && state.playerLevel < perk.playerLevelReq) return false;
  if (perkCostsPerkPoint(game, perkId) && getRemainingPerkPoints(game, state) <= 0) {
    return false;
  }
  return true;
}

export function getRemainingAttributePoints(game: GameData, state: BuildState): number {
  const total = game.manifest.limits.initialAttributePoints;
  const used =
    state.attributeBonus.health + state.attributeBonus.magicka + state.attributeBonus.stamina;
  return Math.max(0, total - used);
}

export function canSelectMajorSkill(game: GameData, state: BuildState, skillId: string): boolean {
  if (state.majorSkillIds.includes(skillId)) return true;
  if (state.majorSkillIds.length >= game.manifest.limits.majorSkills) return false;
  if (state.minorSkillIds.includes(skillId)) return false;
  const skill = game.skills.find((s) => s.id === skillId);
  return skill?.majorEligible ?? false;
}

export function canSelectMinorSkill(game: GameData, state: BuildState, skillId: string): boolean {
  if (state.minorSkillIds.includes(skillId)) return true;
  if (state.minorSkillIds.length >= game.manifest.limits.minorSkills) return false;
  if (state.majorSkillIds.includes(skillId)) return false;
  const skill = game.skills.find((s) => s.id === skillId);
  return skill?.minorEligible ?? false;
}

export function canSelectTrait(game: GameData, state: BuildState, traitId: string): boolean {
  if (state.traitIds.includes(traitId)) return true;
  return state.traitIds.length < game.manifest.limits.traits;
}

export function getRaceById(game: GameData, raceId: string | null): Race | undefined {
  return resolveRace(game, raceId);
}

export function createInitialBuildState(): BuildState {
  return {
    raceId: "none",
    standingStoneId: "none",
    blessingId: "none",
    traitIds: [],
    majorSkillIds: [],
    minorSkillIds: [],
    attributeBonus: emptyAttributes(),
    selectedPerkIds: [],
    skillLevels: {},
    playerLevel: 1,
    description: "",
  };
}
