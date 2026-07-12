import { writeFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  computeBuild,
  createInitialBuildState,
  reconcileBuild,
  tryTakePerk,
} from "@/engine/buildEngine";
import { collectBuildChanges } from "@/lib/buildModifications";
import { collectConditionalBonuses } from "@/lib/conditionalBonuses";
import { createTestBuildState, getTestAppData } from "@/test/helpers";

function buildWithManyPerks(count: number) {
  const appData = getTestAppData();
  const game = appData.game;
  const perkIds: string[] = [];
  for (const tree of Object.values(game.perkTrees)) {
    for (const perk of tree.perks) perkIds.push(perk.id);
  }

  const build = reconcileBuild(game, {
    ...createTestBuildState({ raceId: "nord", playerLevel: 50 }),
    selectedPerkIds: perkIds.slice(0, count),
  });

  return { game, build, selected: build.selectedPerkIds.length, perkIds };
}

describe("computeBuild profiling", () => {
  it("profiles conditional bonus collection with many perks", () => {
    const { game, build, selected, perkIds } = buildWithManyPerks(120);

    const conditionalStart = performance.now();
    for (let i = 0; i < 50; i++) {
      collectConditionalBonuses(game, build);
    }
    const conditionalMs = performance.now() - conditionalStart;

    const computeStart = performance.now();
    for (let i = 0; i < 50; i++) {
      computeBuild(game, build);
    }
    const computeMs = performance.now() - computeStart;

    const collectStart = performance.now();
    for (let i = 0; i < 50; i++) {
      collectBuildChanges(game, build);
    }
    const collectMs = performance.now() - collectStart;

    const reconcileStart = performance.now();
    for (let i = 0; i < 50; i++) {
      reconcileBuild(game, build);
    }
    const reconcileMs = performance.now() - reconcileStart;

    const tryTakeStart = performance.now();
    const extraPerk = perkIds.find((id) => !build.selectedPerkIds.includes(id));
    if (extraPerk) {
      for (let i = 0; i < 50; i++) {
        tryTakePerk(game, build, extraPerk);
      }
    }
    const tryTakeMs = performance.now() - tryTakeStart;

    const results = {
      selected,
      conditionalMs,
      conditionalPerCall: conditionalMs / 50,
      computeMs,
      computePerCall: computeMs / 50,
      collectMs,
      collectPerCall: collectMs / 50,
      reconcileMs,
      reconcilePerCall: reconcileMs / 50,
      tryTakeMs,
      tryTakePerCall: tryTakeMs / 50,
    };
    writeFileSync("/tmp/compute-profile.json", JSON.stringify(results, null, 2));

    expect(selected).toBeGreaterThan(0);
    expect(results.computePerCall).toBeLessThan(25);
    expect(results.tryTakePerCall).toBeLessThan(2);
  });
});
