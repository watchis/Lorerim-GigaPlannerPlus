import { describe, expect, it } from "vitest";
import {
  computeBuild,
  getOrderedPerkTrees,
  getStoredSkillLevel,
  isAllocatableSkill,
  reconcileBuild,
} from "@/engine/buildEngine";
import { getSkillLevelBonusLines } from "@/lib/skillLevelBonuses";
import { createTestBuildState, getTestAppData } from "@/test/helpers";

describe("interaction benchmark", () => {
  it("keeps hot-path engine work under interactive budget", () => {
    const appData = getTestAppData();
    const game = appData.game;
    const build = reconcileBuild(game, createTestBuildState({ raceId: "nord" }));
    const trees = getOrderedPerkTrees(game).filter((tree) =>
      isAllocatableSkill(game, tree.skillId),
    );

    const computeStart = performance.now();
    for (let i = 0; i < 30; i++) {
      computeBuild(game, build);
    }
    const computeMs = performance.now() - computeStart;

    const reconcileStart = performance.now();
    for (let i = 0; i < 30; i++) {
      reconcileBuild(game, { ...build, birthsignId: "apprentice" });
    }
    const reconcileMs = performance.now() - reconcileStart;

    const sidebarStart = performance.now();
    for (let i = 0; i < 10; i++) {
      for (const tree of trees) {
        getStoredSkillLevel(game, build, tree.skillId);
        getSkillLevelBonusLines(game, build, tree.skillId, {});
      }
    }
    const sidebarMs = performance.now() - sidebarStart;

    expect(computeMs).toBeLessThan(2000);
    expect(reconcileMs).toBeLessThan(2000);
    expect(sidebarMs).toBeLessThan(2000);

    // eslint-disable-next-line no-console -- benchmark diagnostic
    console.log(
      JSON.stringify({ computeMs, reconcileMs, sidebarMs, treeCount: trees.length }),
    );
  });
});
