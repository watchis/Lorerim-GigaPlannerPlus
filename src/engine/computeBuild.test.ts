import { describe, expect, it } from "vitest";
import { computeBuild, reconcileBuild } from "@/engine/buildEngine";
import { createTestBuildState, getTestGameData } from "@/test/helpers";

describe("computeBuild", () => {
  it("does not eagerly collect conditional bonuses on the hot path", () => {
    const game = getTestGameData();
    const perkIds = Object.values(game.perkTrees).flatMap((tree) =>
      tree.perks.slice(0, 4).map((perk) => perk.id),
    );
    const build = reconcileBuild(game, {
      ...createTestBuildState({ raceId: "nord", playerLevel: 50 }),
      selectedPerkIds: perkIds,
    });

    const computed = computeBuild(game, build);

    expect(computed.conditionalBonuses).toEqual([]);
  });
});
