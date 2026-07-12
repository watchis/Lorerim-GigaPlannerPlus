import { describe, expect, it } from "vitest";
import {
  filterSelectedPerkIdsForTree,
  treeMayShowPartialStacks,
} from "@/lib/treePerkSelection";
import { getTestAppData, createTestBuildState } from "@/test/helpers";

describe("treePerkSelection", () => {
  const appData = getTestAppData();
  const smithingTree = appData.game.perkTrees.smithing!;

  it("filters selected perks to a single tree", () => {
    const smithingPerkId = smithingTree.perks[0]!.id;
    const otherPerkId = appData.game.perkTrees.block!.perks[0]!.id;
    const selectedPerkIds = [smithingPerkId, otherPerkId];
    expect(filterSelectedPerkIdsForTree(smithingTree, selectedPerkIds)).toEqual([smithingPerkId]);
  });

  it("detects when a tree can render partial perk stacks", () => {
    const selectedPerkIds = smithingTree.perks.slice(0, 1).map((perk) => perk.id);
    expect(treeMayShowPartialStacks(smithingTree, selectedPerkIds)).toBe(false);
  });

  it("does not treat unrelated build changes as partial-stack trees", () => {
    const otherPerkId = appData.game.perkTrees.block!.perks[0]!.id;
    const build = createTestBuildState({
      selectedPerkIds: [otherPerkId],
    });
    expect(treeMayShowPartialStacks(smithingTree, build.selectedPerkIds)).toBe(false);
  });
});
