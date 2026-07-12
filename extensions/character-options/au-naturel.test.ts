import { describe, expect, it } from "vitest";
import auNaturelExtension from "../../extensions/character-options/au-naturel";
import { computeBuild } from "@/engine/buildEngine";
import { getTestGameData, createTestBuildState } from "@/test/helpers";

describe("au-naturel extension", () => {
  const game = getTestGameData();
  const option = game.characterOptions.find((entry) => entry.id === "au-naturel-gear")!;

  it("is registered with the expected id", () => {
    expect(auNaturelExtension.id).toBe("au-naturel");
  });

  it("returns no modifications without the Au Naturel trait", () => {
    const choice = option.choices.find((entry) => entry.id === "0")!;
    const mods = auNaturelExtension.getModifications({
      game,
      state: createTestBuildState({
        characterOptionChoices: { "au-naturel-gear": "0" },
      }),
      option,
      choice,
      labels: {},
    });
    expect(mods).toEqual([]);
  });

  it("grants +4 per level to each attribute at 0 gear pieces", () => {
    const choice = option.choices.find((entry) => entry.id === "0")!;
    const mods = auNaturelExtension.getModifications({
      game,
      state: createTestBuildState({
        traitIds: ["au-naturel"],
        playerLevel: 10,
        characterOptionChoices: { "au-naturel-gear": "0" },
      }),
      option,
      choice,
      labels: {},
    });

    expect(mods).toHaveLength(1);
    expect(mods[0]?.effects).toEqual([
      { type: "attribute", stat: "health", value: 40 },
      { type: "attribute", stat: "magicka", value: 40 },
      { type: "attribute", stat: "stamina", value: 40 },
    ]);
  });

  it("applies -160 when fully clothed", () => {
    const choice = option.choices.find((entry) => entry.id === "4")!;
    const mods = auNaturelExtension.getModifications({
      game,
      state: createTestBuildState({
        traitIds: ["au-naturel"],
        playerLevel: 50,
        characterOptionChoices: { "au-naturel-gear": "4" },
      }),
      option,
      choice,
      labels: {},
    });

    expect(mods).toHaveLength(1);
    expect(mods[0]?.effects).toEqual([
      { type: "attribute", stat: "health", value: -160 },
      { type: "attribute", stat: "magicka", value: -160 },
      { type: "attribute", stat: "stamina", value: -160 },
    ]);
  });

  it("combines per-level bonus and gear penalty through computeBuild", () => {
    const naked = computeBuild(
      game,
      createTestBuildState({
        traitIds: ["au-naturel"],
        playerLevel: 20,
        characterOptionChoices: { "au-naturel-gear": "0" },
      }),
    );
    const onePiece = computeBuild(
      game,
      createTestBuildState({
        traitIds: ["au-naturel"],
        playerLevel: 20,
        characterOptionChoices: { "au-naturel-gear": "1" },
      }),
    );
    const fullyClothed = computeBuild(
      game,
      createTestBuildState({
        traitIds: ["au-naturel"],
        playerLevel: 20,
        characterOptionChoices: { "au-naturel-gear": "4" },
      }),
    );

    expect(naked.attributes.health - onePiece.attributes.health).toBe(60);
    expect(onePiece.attributes.health - fullyClothed.attributes.health).toBe(180);
  });

  describe("getSummaryLines", () => {
    const labels = {
      auNaturelPerLevelBonus: "+{count} to each attribute",
      auNaturelGearPenalty: "−{count} to each attribute from gear",
    };

    function summaryForGear(gearId: string) {
      const choice = option.choices.find((entry) => entry.id === gearId)!;
      return auNaturelExtension.getSummaryLines!({
        game,
        state: createTestBuildState({
          traitIds: ["au-naturel"],
          playerLevel: 10,
          characterOptionChoices: { "au-naturel-gear": gearId },
        }),
        option,
        choice,
        labels,
      }).map((line) => line.text);
    }

    it("shows independent per-level and gear penalty chips", () => {
      expect(summaryForGear("0")).toEqual(["+40 to each attribute"]);
      expect(summaryForGear("1")).toEqual([
        "+30 to each attribute",
        "−40 to each attribute from gear",
      ]);
      expect(summaryForGear("2")).toEqual([
        "+20 to each attribute",
        "−80 to each attribute from gear",
      ]);
      expect(summaryForGear("3")).toEqual([
        "+10 to each attribute",
        "−120 to each attribute from gear",
      ]);
      expect(summaryForGear("4")).toEqual(["−160 to each attribute from gear"]);
    });
  });
});
