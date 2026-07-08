import { describe, expect, it } from "vitest";
import { getTestGameData } from "@/test/helpers";
import {
  getCharacterOptionAttributeBonus,
  getCharacterOptionSummaryLines,
  getSelectedCharacterOptionChoice,
  normalizeCharacterOptionChoices,
} from "@/lib/characterOptions";
import { createTestBuildState } from "@/test/helpers";

describe("characterOptions bittercup", () => {
  const game = getTestGameData();
  const bittercup = game.characterOptions.find((option) => option.id === "bittercup");

  it("loads the bittercup character option from game data", () => {
    expect(bittercup).toBeDefined();
    expect(bittercup?.choices.some((choice) => choice.id === "health-magicka")).toBe(true);
  });

  it("applies bittercup attribute shifts from choice effects", () => {
    const state = createTestBuildState({
      characterOptionChoices: { bittercup: "health-magicka" },
    });

    expect(getCharacterOptionAttributeBonus(game, state, "health")).toBe(20);
    expect(getCharacterOptionAttributeBonus(game, state, "magicka")).toBe(-20);
    expect(getCharacterOptionAttributeBonus(game, state, "stamina")).toBe(0);
  });

  it("normalizes unknown bittercup choices to default", () => {
    const normalized = normalizeCharacterOptionChoices(game, { bittercup: "invalid" });
    expect(normalized.bittercup).toBe("none");
  });

  it("formats bittercup summary lines for active rewards", () => {
    const choice = getSelectedCharacterOptionChoice(bittercup!, {
      bittercup: "stamina-health",
    });

    const lines = getCharacterOptionSummaryLines(
      game,
      bittercup!,
      choice,
      {
        bittercupAttributeShift: "{increased} +{count}, {decreased} −{count}",
      },
      { health: "Health", magicka: "Magicka", stamina: "Stamina" },
    );

    expect(lines).toEqual([
      {
        key: "bittercup-attribute-shift",
        text: "Stamina +20, Health −20",
      },
    ]);
  });
});
