import type { PerkTree } from "@/data/schemas";
import {
  getPerkAllocationRank,
  getPerkStackRank,
  groupPerksByPosition,
  isPerkPartiallyAllocated,
} from "@/lib/perkTreeGrid";

export function getTreePerkIdSet(tree: PerkTree): Set<string> {
  return new Set(tree.perks.map((perk) => perk.id));
}

export function filterSelectedPerkIdsForTree(tree: PerkTree, selectedPerkIds: string[]): string[] {
  const treePerkIds = getTreePerkIdSet(tree);
  return selectedPerkIds.filter((perkId) => treePerkIds.has(perkId));
}

/** Whether this tree can render partial-rank nodes that depend on the global perk budget. */
export function treeMayShowPartialStacks(tree: PerkTree, selectedPerkIds: string[]): boolean {
  const stacksByPosition = groupPerksByPosition(tree);

  for (const [, stack] of stacksByPosition) {
    const stackRank =
      stack.length > 1
        ? getPerkStackRank(stack, selectedPerkIds)
        : getPerkAllocationRank(stack[0]!, selectedPerkIds);
    if (!stackRank || stackRank.current <= 0) continue;

    if (stackRank.unbounded) return true;
    if (stackRank.total !== undefined && stackRank.current < stackRank.total) return true;
  }

  return false;
}

export function isTreePartiallyAllocated(
  tree: PerkTree,
  selectedPerkIds: string[],
  perkPointsRemaining: number,
): boolean {
  const stacksByPosition = groupPerksByPosition(tree);

  for (const [, stack] of stacksByPosition) {
    const stackRank =
      stack.length > 1
        ? getPerkStackRank(stack, selectedPerkIds)
        : getPerkAllocationRank(stack[0]!, selectedPerkIds);
    if (!stackRank || stackRank.current <= 0) continue;

    const canAllocateMore = stackRank.unbounded
      ? perkPointsRemaining > 0
      : stackRank.total !== undefined && stackRank.current < stackRank.total;

    if (isPerkPartiallyAllocated(stackRank, stackRank.current > 0, canAllocateMore)) {
      return true;
    }
  }

  return false;
}
