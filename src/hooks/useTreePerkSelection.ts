import { useMemo } from "react";
import { useShallow } from "zustand/react/shallow";
import type { PerkTree } from "@/data/schemas";
import {
  filterSelectedPerkIdsForTree,
  getTreePerkIdSet,
  treeMayShowPartialStacks,
} from "@/lib/treePerkSelection";
import { treeUsesGlobalPerkPointBudget } from "@/lib/perkTreeAvailability";
import { useBuildStore } from "@/store/buildStore";

/** Selected perk ids belonging to a single tree — updates only when that tree's allocation changes. */
export function useTreeSelectedPerkIds(tree: PerkTree): string[] {
  const treePerkIds = useMemo(() => getTreePerkIdSet(tree), [tree]);
  return useBuildStore(
    useShallow((state) =>
      state.build.selectedPerkIds.filter((perkId) => treePerkIds.has(perkId)),
    ),
  );
}

export function useTreePerkPointsRemaining(
  tree: PerkTree,
  selectedPerkIds: string[],
): number {
  const needsBudget = useMemo(
    () =>
      treeUsesGlobalPerkPointBudget(tree.skillId) &&
      treeMayShowPartialStacks(tree, selectedPerkIds),
    [tree, selectedPerkIds],
  );

  return useBuildStore((state) =>
    needsBudget ? (state.computed?.perkPointsRemaining ?? 0) : 0,
  );
}

export { filterSelectedPerkIdsForTree, treeMayShowPartialStacks };
