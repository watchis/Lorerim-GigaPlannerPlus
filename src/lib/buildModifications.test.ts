import { describe, expect, it } from "vitest";
import { aggregateEffects } from "@/lib/trackedStats";
import { sumCollectedBudgetEffects, collectBuildChanges } from "@/lib/buildModifications";
import {
  computeBuild,
  computeSkillPointsSpentOnSkill,
  computeSkillPointsToReach,
  getEffectiveSkillFloor,
  getSkillFloor,
  getStoredSkillLevel,
  reconcileBuild,
} from "@/engine/buildEngine";
import { getTestGameData, createTestBuildState } from "@/test/helpers";

describe("build modifications integration", () => {
  const game = getTestGameData();

  it("aggregates perkPoints and traitSlot effects", () => {
    const aggregated = aggregateEffects([
      { type: "perkPoints", value: 3 },
      { type: "traitSlot", value: 1 },
    ]);
    expect(aggregated.perkPoints).toBe(3);
    expect(aggregated.traitSlots).toBe(1);
  });

  it("applies Oghma perk points and Alduin trait slot from extensions/effects", () => {
    const state = createTestBuildState({
      characterOptionChoices: {
        "oghma-infinium": "claimed",
        "alduin-bonus-trait": "claimed",
      },
    });
    const budgets = sumCollectedBudgetEffects(collectBuildChanges(game, state));
    expect(budgets.perkPoints).toBe(3);
    expect(budgets.traitSlots).toBe(1);
  });

  it("applies Haggling price modifier at speech 50", () => {
    const state = createTestBuildState({
      selectedPerkIds: ["speech-haggling"],
      skillLevels: { speech: 50 },
    });
    const computed = computeBuild(game, state);
    const priceBonus = computed.appliedBonuses.find((entry) => entry.id === "priceModifier");
    const hagglingSource = priceBonus?.sources.find((source) => source.name === "Haggling");

    expect(hagglingSource?.value).toBe(50);
  });

  it("includes artifact enchanter planner notes when selected", () => {
    const state = createTestBuildState({
      selectedPerkIds: ["enchanting-artifact-enchanter"],
    });
    const computed = computeBuild(game, state);
    expect(computed.plannerNotesByPerkId["enchanting-artifact-enchanter"]?.length).toBe(2);
  });

  it("waives skill points for the top five levels on Oghma skills", () => {
    const state = createTestBuildState({
      raceId: "nord",
      playerLevel: 80,
      characterOptionChoices: { "oghma-infinium": "claimed" },
      oghmaSkillIds: ["block"],
      skillLevels: { block: 75 },
    });

    const spentWithOghma = computeSkillPointsSpentOnSkill(game, state, "block");
    const withoutOghma = createTestBuildState({
      ...state,
      characterOptionChoices: { "oghma-infinium": "none" },
    });
    const spentWithoutOghma = computeSkillPointsSpentOnSkill(game, withoutOghma, "block");

    expect(spentWithOghma).toBeLessThan(spentWithoutOghma);
    expect(spentWithOghma).toBe(
      computeSkillPointsToReach(game.mechanics, 15, 70),
    );
  });

  it("keeps stored skill levels when Oghma is turned off", () => {
    const withOghma = createTestBuildState({
      characterOptionChoices: { "oghma-infinium": "claimed" },
      oghmaSkillIds: ["block"],
      skillLevels: { block: 75 },
    });
    const withoutOghma = createTestBuildState({
      ...withOghma,
      characterOptionChoices: { "oghma-infinium": "none" },
    });

    expect(withoutOghma.skillLevels.block).toBe(75);
    expect(computeSkillPointsSpentOnSkill(game, withoutOghma, "block")).toBeGreaterThan(
      computeSkillPointsSpentOnSkill(game, withOghma, "block"),
    );
  });

  it("combines race, major, and Oghma floor bonuses for Imperial speech", () => {
    const state = createTestBuildState({
      raceId: "imperial",
      majorSkillIds: ["speech"],
      characterOptionChoices: { "oghma-infinium": "claimed" },
      oghmaSkillIds: ["speech"],
    });

    expect(getSkillFloor(game, state, "speech")).toBe(25);
    expect(getEffectiveSkillFloor(game, state, "speech")).toBe(30);
  });

  it("raises and restores the Oghma skill floor by five", () => {
    const base = createTestBuildState({
      raceId: "nord",
      skillLevels: { block: 10 },
    });
    expect(getEffectiveSkillFloor(game, base, "block")).toBe(10);

    const withOghma = reconcileBuild(
      game,
      createTestBuildState({
        ...base,
        characterOptionChoices: { "oghma-infinium": "claimed" },
        oghmaSkillIds: ["block"],
      }),
    );
    expect(getEffectiveSkillFloor(game, withOghma, "block")).toBe(15);
    expect(withOghma.skillLevels.block).toBe(15);

    const reconciledOff = reconcileBuild(
      game,
      createTestBuildState({
        ...withOghma,
        characterOptionChoices: { "oghma-infinium": "none" },
      }),
    );
    expect(getEffectiveSkillFloor(game, reconciledOff, "block")).toBe(10);
    expect(reconciledOff.skillLevels.block).toBe(15);
  });

  it("refunds training when Oghma makes trained top levels free", () => {
    const before = createTestBuildState({
      raceId: "nord",
      majorSkillIds: ["block"],
      skillLevels: { block: 30 },
      skillTrainingRanges: { block: [25, 5, 0, 0] },
    });

    const after = reconcileBuild(
      game,
      createTestBuildState({
        ...before,
        characterOptionChoices: { "oghma-infinium": "claimed" },
        oghmaSkillIds: ["block"],
      }),
    );

    expect(after.skillTrainingRanges.block).toEqual([25, 0, 0, 0]);
    expect(after.skillLevels.block).toBe(30);
  });
});
