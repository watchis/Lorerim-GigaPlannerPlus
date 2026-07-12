import { useEffect, useMemo } from "react";
import { TreeMiniPreview } from "@/components/TreeMiniPreview";
import { SkillIcon } from "@/components/SkillIcon";
import { useDeferredRender } from "@/hooks/useDeferredRender";
import { cn } from "@/lib/utils";
import { getPerkSearchPositionKeysForTree, getPerkSearchTokens } from "@/lib/perkSearch";
import { useGoToSwipePane } from "@/layout/PlannerSwipePanels";
import { usePlannerStackedLayout } from "@/layout/plannerLayout";
import { useBuildStore } from "@/store/buildStore";
import { isSkillTreeOpenInMiddlePane, useUiStore } from "@/store/uiStore";

interface SupernaturalTreeSectionProps {
  skillId: string;
  label: string;
  isActive: boolean;
}

export function SupernaturalTreeSection({
  skillId,
  label,
  isActive,
}: SupernaturalTreeSectionProps) {
  const gameData = useBuildStore((s) => s.gameData);
  const computed = useBuildStore((s) => s.computed);
  const activeSkillTreeId = useUiStore((s) => s.activeSkillTreeId);
  const skillTreeOpen = useUiStore(isSkillTreeOpenInMiddlePane);
  const openSkillTree = useUiStore((s) => s.openSkillTree);
  const perkSearchQuery = useUiStore((s) => s.perkSearchQuery);
  const stackedLayout = usePlannerStackedLayout();
  const goToSwipePane = useGoToSwipePane();

  useEffect(() => {
    if (!isActive && skillTreeOpen && activeSkillTreeId === skillId) {
      useUiStore.setState({
        middleView: "character-info",
        activeSkillTreeId: null,
        skillWorkspaceMode: "perks",
      });
    }
  }, [isActive, skillTreeOpen, activeSkillTreeId, skillId]);

  if (!gameData || !isActive || !computed) return null;

  const tree = gameData.game.perkTrees[skillId];
  if (!tree) return null;

  const isTreeActive = skillTreeOpen && activeSkillTreeId === skillId;
  const { perks: overLevelPerks } = computed.playerLevelWarnings;
  const conflictPerkIds = overLevelPerks
    .filter((perk) => perk.skillId === skillId)
    .map((perk) => perk.id);
  const hasProblem = conflictPerkIds.length > 0;
  const perkSearchTokens = useMemo(() => getPerkSearchTokens(perkSearchQuery), [perkSearchQuery]);
  const perkSearchPositionKeys = useMemo(
    () => getPerkSearchPositionKeysForTree(tree, perkSearchTokens),
    [tree, perkSearchTokens],
  );
  const showMiniTree = useDeferredRender(isActive);

  return (
    <div className="border-t border-[var(--color-border)]/70 pt-3">
      <button
        type="button"
        onClick={() => {
          openSkillTree(skillId);
          if (stackedLayout) {
            goToSwipePane(1);
          }
        }}
        className={cn(
          "grid w-full min-h-0 grid-rows-[auto_minmax(0,1fr)] gap-0.5 overflow-hidden rounded-[var(--radius-sm)] border p-1 text-left transition-colors",
          hasProblem && "border-[var(--color-error)]/35 bg-[var(--color-error)]/[0.04]",
          !hasProblem && isTreeActive && "border-[var(--color-accent)] bg-[var(--color-accent)]/[0.03]",
          !hasProblem &&
            !isTreeActive &&
            "border-[var(--color-border)]/50 bg-transparent hover:border-[var(--color-border)] hover:bg-[var(--color-surface-elevated)]/15",
          hasProblem && isTreeActive && "border-[var(--color-error)]/50 bg-[var(--color-error)]/[0.06]",
        )}
      >
        <div className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-1 gap-y-0.5 leading-tight">
          <SkillIcon
            skillId={skillId}
            className={cn(
              "row-start-1 mt-px h-3 w-3 shrink-0 self-start",
              hasProblem ? "text-[var(--color-error)]/65" : "text-[var(--color-accent-muted)]",
            )}
          />
          <span
            className="min-w-0 truncate text-[11px] font-semibold leading-snug tracking-tight text-[var(--color-foreground)]"
            title={label}
          >
            {label}
          </span>
        </div>
        <div className="flex aspect-square min-h-0 w-full items-center justify-center overflow-hidden p-px">
          {showMiniTree ? (
            <TreeMiniPreview
              tree={tree}
              conflictPerkIds={conflictPerkIds}
              searchPerkPositionKeys={perkSearchPositionKeys}
              className="h-full w-full"
            />
          ) : (
            <div
              className="h-full w-full rounded-[var(--radius-sm)] bg-[var(--color-surface-elevated)]/20"
              aria-hidden
            />
          )}
        </div>
      </button>
    </div>
  );
}
