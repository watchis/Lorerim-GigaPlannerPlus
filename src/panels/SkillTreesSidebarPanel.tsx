import { PerkTreeMiniView } from "@/components/PerkTreeMiniView";
import { BuildVariantsDropdown } from "@/components/BuildVariantsDropdown";
import { SkillIcon } from "@/components/SkillIcon";
import { ResetPerksButton } from "@/components/ResetPerksButton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { getSkillGridColumnCount, useContainerSize } from "@/lib/useContainerSize";
import {
  getBuildPlayerLevelWarnings,
  getOrderedPerkTrees,
  getSelectedPerksBelowSkillRequirement,
  getStoredSkillLevel,
  getStoredSkillTraining,
  isAllocatableSkill,
  isSkillOverPlayerLevelCap,
} from "@/engine/buildEngine";
import { useBuildStore } from "@/store/buildStore";
import { isSkillTreeOpenInMiddlePane, useUiStore } from "@/store/uiStore";
import { usePanelLabels } from "@/theme/ThemeProvider";
import { useGoToSwipePane } from "@/layout/PlannerSwipePanels";
import {
  usePlannerLayoutScale,
  usePlannerSideWidths,
  usePlannerStackedLayout,
  usePlannerThreeColumnLayout,
} from "@/layout/plannerLayout";

const RESET_ICON_ONLY_MAX_WIDTH = 280;
const CENTER_SWIPE_PANE_INDEX = 1;

export function SkillTreesSidebarPanel() {
  const labels = usePanelLabels("skill-trees");
  const stackedLayout = usePlannerStackedLayout();
  const useThreeColumnLayout = usePlannerThreeColumnLayout();
  const layoutScale = usePlannerLayoutScale();
  const sideWidths = usePlannerSideWidths();
  const compact =
    stackedLayout || (useThreeColumnLayout && layoutScale < 0.75);
  const iconOnlyReset =
    useThreeColumnLayout &&
    (sideWidths?.right ?? Number.POSITIVE_INFINITY) < RESET_ICON_ONLY_MAX_WIDTH;
  const gameData = useBuildStore((s) => s.gameData);
  const build = useBuildStore((s) => s.build);
  const computed = useBuildStore((s) => s.computed);
  const resetAllPerks = useBuildStore((s) => s.resetAllPerks);
  const activeSkillTreeId = useUiStore((s) => s.activeSkillTreeId);
  const skillTreeOpen = useUiStore(isSkillTreeOpenInMiddlePane);
  const openSkillTree = useUiStore((s) => s.openSkillTree);
  const goToSwipePane = useGoToSwipePane();

  if (!gameData) return null;

  const trees = getOrderedPerkTrees(gameData.game).filter((tree) =>
    isAllocatableSkill(gameData.game, tree.skillId),
  );
  const { perks: overLevelPerks, skillIncreases } = getBuildPlayerLevelWarnings(
    gameData.game,
    build,
  );
  const skillReqConflicts = getSelectedPerksBelowSkillRequirement(gameData.game, build);
  const skillIncreaseConflictIds = new Set(skillIncreases.map((skill) => skill.skillId));

  const { ref: gridContainerRef, width: gridWidth } = useContainerSize<HTMLDivElement>();
  const responsiveColumns = getSkillGridColumnCount(gridWidth, {
    minCellWidth: stackedLayout ? 120 : 100,
    maxColumns: stackedLayout ? 3 : 4,
  });
  const gridColumns = useThreeColumnLayout ? 3 : responsiveColumns;
  const trainingOverBudget = computed?.trainingLevelsRemaining < 0;

  return (
    <Card
      className={cn(
        "flex min-h-0 flex-1 flex-col overflow-hidden",
      )}
    >
      <CardHeader
        className={cn(
          "flex-shrink-0 flex-col items-stretch gap-3 space-y-0 border-b border-[var(--color-border)]/50",
          stackedLayout ? "px-3 py-2.5" : compact ? "gap-2 px-2 py-2" : "px-3 py-3",
        )}
      >
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-x-2">
          <CardTitle
            className={cn(
              "col-start-1 row-start-1 min-w-0 leading-snug [overflow-wrap:anywhere]",
              compact ? "text-sm" : "text-base",
            )}
          >
            {labels.title}
          </CardTitle>
          <ResetPerksButton
            className="col-start-2 row-start-1"
            iconOnly={iconOnlyReset}
            ariaLabel={labels.resetAll}
            onClick={resetAllPerks}
          >
            {labels.resetAll}
          </ResetPerksButton>
        </div>
        <BuildVariantsDropdown />
      </CardHeader>
      <CardContent
        className={cn(
          "min-h-0 flex-1 overflow-y-auto overscroll-y-contain",
          compact ? "p-1" : "p-2",
        )}
      >
        <div
          ref={gridContainerRef}
          className={cn("grid gap-1.5", compact && "gap-1")}
          style={{
            gridTemplateColumns: `repeat(${gridColumns}, minmax(0, 1fr))`,
            gridAutoRows: "minmax(6.5rem, auto)",
          }}
        >
            {trees.map((tree) => {
              const isActive = skillTreeOpen && activeSkillTreeId === tree.skillId;
              const skillLevel = getStoredSkillLevel(gameData.game, build, tree.skillId);
              const isDestinyTree = tree.skillId === "destiny";
              const trainingAssignedCount = !isDestinyTree
                ? getStoredSkillTraining(gameData.game, build, tree.skillId)
                : 0;
              const hasTraining = trainingAssignedCount > 0;
              const isOverCap = isSkillOverPlayerLevelCap(gameData.game, build, tree.skillId);
              const conflictPerkIds = [
                ...overLevelPerks
                  .filter((perk) => perk.skillId === tree.skillId)
                  .map((perk) => perk.id),
                ...skillReqConflicts
                  .filter((perk) => perk.skillId === tree.skillId)
                  .map((perk) => perk.id),
              ];
              const hasPerkLevelConflict = conflictPerkIds.length > 0;
              const hasSkillIncreaseConflict = skillIncreaseConflictIds.has(tree.skillId);
              const hasProblem = isOverCap || hasPerkLevelConflict || hasSkillIncreaseConflict;

              return (
                <button
                  key={tree.skillId}
                  type="button"
                  onClick={() => {
                    openSkillTree(tree.skillId);
                    if (stackedLayout) {
                      goToSwipePane(CENTER_SWIPE_PANE_INDEX);
                    }
                  }}
                  className={cn(
                    "grid grid-rows-[auto_minmax(0,1fr)] gap-1 overflow-hidden rounded-[var(--radius-sm)] border text-left transition-colors",
                    "min-h-[6.5rem]",
                    compact ? "p-1" : "p-1.5",
                    hasProblem &&
                      "border-[var(--color-error)]/35 bg-[var(--color-error)]/[0.04]",
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
                        hasProblem
                          ? "text-[var(--color-error)]/65"
                          : "text-[var(--color-accent-muted)]",
                      )}
                    />
                    <div
                      className={cn(
                        "row-start-1 col-start-2 flex min-w-0 items-center gap-1.5",
                        "min-w-0",
                        gridColumns <= 2 ? "text-xs" : compact ? "text-[10px]" : "text-[11px]",
                      )}
                    >
                      <span
                        className="min-w-0 truncate font-semibold leading-snug tracking-tight text-[var(--color-foreground)]"
                        title={tree.skillName}
                      >
                        {tree.skillName}
                      </span>
                      {hasTraining && (
                        <span
                          className={cn(
                            "mt-px h-1.5 w-1.5 shrink-0 rounded-full",
                            trainingOverBudget ? "bg-[var(--color-error)]" : "bg-[var(--color-accent)]",
                            trainingOverBudget ? "animate-pulse" : undefined,
                          )}
                          aria-hidden="true"
                        />
                      )}
                    </div>
                    <span
                      className={cn(
                        "col-start-2 justify-self-start tabular-nums text-[10px] font-medium leading-none",
                        hasProblem
                          ? "text-[var(--color-error)]/80"
                          : "text-[var(--color-foreground)]/55",
                      )}
                    >
                      {skillLevel}
                    </span>
                  </div>
                  <div className="flex min-h-0 items-center justify-center overflow-hidden p-px">
                    <PerkTreeMiniView
                      tree={tree}
                      compact
                      conflictPerkIds={conflictPerkIds}
                      className="h-full w-full"
                    />
                  </div>
                </button>
              );
            })}
        </div>
      </CardContent>
    </Card>
  );
}
