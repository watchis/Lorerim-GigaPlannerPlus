import { describe, expect, it } from "vitest";
import {
  applySkillTrainingRangeChange,
  clampPlayerLevel,
  computeBuild,
  computeSkillPointsToReach,
  computeSkillPointsSpentOnSkill,
  createInitialBuildState,
  ensurePlayerLevelForBuild,
  getEarnedDestinyPerkPoints,
  getEarnedPerkPoints,
  getEarnedSkillPoints,
  getMaxAllowedSkillLevel,
  getMinimumPlayerLevelForBuild,
  getRemainingPerkPoints,
  getRemainingSkillPoints,
  getRemainingTrainingLevels,
  getRequiredPlayerLevel,
  getRequiredPlayerLevelFromTraining,
  getSkillLevelIncreaseCost,
  getTrainingBudgetConflict,
  normalizeSkillTraining,
  preserveSkillPointAllocations,
  reconcileBuild,
  canSelectPerk,
  arePrerequisitesMet,
  getPerkById,
  removePerk,
} from "@/engine/buildEngine";
import { createTestBuildState, getTestGameData } from "@/test/helpers";

describe("buildEngine economy", () => {
  const game = getTestGameData();

  it("caps skill level by player level and mechanics", () => {
    const state = createTestBuildState({ playerLevel: 10 });
    expect(getMaxAllowedSkillLevel(game, state)).toBe(60);
  });

  it("computes perk point budget from initial points and levels gained", () => {
    const state = createTestBuildState({ playerLevel: 10 });
    expect(getEarnedPerkPoints(game, state)).toBe(12);
  });

  it("computes earned skill points from player level", () => {
    const state = createTestBuildState({ playerLevel: 5 });
    expect(getEarnedSkillPoints(game, state)).toBe(120);
  });

  it("uses tiered skill level costs", () => {
    const { mechanics } = game;
    expect(getSkillLevelIncreaseCost(mechanics, 10)).toBe(1);
    expect(getSkillLevelIncreaseCost(mechanics, 26)).toBe(2);
    expect(getSkillLevelIncreaseCost(mechanics, 76)).toBe(6);
  });

  it("sums skill point costs across level ranges", () => {
    const { mechanics } = game;
    expect(computeSkillPointsToReach(mechanics, 20, 25)).toBe(5);
    expect(computeSkillPointsToReach(mechanics, 25, 27)).toBe(4);
  });

  it("grants destiny points at levels 1, 5, 10, and caps at 7", () => {
    expect(getEarnedDestinyPerkPoints(game, createTestBuildState({ playerLevel: 1 }))).toBe(1);
    expect(getEarnedDestinyPerkPoints(game, createTestBuildState({ playerLevel: 5 }))).toBe(2);
    expect(getEarnedDestinyPerkPoints(game, createTestBuildState({ playerLevel: 30 }))).toBe(7);
  });

  it("waives one tier cost per training level instead of a free-through level", () => {
    const state = createTestBuildState({
      raceId: "nord",
      majorSkillIds: ["block"],
      playerLevel: 30,
      skillLevels: { block: 30 },
    });

    const spentBefore = computeSkillPointsSpentOnSkill(game, state, "block");
    expect(spentBefore).toBe(15);

    const withTraining = applySkillTrainingRangeChange(game, state, "block", 0, 1);

    expect(computeSkillPointsSpentOnSkill(game, withTraining, "block")).toBe(14);
    expect(getRemainingSkillPoints(game, withTraining)).toBe(
      getRemainingSkillPoints(game, state) + 1,
    );
  });

  it("allows training above the earned budget and reports negative remaining", () => {
    let state = createTestBuildState({
      raceId: "nord",
      majorSkillIds: ["block"],
      playerLevel: 5,
      skillLevels: { block: 25 },
    });

    state = applySkillTrainingRangeChange(game, state, "block", 0, 25);
    state = applySkillTrainingRangeChange(game, state, "block", 1, 5);
    const computed = computeBuild(game, state);

    expect(computed.trainingLevelsUsed).toBe(30);
    expect(computed.trainingLevelsRemaining).toBe(-5);
    expect(state.playerLevel).toBe(5);
  });
});

describe("player level cap", () => {
  const game = getTestGameData();

  it("loads easy mode cap and standard max from mechanics data", () => {
    expect(game.mechanics.leveling.maxPlayerLevel).toBe(201);
    expect(game.mechanics.leveling.standardMaxPlayerLevel).toBe(101);
  });

  it("clamps player level to the configured max and base", () => {
    expect(clampPlayerLevel(game, 1)).toBe(1);
    expect(clampPlayerLevel(game, 201)).toBe(201);
    expect(clampPlayerLevel(game, 250)).toBe(201);
    expect(clampPlayerLevel(game, 0)).toBe(1);
  });
});

describe("training budget conflicts", () => {
  const game = getTestGameData();

  it("returns null when training is within the earned budget", () => {
    const state = createTestBuildState({
      raceId: "nord",
      majorSkillIds: ["block"],
      playerLevel: 5,
      skillLevels: { block: 25 },
      skillTrainingRanges: { block: [20, 0, 0, 0] },
    });

    expect(getTrainingBudgetConflict(game, state, 5)).toBeNull();
    expect(getRemainingTrainingLevels(game, state)).toBe(5);
  });

  it("reports a conflict when training exceeds earned levels at the current player level", () => {
    const state = createTestBuildState({
      raceId: "nord",
      majorSkillIds: ["block"],
      playerLevel: 5,
      skillLevels: { block: 30 },
      skillTrainingRanges: { block: [25, 5, 0, 0] },
    });

    expect(getTrainingBudgetConflict(game, state, 5)).toEqual({
      trainingUsed: 30,
      trainingEarned: 25,
      requiredLevel: 6,
    });
  });

  it("preserves over-budget training during normalize", () => {
    const state = createTestBuildState({
      raceId: "nord",
      majorSkillIds: ["block"],
      playerLevel: 5,
      skillLevels: { block: 30 },
      skillTrainingRanges: { block: [25, 5, 0, 0] },
    });

    const normalized = normalizeSkillTraining(game, state);
    expect(normalized.skillTrainingRanges.block).toEqual([25, 5, 0, 0]);
    expect(computeBuild(game, normalized).trainingLevelsRemaining).toBe(-5);
  });

  it("still trims training to the per-skill cap during normalize", () => {
    const state = createTestBuildState({
      raceId: "nord",
      majorSkillIds: ["block"],
      playerLevel: 30,
      skillLevels: { block: 25 },
      skillTrainingRanges: { block: [25, 25, 25, 25] },
    });

    const normalized = normalizeSkillTraining(game, state);
    expect(normalized.skillTrainingRanges.block).toEqual([25, 25, 20, 0]);
    expect(computeBuild(game, normalized).trainingLevelsRemaining).toBeGreaterThanOrEqual(0);
  });

  it("excludes training from getRequiredPlayerLevel but includes it in minimum build level", () => {
    const state = createTestBuildState({
      raceId: "nord",
      majorSkillIds: ["block"],
      playerLevel: 5,
      skillLevels: { block: 30 },
      skillTrainingRanges: { block: [25, 5, 0, 0] },
    });

    expect(getRequiredPlayerLevelFromTraining(game, state)).toBe(6);
    expect(getMinimumPlayerLevelForBuild(game, state)).toBe(6);
    expect(getRequiredPlayerLevel(game, state)).toBeLessThan(
      getMinimumPlayerLevelForBuild(game, state),
    );
  });
});

describe("ensurePlayerLevelForBuild", () => {
  const game = getTestGameData();

  it("raises level for perk point budget when ensureMinimumPlayerLevel is set", () => {
    const state = createTestBuildState({
      playerLevel: 5,
      selectedPerkIds: [
        "block-improved-blocking",
        "destruction-novice-destruction",
        "evasion-agility",
        "conjuration-novice-conjuration",
        "restoration-novice-restoration",
        "illusion-novice-illusion",
        "two-handed-great-weapon-mastery",
        "marksman-ranged-combat-training",
        "alchemy-alchemical-lore",
      ],
    });

    expect(getRemainingPerkPoints(game, state)).toBeLessThan(0);
    expect(getRequiredPlayerLevel(game, state)).toBeLessThan(
      getMinimumPlayerLevelForBuild(game, state),
    );

    const withoutFlag = ensurePlayerLevelForBuild(game, state);
    expect(withoutFlag.playerLevel).toBe(5);
    expect(getRemainingPerkPoints(game, withoutFlag)).toBeLessThan(0);

    const withFlag = ensurePlayerLevelForBuild(game, state, { ensureMinimumPlayerLevel: true });
    expect(withFlag.playerLevel).toBe(7);
    expect(getRemainingPerkPoints(game, withFlag)).toBeGreaterThanOrEqual(0);
  });

  it("keeps level when training exceeds budget unless ensureMinimumPlayerLevel is set", () => {
    const state = createTestBuildState({
      raceId: "nord",
      majorSkillIds: ["block"],
      playerLevel: 5,
      skillLevels: { block: 30 },
      skillTrainingRanges: { block: [25, 5, 0, 0] },
    });

    expect(computeBuild(game, state).trainingLevelsRemaining).toBe(-5);
    expect(getRequiredPlayerLevel(game, state)).toBeLessThan(
      getMinimumPlayerLevelForBuild(game, state),
    );

    const withoutFlag = ensurePlayerLevelForBuild(game, state);
    expect(withoutFlag.playerLevel).toBe(5);
    expect(computeBuild(game, withoutFlag).trainingLevelsRemaining).toBe(-5);

    const withFlag = ensurePlayerLevelForBuild(game, state, { ensureMinimumPlayerLevel: true });
    expect(withFlag.playerLevel).toBe(6);
    expect(computeBuild(game, withFlag).trainingLevelsRemaining).toBeGreaterThanOrEqual(0);
  });
});

describe("race/major/minor changes never lower skills", () => {
  const game = getTestGameData();

  function findRacePairWithDifferentStartingSkill(): {
    skillId: string;
    highRaceId: string;
    lowRaceId: string;
    high: number;
    low: number;
  } {
    for (const skillId of game.manifest.skills) {
      // This behavior only matters for allocatable skills.
      if (game.manifest.nonAllocatableSkills.includes(skillId)) continue;
      const racesWithValue = game.races
        .map((race) => ({
          id: race.id,
          value: race.startingSkills[skillId] ?? 0,
        }))
        .sort((a, b) => b.value - a.value);
      const highest = racesWithValue[0];
      const lowest = racesWithValue.at(-1);
      if (!highest || !lowest) continue;
      if (highest.value <= lowest.value) continue;
      return {
        skillId,
        highRaceId: highest.id,
        lowRaceId: lowest.id,
        high: highest.value,
        low: lowest.value,
      };
    }
    throw new Error("No race pair found with different starting skill values.");
  }

  it("preserves absolute skill level when switching to a race with a lower starting skill, and auto-raises player level if skill points go negative", () => {
    const { skillId, highRaceId, lowRaceId, high, low } = findRacePairWithDifferentStartingSkill();

    const before = reconcileBuild(
      game,
      createTestBuildState({
        playerLevel: game.mechanics.leveling.baseLevel,
        raceId: highRaceId,
        skillLevels: { [skillId]: high },
      }),
    );
    const beforeLevel = before.skillLevels[skillId] ?? 0;
    expect(beforeLevel).toBeGreaterThanOrEqual(high);

    const candidate = { ...before, raceId: lowRaceId };
    const preserved = reconcileBuild(game, preserveSkillPointAllocations(game, before, candidate));
    const afterLevel = preserved.skillLevels[skillId] ?? 0;

    // Regression: this used to drop to the new race's lower starting skill (or floor).
    expect(afterLevel).toBe(beforeLevel);
    expect(low).toBeLessThan(high);

    // Keeping the absolute level with a lower floor can increase paid points; ensureMinimumPlayerLevel should cover it.
    const overBudget = getRemainingSkillPoints(game, preserved);
    if (overBudget < 0) {
      const leveled = ensurePlayerLevelForBuild(game, preserved, { ensureMinimumPlayerLevel: true });
      expect(getRemainingSkillPoints(game, leveled)).toBeGreaterThanOrEqual(0);
      expect(leveled.playerLevel).toBeGreaterThanOrEqual(preserved.playerLevel);
    }
  });
});

describe("buildEngine perk selection", () => {
  const game = getTestGameData();

  it("blocks perks when prerequisites are missing", () => {
    const perk = getPerkById(game, "block-strong-grip");
    expect(perk).toBeDefined();

    const state = createInitialBuildState();
    expect(arePrerequisitesMet(game, state, perk!)).toBe(false);
    expect(canSelectPerk(game, state, "block-strong-grip")).toBe(false);
  });

  it("allows perks when prerequisites and skill level are met", () => {
    const state = createTestBuildState({
      playerLevel: 20,
      selectedPerkIds: ["block-improved-blocking"],
      skillLevels: { block: 20 },
    });

    expect(canSelectPerk(game, state, "block-strong-grip")).toBe(true);
  });

  it("deducts perk points for costing perks", () => {
    const state = createTestBuildState({
      playerLevel: 1,
      selectedPerkIds: ["block-improved-blocking"],
      skillLevels: { block: 25 },
    });

    expect(getRemainingPerkPoints(game, state)).toBe(2);
  });

  it("treats smithing book perks as OR prerequisites", () => {
    const orcish = getPerkById(game, "smithing-orcish-smithing");
    expect(orcish).toBeDefined();
    expect(orcish!.prerequisites).toEqual([]);
    expect(orcish!.prerequisitesAny).toEqual([
      "smithing-advanced-light-armors",
      "smithing-dwarven-smithing",
    ]);

    const heavyPath = createTestBuildState({
      playerLevel: 20,
      selectedPerkIds: ["smithing-craftsmanship", "smithing-dwarven-smithing"],
      skillLevels: { smithing: 50 },
    });
    const lightPath = createTestBuildState({
      playerLevel: 20,
      selectedPerkIds: ["smithing-craftsmanship", "smithing-advanced-light-armors"],
      skillLevels: { smithing: 50 },
    });
    const neitherBranch = createTestBuildState({
      playerLevel: 20,
      selectedPerkIds: ["smithing-craftsmanship"],
      skillLevels: { smithing: 50 },
    });

    expect(arePrerequisitesMet(game, heavyPath, orcish!)).toBe(true);
    expect(arePrerequisitesMet(game, lightPath, orcish!)).toBe(true);
    expect(arePrerequisitesMet(game, neitherBranch, orcish!)).toBe(false);
    expect(canSelectPerk(game, heavyPath, "smithing-orcish-smithing")).toBe(true);
    expect(canSelectPerk(game, lightPath, "smithing-orcish-smithing")).toBe(true);
    expect(canSelectPerk(game, neitherBranch, "smithing-orcish-smithing")).toBe(false);
  });

  it("keeps smithing OR branch when removing elven with orcish path intact", () => {
    const smithingTree = game.perkTrees.smithing;
    expect(smithingTree).toBeDefined();

    const allSmithingIds = smithingTree!.perks.map((perk) => perk.id);
    const build = createTestBuildState({
      playerLevel: 50,
      selectedPerkIds: allSmithingIds,
      skillLevels: { smithing: 90 },
    });

    const next = removePerk(game, build, "smithing-elven-smithing");

    expect(next.selectedPerkIds).toContain("smithing-glass-smithing");
    expect(next.selectedPerkIds).toContain("smithing-ebony-smithing");
    expect(next.selectedPerkIds).toContain("smithing-daedric-smithing");
    expect(next.selectedPerkIds).toContain("smithing-draconic-blacksmithing");
    expect(next.selectedPerkIds).not.toContain("smithing-elven-smithing");
  });

  it("keeps OR dependents when another prerequisite path remains after removal", () => {
    const build = createTestBuildState({
      playerLevel: 30,
      selectedPerkIds: [
        "smithing-elven-smithing",
        "smithing-glass-smithing",
        "smithing-ebony-smithing",
        "smithing-daedric-smithing",
      ],
      skillLevels: { smithing: 90 },
    });

    const next = removePerk(game, build, "smithing-ebony-smithing");

    expect(next.selectedPerkIds).toEqual([
      "smithing-elven-smithing",
      "smithing-glass-smithing",
      "smithing-daedric-smithing",
    ]);
  });

  it("removes OR dependents when no prerequisite path remains after removal", () => {
    const build = createTestBuildState({
      playerLevel: 30,
      selectedPerkIds: [
        "smithing-ebony-smithing",
        "smithing-daedric-smithing",
      ],
      skillLevels: { smithing: 90 },
    });

    const next = removePerk(game, build, "smithing-ebony-smithing");

    expect(next.selectedPerkIds).toEqual([]);
  });

  it("still cascades removal through AND prerequisites", () => {
    const build = createTestBuildState({
      playerLevel: 20,
      selectedPerkIds: [
        "block-improved-blocking",
        "block-strong-grip",
      ],
      skillLevels: { block: 25 },
    });

    const next = removePerk(game, build, "block-improved-blocking");

    expect(next.selectedPerkIds).toEqual([]);
  });
});

describe("computeBuild ally-only perks", () => {
  const game = getTestGameData();

  const allyPerkIds = [
    "speech-commander",
    "speech-commander-r2",
    "speech-commander-r3",
    "wayfarer-commander",
    "wayfarer-leader",
    "wayfarer-captain",
    "destiny-37",
  ];

  it("does not apply ally-targeted Commander and leadership bonuses to the player", () => {
    const state = createTestBuildState({
      playerLevel: 50,
      selectedPerkIds: allyPerkIds,
    });
    const computed = computeBuild(game, state);

    const allySources = computed.appliedBonuses.flatMap((bonus) =>
      bonus.sources
        .filter((source) =>
          ["Commander", "Leader", "Captain", "Bard"].includes(source.name),
        )
        .map((source) => ({ stat: bonus.id, value: source.value })),
    );

    expect(allySources).toEqual([
      { stat: "priceModifier", value: 10 },
    ]);
  });
});
