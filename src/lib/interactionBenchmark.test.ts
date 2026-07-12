import { describe, expect, it } from "vitest";
import {
  computeBuild,
  createInitialBuildState,
  getOrderedPerkTrees,
  getStoredSkillLevel,
  isAllocatableSkill,
  reconcileBuild,
  tryTakePerk,
} from "@/engine/buildEngine";
import { collectBuildChanges } from "@/lib/buildModifications";
import { getSkillLevelBonusLines } from "@/lib/skillLevelBonuses";
import { createTestBuildState, getTestAppData } from "@/test/helpers";

describe("interaction benchmark", () => {
  it("keeps hot-path engine work under interactive budget", () => {
    const appData = getTestAppData();
    const game = appData.game;
    let build = reconcileBuild(game, createTestBuildState({ raceId: "nord", playerLevel: 50 }));

    const perkIds: string[] = [];
    for (const tree of Object.values(game.perkTrees)) {
      for (const perk of tree.perks.slice(0, 3)) {
        perkIds.push(perk.id);
      }
    }
    for (const perkId of perkIds.slice(0, 40)) {
      const next = tryTakePerk(game, build, perkId);
      if (next) build = next;
    }

    const trees = getOrderedPerkTrees(game).filter((tree) =>
      isAllocatableSkill(game, tree.skillId),
    );

    const collectStart = performance.now();
    for (let i = 0; i < 200; i++) {
      collectBuildChanges(game, build);
    }
    const collectMs = performance.now() - collectStart;

    const computeStart = performance.now();
    for (let i = 0; i < 100; i++) {
      computeBuild(game, build);
    }
    const computeMs = performance.now() - computeStart;

    const reconcileStart = performance.now();
    for (let i = 0; i < 200; i++) {
      reconcileBuild(game, { ...build, birthsignId: "apprentice" });
    }
    const reconcileMs = performance.now() - reconcileStart;

    const tryTakeStart = performance.now();
    const unselected = perkIds.find((id) => !build.selectedPerkIds.includes(id));
    if (unselected) {
      for (let i = 0; i < 100; i++) {
        tryTakePerk(game, build, unselected);
      }
    }
    const tryTakeMs = performance.now() - tryTakeStart;

    const sidebarStart = performance.now();
    for (let i = 0; i < 10; i++) {
      for (const tree of trees) {
        getStoredSkillLevel(game, build, tree.skillId);
        getSkillLevelBonusLines(game, build, tree.skillId, {});
      }
    }
    const sidebarMs = performance.now() - sidebarStart;

    // eslint-disable-next-line no-console -- benchmark diagnostic
    console.log(
      JSON.stringify({
        selectedPerks: build.selectedPerkIds.length,
        collectMs,
        computeMs,
        reconcileMs,
        tryTakeMs,
        sidebarMs,
        treeCount: trees.length,
      }),
    );

    expect(collectMs).toBeLessThan(3000);
    expect(computeMs).toBeLessThan(3000);
    expect(reconcileMs).toBeLessThan(3000);
    expect(tryTakeMs).toBeLessThan(3000);
    expect(sidebarMs).toBeLessThan(3000);
  });
});
