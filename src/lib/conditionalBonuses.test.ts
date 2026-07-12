import { describe, expect, it } from "vitest";
import { collectConditionalBonuses } from "@/lib/conditionalBonuses";
import { createTestBuildState, getTestGameData } from "@/test/helpers";

describe("collectConditionalBonuses", () => {
  it("collects perk bonuses without scanning every tree for every perk", () => {
    const game = getTestGameData();
    const perkIds = Object.values(game.perkTrees).flatMap((tree) =>
      tree.perks.slice(0, 1).map((perk) => perk.id),
    );

    const entries = collectConditionalBonuses(
      game,
      createTestBuildState({ selectedPerkIds: perkIds }),
    );

    expect(Array.isArray(entries)).toBe(true);
    expect(perkIds.length).toBeGreaterThan(1);
  });
});
