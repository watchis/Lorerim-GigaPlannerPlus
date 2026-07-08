import { describe, expect, it } from "vitest";
import artifactEnchanterExtension from "../../extensions/perks/enchanting-artifact-enchanter";
import { getTestGameData, createTestBuildState } from "@/test/helpers";

describe("enchanting-artifact-enchanter extension", () => {
  const game = getTestGameData();
  const perk = game.perkTrees.enchanting!.perks.find(
    (entry) => entry.id === "enchanting-artifact-enchanter",
  )!;

  it("emits planner notes without numeric effects when selected", () => {
    const mods = artifactEnchanterExtension.getModifications({
      game,
      state: createTestBuildState({ selectedPerkIds: ["enchanting-artifact-enchanter"] }),
      perk,
      skillId: "enchanting",
      skillLevel: 100,
      isSelected: true,
    });

    expect(mods[0]?.effects).toBeUndefined();
    expect(mods[0]?.plannerNotes).toEqual([
      "Enchant one item at 2× strength",
      "Place up to 3 enchantments at 50% strength each",
    ]);
  });
});
