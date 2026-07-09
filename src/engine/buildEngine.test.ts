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
  getSkillFloor,
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
  tryTakePerk,
  areBuildStatesEqual,
  migrateBuildState,
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

  it("preserves user-raised skill levels when switching races, and auto-raises player level if skill points go negative", () => {
    const { skillId, highRaceId, lowRaceId, high, low } = findRacePairWithDifferentStartingSkill();

    const beforeBase = reconcileBuild(
      game,
      createTestBuildState({
        playerLevel: game.mechanics.leveling.baseLevel,
        raceId: highRaceId,
        skillLevels: {},
      }),
    );
    const beforeFloor = getSkillFloor(game, beforeBase, skillId);
    expect(beforeFloor).toBeGreaterThanOrEqual(high);

    // Simulate investment above the floor.
    const invested = 5;
    const before = reconcileBuild(game, {
      ...beforeBase,
      skillLevels: { ...beforeBase.skillLevels, [skillId]: beforeFloor + invested },
    });
    const beforeLevel = before.skillLevels[skillId] ?? 0;
    expect(beforeLevel).toBe(beforeFloor + invested);

    const candidate = { ...before, raceId: lowRaceId };
    const preserved = reconcileBuild(game, preserveSkillPointAllocations(game, before, candidate));
    const afterLevel = preserved.skillLevels[skillId] ?? 0;

    // We should preserve the user's absolute level (do not reduce due to floor changes).
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

  it("preserves user-raised skill levels when removing a major/minor selection (floor decreases)", () => {
    // Pick a skill that is eligible for major selection and not destiny.
    const skill = game.skills.find((entry) => entry.majorEligible && entry.id !== "destiny");
    expect(skill).toBeDefined();
    const skillId = skill!.id;

    // Find a race that has a non-zero starting skill so we can distinguish race floor from major/minor bonus.
    const raceWithStarting = game.races.find((race) => (race.startingSkills[skillId] ?? 0) > 0);
    expect(raceWithStarting).toBeDefined();

    const beforeBase = reconcileBuild(
      game,
      createTestBuildState({
        playerLevel: game.mechanics.leveling.baseLevel,
        raceId: raceWithStarting!.id,
        majorSkillIds: [skillId],
        skillLevels: {},
      }),
    );
    const beforeFloor = getSkillFloor(game, beforeBase, skillId);
    const invested = 5;
    const before = reconcileBuild(game, {
      ...beforeBase,
      skillLevels: { ...beforeBase.skillLevels, [skillId]: beforeFloor + invested },
    });
    const beforeLevel = before.skillLevels[skillId] ?? 0;
    expect(beforeLevel).toBe(beforeFloor + invested);

    // Remove the major selection, which would normally lower the floor and (previously) lower the visible level.
    const candidate = { ...before, majorSkillIds: [] };
    const preserved = reconcileBuild(game, preserveSkillPointAllocations(game, before, candidate));
    const afterLevel = preserved.skillLevels[skillId] ?? 0;
    expect(afterLevel).toBe(beforeLevel);
  });

  it("does not accumulate race floors when toggling races repeatedly on an empty build (Imperial <-> Dunmer)", () => {
    const imperial = game.races.find((race) => race.id === "imperial");
    const dunmer = game.races.find((race) => race.id === "dunmer");
    expect(imperial).toBeDefined();
    expect(dunmer).toBeDefined();

    let state = reconcileBuild(game, createTestBuildState({ raceId: "imperial" }));
    state = reconcileBuild(game, preserveSkillPointAllocations(game, state, { ...state, raceId: "dunmer" }));
    state = reconcileBuild(game, preserveSkillPointAllocations(game, state, { ...state, raceId: "imperial" }));

    // Pick a representative set from the reported list (must exist in test data).
    const skills = [
      "heavy-armor",
      "block",
      "evasion",
      "sneak",
      "speech",
      "conjuration",
      "destruction",
      "restoration",
      "enchanting",
    ];

    for (const skillId of skills) {
      if (game.manifest.nonAllocatableSkills.includes(skillId)) continue;
      const expected = getSkillFloor(game, state, skillId);
      expect(state.skillLevels[skillId] ?? expected).toBe(expected);
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

  it("allocates perkPointsBudget perks multiple times within the perk-point budget", () => {
    const artifactId = "enchanting-artifact-enchanter";
    const prerequisiteId = "enchanting-enchantment-mastery";

    const perk = getPerkById(game, artifactId);
    expect(perk?.allocation?.kind).toBe("perkPointsBudget");

    // Pick the lowest player level that can actually support Enchanting skill 100.
    let playerLevel = 1;
    while (playerLevel <= game.mechanics.leveling.maxPlayerLevel) {
      const candidate = createTestBuildState({
        playerLevel,
        selectedPerkIds: [prerequisiteId],
        skillLevels: { enchanting: 100 },
      });
      const maxAllowed = getMaxAllowedSkillLevel(game, candidate);
      if (maxAllowed >= 100) break;
      playerLevel += 1;
    }

    const stateWithPrereq = createTestBuildState({
      playerLevel,
      selectedPerkIds: [prerequisiteId],
      skillLevels: { enchanting: 100 },
    });

    const earned = getEarnedPerkPoints(game, stateWithPrereq);

    // Force the remaining points to 2 so we can test the 0/1/2 boundaries.
    const targetRemaining = 2;
    const desiredSpent = earned - targetRemaining;
    const prerequisiteCost = 1; // prerequisiteId defaults to costsPerkPoint: true
    const fillerToSpend = Math.max(0, desiredSpent - prerequisiteCost);

    const allCostingPerks = Object.values(game.perkTrees).flatMap((tree) =>
      tree.perks.filter((p) => p.costsPerkPoint && ![artifactId, prerequisiteId].includes(p.id)).map((p) => p.id),
    );

    const fillerPerkIds =
      fillerToSpend <= allCostingPerks.length
        ? allCostingPerks.slice(0, fillerToSpend)
        : [...allCostingPerks, ...Array.from({ length: fillerToSpend - allCostingPerks.length }, () => allCostingPerks[0])];

    const initial = {
      ...stateWithPrereq,
      selectedPerkIds: [prerequisiteId, ...fillerPerkIds],
    };

    expect(getRemainingPerkPoints(game, initial)).toBe(targetRemaining);

    expect(canSelectPerk(game, initial, artifactId)).toBe(true);

    const afterFirst = tryTakePerk(game, initial, artifactId);
    expect(afterFirst).not.toBeNull();
    expect(afterFirst!.selectedPerkIds.filter((id) => id === artifactId)).toHaveLength(1);
    expect(getRemainingPerkPoints(game, afterFirst!)).toBe(1);
    expect(canSelectPerk(game, afterFirst!, artifactId)).toBe(true);

    const afterSecond = tryTakePerk(game, afterFirst!, artifactId);
    expect(afterSecond).not.toBeNull();
    expect(afterSecond!.selectedPerkIds.filter((id) => id === artifactId)).toHaveLength(2);
    expect(getRemainingPerkPoints(game, afterSecond!)).toBe(0);
    expect(canSelectPerk(game, afterSecond!, artifactId)).toBe(false);

    const afterThird = tryTakePerk(game, afterSecond!, artifactId);
    expect(afterThird).toBeNull();
  });

  it("removes one stackable allocation per right-click", () => {
    const artifactId = "enchanting-artifact-enchanter";
    const build = createTestBuildState({
      playerLevel: 50,
      selectedPerkIds: [
        "enchanting-enchantment-mastery",
        artifactId,
        artifactId,
        artifactId,
      ],
      skillLevels: { enchanting: 100 },
    });

    const afterOne = removePerk(game, build, artifactId);
    expect(afterOne.selectedPerkIds.filter((id) => id === artifactId)).toHaveLength(2);
    expect(afterOne.selectedPerkIds).toContain("enchanting-enchantment-mastery");

    const afterTwo = removePerk(game, afterOne, artifactId);
    expect(afterTwo.selectedPerkIds.filter((id) => id === artifactId)).toHaveLength(1);

    const afterThree = removePerk(game, afterTwo, artifactId);
    expect(afterThree.selectedPerkIds.filter((id) => id === artifactId)).toHaveLength(0);
    expect(afterThree.selectedPerkIds).toContain("enchanting-enchantment-mastery");
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

describe("areBuildStatesEqual", () => {
  it("returns true for identical build snapshots", () => {
    const build = createTestBuildState({
      raceId: "nord",
      deityId: "arkay",
      selectedPerkIds: ["block-improved-blocking"],
      skillLevels: { block: 25 },
      skillTrainingRanges: { block: [1, 0, 0, 0] },
      description: "Same build",
    });

    expect(areBuildStatesEqual(build, { ...build })).toBe(true);
  });

  it("treats missing oghmaSkillIds as an empty selection", () => {
    const build = createTestBuildState({ oghmaSkillIds: [] });
    const legacy = createTestBuildState();
    delete (legacy as { oghmaSkillIds?: string[] }).oghmaSkillIds;

    expect(areBuildStatesEqual(build, legacy)).toBe(true);
  });

  it("detects differences across planner-editable fields", () => {
    const base = createTestBuildState({
      raceId: "nord",
      birthsignId: "none",
      deityId: "none",
      traitIds: ["robust"],
      majorSkillIds: ["block"],
      minorSkillIds: ["one-handed"],
      attributeBonus: { health: 1, magicka: 0, stamina: 0 },
      characterOptionChoices: { "oghma-infinium": "claimed" },
      oghmaSkillIds: ["block"],
      selectedPerkIds: ["block-improved-blocking"],
      skillLevels: { block: 20 },
      skillTrainingRanges: { block: [1, 0, 0, 0] },
      playerLevel: 5,
      description: "Baseline",
    });

    expect(areBuildStatesEqual(base, { ...base, raceId: "breton" })).toBe(false);
    expect(areBuildStatesEqual(base, { ...base, birthsignId: "lover" })).toBe(false);
    expect(areBuildStatesEqual(base, { ...base, deityId: "arkay" })).toBe(false);
    expect(areBuildStatesEqual(base, { ...base, traitIds: [] })).toBe(false);
    expect(areBuildStatesEqual(base, { ...base, majorSkillIds: ["smithing"] })).toBe(false);
    expect(areBuildStatesEqual(base, { ...base, minorSkillIds: ["block"] })).toBe(false);
    expect(
      areBuildStatesEqual(base, {
        ...base,
        attributeBonus: { health: 2, magicka: 0, stamina: 0 },
      }),
    ).toBe(false);
    expect(
      areBuildStatesEqual(base, {
        ...base,
        characterOptionChoices: { "oghma-infinium": "none" },
      }),
    ).toBe(false);
    expect(areBuildStatesEqual(base, { ...base, selectedPerkIds: [] })).toBe(false);
    expect(areBuildStatesEqual(base, { ...base, skillLevels: { block: 21 } })).toBe(false);
    expect(
      areBuildStatesEqual(base, {
        ...base,
        skillTrainingRanges: { block: [2, 0, 0, 0] },
      }),
    ).toBe(false);
    expect(areBuildStatesEqual(base, { ...base, playerLevel: 6 })).toBe(false);
    expect(areBuildStatesEqual(base, { ...base, description: "Changed" })).toBe(false);
    expect(
      areBuildStatesEqual(base, {
        ...base,
        oghmaSkillIds: ["smithing"],
      }),
    ).toBe(false);
  });
});

describe("migrateBuildState", () => {
  it("migrates legacy blessingId to deityId", () => {
    const build = createTestBuildState({ deityId: "none" });
    const legacy = { ...build, blessingId: "arkay" };

    const migrated = migrateBuildState(legacy);
    expect(migrated.deityId).toBe("arkay");
    expect(migrated).not.toHaveProperty("blessingId");
  });

  it("maps null blessingId to deityId none", () => {
    const build = createTestBuildState({ deityId: "arkay" });
    const legacy = { ...build, blessingId: null };

    const migrated = migrateBuildState(legacy);
    expect(migrated.deityId).toBe("none");
  });

  it("defaults oghmaSkillIds when missing", () => {
    const build = createTestBuildState();
    const legacy = { ...build };
    delete (legacy as { oghmaSkillIds?: string[] }).oghmaSkillIds;

    const migrated = migrateBuildState(legacy);
    expect(migrated.oghmaSkillIds).toEqual([]);
  });
});
