import { describe, expect, it } from "vitest";
import { aggregateEffects } from "@/lib/trackedStats";
import { sumCollectedBudgetEffects, collectBuildChanges } from "@/lib/buildModifications";
import { computeBuild } from "@/engine/buildEngine";
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
        "oghma-infinium": "mage",
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

  it("grants effective skill levels from Oghma without raising stored level cap conflicts", () => {
    const state = createTestBuildState({
      playerLevel: 1,
      characterOptionChoices: { "oghma-infinium": "warrior" },
      skillLevels: { block: 15 },
    });
    const computed = computeBuild(game, state);
    expect(computed.skillLevels.block).toBe(20);
  });
});
