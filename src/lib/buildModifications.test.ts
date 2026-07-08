import { describe, expect, it } from "vitest";
import { aggregateEffects } from "@/lib/trackedStats";
import { sumCollectedBudgetEffects, collectBuildChanges } from "@/lib/buildModifications";
import {
  computeBuild,
  computeSkillPointsSpentOnSkill,
  computeSkillPointsToReach,
  getSkillFloor,
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
      computeSkillPointsToReach(game.mechanics, 10, 70),
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

  it("raises the floor when an Oghma skill is selected", () => {
    const state = createTestBuildState({
      raceId: "nord",
      characterOptionChoices: { "oghma-infinium": "claimed" },
      oghmaSkillIds: ["block"],
      skillLevels: { block: 75 },
    });

    expect(getSkillFloor(game, state, "block")).toBe(10);
    const stored = reconcileBuild(game, state);
    expect(stored.skillLevels.block).toBe(75);
    expect(computeSkillPointsSpentOnSkill(game, stored, "block")).toBe(
      computeSkillPointsToReach(game.mechanics, 10, 70),
    );
  });
});
