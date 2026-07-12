import { writeFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  computeBuild,
  reconcileBuild,
  reconcileImportedBuild,
  tryTakePerk,
  togglePerkSelection,
} from "@/engine/buildEngine";
import { decodeBuildPackage } from "@/engine/buildCodec";
import { collectBuildChanges } from "@/lib/buildModifications";
import { getBuildPlayerLevelWarnings, getSelectedPerksBelowSkillRequirement } from "@/engine/buildEngine";
import { getSkillLevelBonusLines } from "@/lib/skillLevelBonuses";
import { getOrderedPerkTrees, isAllocatableSkill } from "@/engine/buildEngine";
import { getTestAppData } from "@/test/helpers";

const USER_BUILD_CODE =
  "3.H4sIAEy0U2oAA31WS3ObMBD-KxnOVsaPuk5yzL2_INPDIq1BtR6MJHDdTv97VwKMiCEn2G-fWu1Df4uueDtsCk2f4vi8ff72vC82hSJyt91tCkdw6TBYQ6gnQoG40W9Jv0KWqBQQFYq3j6KyVjADoXUoCIN2IFTxc1P8iBKgAjoIMhlz6IO9U75B5HWU1FESO_A94wq3Mzh09IuG12CCNFVU0DLU_S8oXqOOUZ2lQe8xmgEys9tuDq-bLVFN7z7JMeFac0HDuNUlhGRgjIuBwCawWaA5t2kcUgQcV0Xwd4Nu3YLUjbMdCqahIiNO23iyTIBwyUExKL11zaMBDZ7-V-0b230VXYfO05-aXAu6BmlubLvLiVgDd-KYEy8Zscs5-1zncJrdF3njYLBPjtSUwjG2mUyQZ-CBDdinO-_5dDjHPJPGy6qOd5cJcEpY65myDucMVJh8qiXe6GzN6oIAc_GsjzLRyXBBsRozAX-Rasm7t61iFepcqy99RnWgZMgRYUWV9Ae6NekSU7c9YH2MWZMNpT1vuxl_Ku51oaG81wXuBV4jqL4_F9n0Cci_MnAFJ_wn5lD96-57AXVb1B6aY107KmVXMc4YSl0HhlNMpQJ-yUbPo4RKBZIuIbqfBPoO4A7OwWswvpZNzl9lCEDhJGdLXoUDbg0xV-MSdKSOZt0SD0tLrbrIUWs6lQLvFzkKKzQC3G09GOu49PWidgBJ3RH_GqtIaGCnrcBoSgcaWbql0T6B1v4hX3RjE0YTnTIo0uT4DPUN8YgeJhRDjY7KlhFhJ7iGqhpKeUAUUjO58aZ6TKNLbT0hXlIaHaPdWbVZ4P4CKovZE5vZM537msftA8WXktbNdyTzN93U8eZIKZauTnXW867SiNI6KjSNyqZNPS5QxqGhLOc7ldE-hIYFKq9LNDLhWR7vYH_ouFsVbdOPbAO_0or9KMhWdxv3yukYoVJZfhmJcLWUSrJKh0-ApTBH4LSPiAZHhQMU4_El0vdnwOkUSW8QyNwxEdPD4HSI9Lj7N7ttCmd4UYzk_ZHQB0PjuO1N7xJNbfSrHWfCy2uE4i5z7TCiTgmaTY674WnVDlD-UIkQpSzQQ2qWs91mnxxPyP4BOZB2VLYyPl9m8WQHWHj_5O-p0tBT7T110NM7dcsTe4rvvMPz9-Lff2752JD-CQAA";

function bench(name: string, fn: () => void, iterations: number): number {
  const start = performance.now();
  for (let i = 0; i < iterations; i++) fn();
  const ms = performance.now() - start;
  return ms / iterations;
}

describe("user build profiling", () => {
  it("profiles engine hot paths for the reported slow build", () => {
    const appData = getTestAppData();
    const game = appData.game;
    const decoded = decodeBuildPackage(USER_BUILD_CODE, game);
    const build = reconcileImportedBuild(game, decoded.build);

    const trees = getOrderedPerkTrees(game).filter((t) => isAllocatableSkill(game, t.skillId));
    const unselectedPerk = trees
      .flatMap((t) => t.perks.map((p) => p.id))
      .find((id) => !build.selectedPerkIds.includes(id));

    const results = {
      selectedPerks: build.selectedPerkIds.length,
      playerLevel: build.playerLevel,
      raceId: build.raceId,
      computeBuildMs: bench("computeBuild", () => computeBuild(game, build), 50),
      reconcileBuildMs: bench("reconcileBuild", () => reconcileBuild(game, build), 50),
      collectChangesMs: bench("collectBuildChanges", () => collectBuildChanges(game, build), 50),
      tryTakePerkMs: unselectedPerk
        ? bench("tryTakePerk", () => tryTakePerk(game, build, unselectedPerk), 50)
        : null,
      togglePerkMs: bench(
        "togglePerk",
        () => togglePerkSelection(game, build, build.selectedPerkIds[0]!),
        50,
      ),
      warningsMs: bench(
        "getBuildPlayerLevelWarnings",
        () => getBuildPlayerLevelWarnings(game, build),
        50,
      ),
      skillReqMs: bench(
        "getSelectedPerksBelowSkillRequirement",
        () => getSelectedPerksBelowSkillRequirement(game, build),
        50,
      ),
      sidebarLoopMs: bench(
        "sidebar loop",
        () => {
          getBuildPlayerLevelWarnings(game, build);
          getSelectedPerksBelowSkillRequirement(game, build);
          for (const tree of trees) {
            getSkillLevelBonusLines(game, build, tree.skillId, {});
          }
        },
        20,
      ),
      setRaceMs: bench(
        "setRace reconcile path",
        () => reconcileBuild(game, { ...build, raceId: "bosmer" }),
        50,
      ),
    };

    writeFileSync("/tmp/user-build-profile.json", JSON.stringify(results, null, 2));

    expect(build.selectedPerkIds.length).toBeGreaterThan(0);
    expect(results.computeBuildMs).toBeLessThan(50);
    expect(results.warningsMs).toBeLessThan(5);
    expect(results.skillReqMs).toBeLessThan(5);
    expect(results.sidebarLoopMs).toBeLessThan(15);
  });
});
