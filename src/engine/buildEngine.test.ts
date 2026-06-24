import { describe, expect, it } from "vitest";
import {
  applySkillTrainingRangeChange,
  computeSkillPointsToReach,
  computeSkillPointsSpentOnSkill,
  createInitialBuildState,
  getEarnedDestinyPerkPoints,
  getEarnedPerkPoints,
  getEarnedSkillPoints,
  getMaxAllowedSkillLevel,
  getRemainingPerkPoints,
  getRemainingSkillPoints,
  getSkillLevelIncreaseCost,
  canSelectPerk,
  arePrerequisitesMet,
  getPerkById,
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
    expect(getEarnedSkillPoints(game, state)).toBe(80);
  });

  it("uses tiered skill level costs", () => {
    const { mechanics } = game;
    expect(getSkillLevelIncreaseCost(mechanics, 10)).toBe(1);
    expect(getSkillLevelIncreaseCost(mechanics, 26)).toBe(2);
    expect(getSkillLevelIncreaseCost(mechanics, 76)).toBe(4);
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

    const withTraining = applySkillTrainingRangeChange(
      game,
      state,
      "block",
      0,
      1,
      { ignoreTrainingCap: true },
    );

    expect(computeSkillPointsSpentOnSkill(game, withTraining, "block")).toBe(14);
    expect(getRemainingSkillPoints(game, withTraining)).toBe(
      getRemainingSkillPoints(game, state) + 1,
    );
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
});
