import { describe, expect, it } from "vitest";
import artifactEnchanterExtension from "../../extensions/perks/enchanting-artifact-enchanter";
import { getTestGameData } from "@/test/helpers";

describe("enchanting-artifact-enchanter extension", () => {
  const game = getTestGameData();
  const perk = game.perkTrees.enchanting!.perks.find(
    (entry) => entry.id === "enchanting-artifact-enchanter",
  )!;

  it("declares repeatable perk-point allocation", () => {
    expect(artifactEnchanterExtension.allocation).toEqual({
      kind: "perkPointsBudget",
      totalLabel: "infinity",
    });
    expect(perk.allocation).toEqual(artifactEnchanterExtension.allocation);
  });
});
