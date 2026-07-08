import { describe, expect, it } from "vitest";
import oghmaExtension from "../../extensions/character-options/oghma-infinium";
import { getTestGameData, createTestBuildState } from "@/test/helpers";

describe("oghma-infinium extension", () => {
  const game = getTestGameData();
  const option = game.characterOptions.find((entry) => entry.id === "oghma-infinium")!;

  it("returns no modifications for default choice", () => {
    const choice = option.choices.find((entry) => entry.id === "none")!;
    const mods = oghmaExtension.getModifications({
      game,
      state: createTestBuildState(),
      option,
      choice,
      labels: {},
    });
    expect(mods).toEqual([]);
  });

  it("grants perk points and six skill bonuses per warrior path", () => {
    const choice = option.choices.find((entry) => entry.id === "warrior")!;
    const mods = oghmaExtension.getModifications({
      game,
      state: createTestBuildState({
        characterOptionChoices: { "oghma-infinium": "warrior" },
      }),
      option,
      choice,
      labels: {},
    });

    expect(mods).toHaveLength(1);
    expect(mods[0]?.effects).toEqual([{ type: "perkPoints", value: 3 }]);
    expect(mods[0]?.skillLevelGrants).toHaveLength(6);
    expect(mods[0]?.skillLevelGrants?.every((grant) => grant.bonus === 5)).toBe(true);
    expect(mods[0]?.skillLevelGrants?.every((grant) => grant.bypassPlayerLevelCap)).toBe(true);
  });
});
