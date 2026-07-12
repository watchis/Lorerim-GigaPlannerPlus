import type { PerkTree } from "@/data/schemas";
import { PerkTreeMiniView } from "@/components/PerkTreeMiniView";
import {
  useTreePerkPointsRemaining,
  useTreeSelectedPerkIds,
} from "@/hooks/useTreePerkSelection";

interface TreeMiniPreviewProps {
  tree: PerkTree;
  conflictPerkIds?: string[];
  searchPerkPositionKeys?: ReadonlySet<string>;
  className?: string;
}

/** Mini perk tree preview scoped to a single tree so unrelated allocations do not re-render it. */
export function TreeMiniPreview({
  tree,
  conflictPerkIds = [],
  searchPerkPositionKeys,
  className,
}: TreeMiniPreviewProps) {
  const selectedPerkIds = useTreeSelectedPerkIds(tree);
  const perkPointsRemaining = useTreePerkPointsRemaining(tree, selectedPerkIds);

  return (
    <PerkTreeMiniView
      tree={tree}
      selectedPerkIds={selectedPerkIds}
      perkPointsRemaining={perkPointsRemaining}
      compact
      conflictPerkIds={conflictPerkIds}
      searchPerkPositionKeys={searchPerkPositionKeys}
      className={className}
    />
  );
}
