import { describe, expect, it } from "vitest";
import hagglingExtension from "../../extensions/perks/speech-haggling";
import { getTestGameData, createTestBuildState } from "@/test/helpers";

describe("speech-haggling extension", () => {
  const game = getTestGameData();
  const perk = game.perkTrees.speech!.perks.find((entry) => entry.id === "speech-haggling")!;

  it("does nothing when not selected", () => {
    const mods = hagglingExtension.getModifications({
      game,
      state: createTestBuildState(),
      perk,
      skillId: "speech",
      skillLevel: 50,
      isSelected: false,
    });
    expect(mods).toEqual([]);
  });

  it("scales priceModifier with speech level", () => {
    const mods = hagglingExtension.getModifications({
      game,
      state: createTestBuildState({ selectedPerkIds: ["speech-haggling"] }),
      perk,
      skillId: "speech",
      skillLevel: 50,
      isSelected: true,
    });

    expect(mods[0]?.effects).toEqual([
      {
        type: "derivedStat",
        stat: "priceModifier",
        value: 50,
        isPercent: true,
      },
    ]);
  });
});
