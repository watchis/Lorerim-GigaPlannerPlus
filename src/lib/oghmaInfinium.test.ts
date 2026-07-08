import { describe, expect, it } from "vitest";
import {
  getActiveOghmaSkillIds,
  isOghmaInfiniumActive,
  migrateOghmaInfiniumBuild,
} from "@/lib/oghmaInfinium";
import { createTestBuildState, getTestGameData } from "@/test/helpers";

describe("oghmaInfinium helpers", () => {
  const game = getTestGameData();

  it("detects when Oghma is claimed", () => {
    expect(isOghmaInfiniumActive(createTestBuildState())).toBe(false);
    expect(
      isOghmaInfiniumActive(
        createTestBuildState({ characterOptionChoices: { "oghma-infinium": "claimed" } }),
      ),
    ).toBe(true);
  });

  it("returns selected skills only while claimed", () => {
    const state = createTestBuildState({
      characterOptionChoices: { "oghma-infinium": "claimed" },
      oghmaSkillIds: ["block", "smithing"],
    });
    expect(getActiveOghmaSkillIds(state)).toEqual(["block", "smithing"]);

    const unchecked = createTestBuildState({
      characterOptionChoices: { "oghma-infinium": "none" },
      oghmaSkillIds: ["block", "smithing"],
    });
    expect(getActiveOghmaSkillIds(unchecked)).toEqual([]);
  });

  it("migrates legacy warrior path to claimed with preset skills", () => {
    const migrated = migrateOghmaInfiniumBuild(
      game,
      createTestBuildState({
        characterOptionChoices: { "oghma-infinium": "warrior" },
      }),
    );

    expect(migrated.characterOptionChoices["oghma-infinium"]).toBe("claimed");
    expect(migrated.oghmaSkillIds).toEqual([
      "one-handed",
      "two-handed",
      "block",
      "heavy-armor",
      "smithing",
      "enchanting",
    ]);
  });
});
