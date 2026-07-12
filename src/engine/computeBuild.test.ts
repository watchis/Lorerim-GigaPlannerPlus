import { describe, expect, it, vi } from "vitest";
import { computeBuild, reconcileBuild } from "@/engine/buildEngine";
import * as buildModifications from "@/lib/buildModifications";
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
    expect(computed.playerLevelWarnings).toBeDefined();
    expect(computed.skillReqConflicts).toBeDefined();
    expect(computed.minimumPlayerLevel).toBeGreaterThan(0);
    expect(computed.traitLimit).toBeGreaterThan(0);
    expect(typeof computed.destinyPerkPointsRemaining).toBe("number");
  });

  it("collects build modifications once per computeBuild pass", () => {
    const game = getTestGameData();
    const build = reconcileBuild(game, createTestBuildState({ raceId: "breton", playerLevel: 101 }));
    const collectSpy = vi.spyOn(buildModifications, "collectBuildChanges");

    computeBuild(game, build);

    expect(collectSpy).toHaveBeenCalledTimes(1);
    collectSpy.mockRestore();
  });
});
