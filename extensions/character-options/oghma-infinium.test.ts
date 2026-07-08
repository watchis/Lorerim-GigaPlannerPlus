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

  it("grants perk points and free-top-level grants for selected skills", () => {
    const choice = option.choices.find((entry) => entry.id === "claimed")!;
    const mods = oghmaExtension.getModifications({
      game,
      state: createTestBuildState({
        characterOptionChoices: { "oghma-infinium": "claimed" },
        oghmaSkillIds: ["block", "one-handed"],
      }),
      option,
      choice,
      labels: {},
    });

    expect(mods).toHaveLength(1);
    expect(mods[0]?.effects).toEqual([{ type: "perkPoints", value: 3 }]);
    expect(mods[0]?.skillLevelGrants).toHaveLength(2);
    expect(mods[0]?.skillLevelGrants?.every((grant) => grant.freeTopLevels === 5)).toBe(true);
    expect(mods[0]?.skillLevelGrants?.every((grant) => grant.bonus === 0)).toBe(true);
  });
});
