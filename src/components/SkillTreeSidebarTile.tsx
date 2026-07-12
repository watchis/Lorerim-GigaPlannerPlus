import { memo, useMemo } from "react";
import type { PerkTree } from "@/data/schemas";
import { SkillLevelBonusIndicator } from "@/components/SkillLevelBonusIndicator";
import { SkillIcon } from "@/components/SkillIcon";
import { TreeMiniPreview } from "@/components/TreeMiniPreview";
import type { SkillLevelBonusLine } from "@/lib/skillLevelBonuses";
import { cn } from "@/lib/utils";

interface SkillTreeSidebarTileProps {
  tree: PerkTree;
  skillLevel: number;
  skillBonusLines: SkillLevelBonusLine[];
  labels: Record<string, string>;
  compact: boolean;
  isActive: boolean;
  hasProblem: boolean;
  conflictPerkIds: string[];
  searchPerkPositionKeys?: ReadonlySet<string>;
  onOpenTree: (skillId: string) => void;
}

function arraysEqual(left: string[], right: string[]): boolean {
  if (left.length !== right.length) return false;
  for (let index = 0; index < left.length; index += 1) {
    if (left[index] !== right[index]) return false;
  }
  return true;
}

export const SkillTreeSidebarTile = memo(function SkillTreeSidebarTile({
  tree,
  skillLevel,
  skillBonusLines,
  labels,
  compact,
  isActive,
  hasProblem,
  conflictPerkIds,
  searchPerkPositionKeys,
  onOpenTree,
}: SkillTreeSidebarTileProps) {
  const stableConflictPerkIds = useMemo(
    () => conflictPerkIds,
    // eslint-disable-next-line react-hooks/exhaustive-deps -- compare by value for memo stability
    [conflictPerkIds.join("\0")],
  );

  return (
    <button
      type="button"
      onClick={() => onOpenTree(tree.skillId)}
      className={cn(
        "grid grid-rows-[auto_minmax(0,1fr)] gap-1 overflow-hidden rounded-[var(--radius-sm)] border text-left transition-colors",
        "min-h-[145px]",
        compact ? "p-1" : "p-1.5",
        hasProblem && "border-[var(--color-error)]/35 bg-[var(--color-error)]/[0.04]",
        !hasProblem &&
          isActive &&
          "border-[var(--color-accent)] bg-[var(--color-accent)]/[0.03]",
        !hasProblem &&
          !isActive &&
          "border-[var(--color-border)]/50 bg-transparent hover:border-[var(--color-border)] hover:bg-[var(--color-surface-elevated)]/15",
        hasProblem &&
          isActive &&
          "border-[var(--color-error)]/50 bg-[var(--color-error)]/[0.06]",
      )}
    >
      <div className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-1 gap-y-0.5 leading-tight">
        <SkillIcon
          skillId={tree.skillId}
          className={cn(
            "row-start-1 mt-px h-3 w-3 shrink-0 self-start",
            hasProblem ? "text-[var(--color-error)]/65" : "text-[var(--color-accent-muted)]",
          )}
        />
        <div
          className={cn(
            "row-start-1 col-start-2 flex min-w-0 items-center gap-1.5",
            "min-w-0",
            "text-[10px]",
          )}
        >
          <span
            className="align-middle min-w-0 truncate font-semibold leading-snug tracking-tight text-[var(--color-foreground)]"
            title={tree.skillName}
          >
            {tree.skillName}
          </span>
          <SkillLevelBonusIndicator
            lines={skillBonusLines}
            size="compact"
            reserveSpace
            ariaLabel={labels.skillBonusIndicator ?? "View skill level bonuses"}
            onClick={(event) => event.stopPropagation()}
            onPointerDown={(event) => event.stopPropagation()}
          />
        </div>
        <span
          className={cn(
            "col-start-2 justify-self-start tabular-nums text-[10px] font-medium leading-none",
            hasProblem ? "text-[var(--color-error)]/80" : "text-[var(--color-foreground)]/55",
          )}
        >
          {skillLevel}
        </span>
      </div>
      <div className="flex min-h-0 items-center justify-center overflow-hidden p-px">
        <TreeMiniPreview
          tree={tree}
          conflictPerkIds={stableConflictPerkIds}
          searchPerkPositionKeys={searchPerkPositionKeys}
          className="h-full w-full"
        />
      </div>
    </button>
  );
}, (previous, next) => {
  return (
    previous.tree === next.tree &&
    previous.skillLevel === next.skillLevel &&
    previous.compact === next.compact &&
    previous.isActive === next.isActive &&
    previous.hasProblem === next.hasProblem &&
    previous.onOpenTree === next.onOpenTree &&
    previous.labels === next.labels &&
    arraysEqual(previous.skillBonusLines.map((line) => line.key), next.skillBonusLines.map((line) => line.key)) &&
    arraysEqual(previous.conflictPerkIds, next.conflictPerkIds) &&
    previous.searchPerkPositionKeys === next.searchPerkPositionKeys
  );
});
