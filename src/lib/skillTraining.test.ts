import { describe, expect, it } from "vitest";
import {
  clampTrainingRangeCount,
  computeTrainingSkillPointCredit,
  distributeTrainingCountAcrossTiers,
  formatTrainingTierRange,
  getMaxTrainingOnSkill,
  getSkillLevelRequiredForTrainingRanges,
  getTrainingTierDefinitions,
  hasSkillTrainingAssigned,
  normalizeTrainingRangesForSkill,
  sumTrainingRanges,
  trimTrainingRangesForFreeTopLevels,
  trimTrainingRangesToBudget,
} from "@/lib/skillTraining";
import { createTestBuildState, getTestGameData } from "@/test/helpers";
import { getEffectiveSkillFloor, getSkillFloor } from "@/engine/buildEngine";

describe("skillTraining", () => {
  const game = getTestGameData();
  const tiers = getTrainingTierDefinitions(game);

  it("builds tier definitions capped by max training skill level", () => {
    expect(tiers.length).toBe(4);
    expect(formatTrainingTierRange(tiers[0])).toBe("1–25");
    expect(tiers[3].maxLevel).toBe(90);
  });

  it("distributes training counts across tiers in order", () => {
    expect(distributeTrainingCountAcrossTiers(game, 0)).toEqual([0, 0, 0, 0]);
    expect(distributeTrainingCountAcrossTiers(game, 30)).toEqual([25, 5, 0, 0]);
    expect(distributeTrainingCountAcrossTiers(game, 200)).toEqual([25, 25, 25, 15]);
  });

  it("trims training ranges to a global budget", () => {
    const ranges = [25, 25, 25, 15];
    expect(sumTrainingRanges(ranges)).toBe(90);
    expect(trimTrainingRangesToBudget(game, ranges, 40)).toEqual([25, 15, 0, 0]);
  });

  it("reads stored training ranges with zero-filled tiers", () => {
    const state = createTestBuildState({
      skillTrainingRanges: { block: [10, 5] },
    });

    expect(sumTrainingRanges([10, 5, 0, 0])).toBe(15);
    expect(tiers.length).toBe(4);
    expect(state.skillTrainingRanges.block).toEqual([10, 5]);
  });

  it("detects when training has been assigned to a skill", () => {
    const state = createTestBuildState({
      skillTrainingRanges: { block: [0, 1, 0, 0] },
    });
    const empty = createTestBuildState({
      skillTrainingRanges: { block: [0, 0, 0, 0] },
    });

    expect(hasSkillTrainingAssigned(game, state, "block")).toBe(true);
    expect(hasSkillTrainingAssigned(game, empty, "block")).toBe(false);
    expect(hasSkillTrainingAssigned(game, empty, "alchemy")).toBe(false);
  });

  it("waives one tier cost per trained level", () => {
    expect(computeTrainingSkillPointCredit(game.mechanics, game, [3, 0, 0, 0])).toBe(3);
    expect(computeTrainingSkillPointCredit(game.mechanics, game, [0, 2, 0, 0])).toBe(4);
    expect(computeTrainingSkillPointCredit(game.mechanics, game, [5, 1, 0, 0])).toBe(7);
  });

  it("does not clamp training counts to the global earned budget", () => {
    const state = createTestBuildState({
      raceId: "nord",
      majorSkillIds: ["block"],
      playerLevel: 5,
      skillLevels: { block: 25 },
      skillTrainingRanges: { block: [25, 0, 0, 0] },
    });
    const floor = getSkillFloor(game, state, "block");

    expect(
      clampTrainingRangeCount(game, state, "block", 1, 5, floor, [25, 0, 0, 0]),
    ).toBe(5);
  });

  it("reduces per-skill training capacity by Oghma free top levels", () => {
    const withoutOghma = createTestBuildState({
      raceId: "nord",
      majorSkillIds: ["block"],
    });
    const withOghma = createTestBuildState({
      ...withoutOghma,
      characterOptionChoices: { "oghma-infinium": "claimed" },
      oghmaSkillIds: ["block"],
    });
    const floor = getEffectiveSkillFloor(game, withOghma, "block");

    expect(getMaxTrainingOnSkill(game, withoutOghma, "block", floor)).toBe(90 - floor);
    expect(getMaxTrainingOnSkill(game, withOghma, "block", floor)).toBe(90 - floor - 5);
  });

  it("refunds training that falls in Oghma free top levels", () => {
    const floor = 15;
    const ranges = [25, 5, 0, 0];
    expect(getSkillLevelRequiredForTrainingRanges(game, floor, ranges)).toBe(30);

    const trimmed = trimTrainingRangesForFreeTopLevels(game, floor, ranges, 25);
    expect(getSkillLevelRequiredForTrainingRanges(game, floor, trimmed)).toBe(25);
    expect(sumTrainingRanges(trimmed)).toBeLessThan(sumTrainingRanges(ranges));
  });

  it("normalizes training ranges for Oghma free levels and reduced capacity", () => {
    const state = createTestBuildState({
      raceId: "nord",
      majorSkillIds: ["block"],
      characterOptionChoices: { "oghma-infinium": "claimed" },
      oghmaSkillIds: ["block"],
      skillLevels: { block: 30 },
      skillTrainingRanges: { block: [25, 5, 0, 0] },
    });
    const floor = getEffectiveSkillFloor(game, state, "block");
    const normalized = normalizeTrainingRangesForSkill(
      game,
      state,
      "block",
      [25, 5, 0, 0],
      floor,
      30,
    );

    expect(getSkillLevelRequiredForTrainingRanges(game, floor, normalized)).toBe(25);
  });
});
