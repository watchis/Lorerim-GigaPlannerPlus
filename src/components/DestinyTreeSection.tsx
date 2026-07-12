import { useMemo } from "react";
import { TreeMiniPreview } from "@/components/TreeMiniPreview";
import { SkillIcon } from "@/components/SkillIcon";
import { getBuildPlayerLevelWarnings } from "@/engine/buildEngine";
import { cn } from "@/lib/utils";
import { getPerkSearchPositionKeysForTree, getPerkSearchTokens } from "@/lib/perkSearch";
import { useGoToSwipePane } from "@/layout/PlannerSwipePanels";
import { usePlannerStackedLayout } from "@/layout/plannerLayout";
import { useBuildStore } from "@/store/buildStore";
import { isSkillTreeOpenInMiddlePane, useUiStore } from "@/store/uiStore";
import { usePanelLabels } from "@/theme/ThemeProvider";

const DESTINY_SKILL_ID = "destiny";

export function DestinyTreeSection() {
  const setupLabels = usePanelLabels("character-setup");
  const gameData = useBuildStore((s) => s.gameData);
  const build = useBuildStore((s) => s.build);
  const activeSkillTreeId = useUiStore((s) => s.activeSkillTreeId);
  const skillTreeOpen = useUiStore(isSkillTreeOpenInMiddlePane);
  const openSkillTree = useUiStore((s) => s.openSkillTree);
  const perkSearchQuery = useUiStore((s) => s.perkSearchQuery);
  const stackedLayout = usePlannerStackedLayout();
  const goToSwipePane = useGoToSwipePane();

  if (!gameData) return null;

  const tree = gameData.game.perkTrees[DESTINY_SKILL_ID];
  if (!tree) return null;

  const isActive = skillTreeOpen && activeSkillTreeId === DESTINY_SKILL_ID;
  const { perks: overLevelPerks, destinyPerksOverBudget } = getBuildPlayerLevelWarnings(
    gameData.game,
    build,
  );
  const conflictPerkIds = [
    ...overLevelPerks
      .filter((perk) => perk.skillId === DESTINY_SKILL_ID)
      .map((perk) => perk.id),
    ...destinyPerksOverBudget.map((perk) => perk.id),
  ];
  const hasPerkLevelConflict = conflictPerkIds.length > 0;
  const hasProblem = hasPerkLevelConflict;
  const perkSearchTokens = useMemo(() => getPerkSearchTokens(perkSearchQuery), [perkSearchQuery]);
  const perkSearchPositionKeys = useMemo(
    () => getPerkSearchPositionKeysForTree(tree, perkSearchTokens),
    [tree, perkSearchTokens],
  );

  return (
    <div className="border-t border-[var(--color-border)]/70 pt-3">
      <button
        type="button"
        onClick={() => {
          openSkillTree(DESTINY_SKILL_ID);
          if (stackedLayout) {
            goToSwipePane(1);
          }
        }}
        className={cn(
          "grid w-full min-h-0 grid-rows-[auto_minmax(0,1fr)] gap-0.5 overflow-hidden rounded-[var(--radius-sm)] border p-1 text-left transition-colors",
          hasProblem && "border-[var(--color-error)]/35 bg-[var(--color-error)]/[0.04]",
          !hasProblem && isActive && "border-[var(--color-accent)] bg-[var(--color-accent)]/[0.03]",
          !hasProblem &&
            !isActive &&
            "border-[var(--color-border)]/50 bg-transparent hover:border-[var(--color-border)] hover:bg-[var(--color-surface-elevated)]/15",
          hasProblem && isActive && "border-[var(--color-error)]/50 bg-[var(--color-error)]/[0.06]",
        )}
      >
        <div className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-1 gap-y-0.5 leading-tight">
          <SkillIcon
            skillId={DESTINY_SKILL_ID}
            className={cn(
              "row-start-1 mt-px h-3 w-3 shrink-0 self-start",
              hasProblem ? "text-[var(--color-error)]/65" : "text-[var(--color-accent-muted)]",
            )}
          />
          <span
            className="min-w-0 truncate text-[11px] font-semibold leading-snug tracking-tight text-[var(--color-foreground)]"
            title={setupLabels.destiny ?? tree.skillName}
          >
            {setupLabels.destiny ?? tree.skillName}
          </span>
        </div>
        <div className="flex aspect-square min-h-0 w-full items-center justify-center overflow-hidden p-px">
          <TreeMiniPreview
            tree={tree}
            conflictPerkIds={conflictPerkIds}
            searchPerkPositionKeys={perkSearchPositionKeys}
            className="h-full w-full"
          />
        </div>
      </button>
    </div>
  );
}
