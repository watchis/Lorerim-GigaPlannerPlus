import { useCallback, useMemo } from "react";
import { SkillTreeSidebarTile } from "@/components/SkillTreeSidebarTile";
import { BuildVariantsDropdown } from "@/components/BuildVariantsDropdown";
import { ResetPerksButton } from "@/components/ResetPerksButton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { getSkillGridColumnCount, useContainerSize } from "@/lib/useContainerSize";
import { PickerSearchInput } from "@/components/PickerSearchInput";
import {
  getOrderedPerkTrees,
  isAllocatableSkill,
} from "@/engine/buildEngine";
import { useBuildStore } from "@/store/buildStore";
import { isSkillTreeOpenInMiddlePane, useUiStore } from "@/store/uiStore";
import { usePanelLabels } from "@/theme/ThemeProvider";
import { useGoToSwipePane } from "@/layout/PlannerSwipePanels";
import { getPerkSearchPositionKeysForTrees, getPerkSearchTokens } from "@/lib/perkSearch";
import { getSkillLevelBonusLines } from "@/lib/skillLevelBonuses";
import {
  usePlannerLayoutScale,
  usePlannerSideWidths,
  usePlannerStackedLayout,
  usePlannerThreeColumnLayout,
} from "@/layout/plannerLayout";

const RESET_ICON_ONLY_MAX_WIDTH = 280;
const CENTER_SWIPE_PANE_INDEX = 1;
const EMPTY_CONFLICT_PERK_IDS: string[] = [];

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
  const perkSearchQuery = useUiStore((s) => s.perkSearchQuery);
  const setPerkSearchQuery = useUiStore((s) => s.setPerkSearchQuery);

  const allTrees = useMemo(
    () => (gameData ? getOrderedPerkTrees(gameData.game) : []),
    [gameData],
  );
  const trees = useMemo(
    () =>
      gameData
        ? allTrees.filter((tree) => isAllocatableSkill(gameData.game, tree.skillId))
        : [],
    [allTrees, gameData],
  );
  const playerWarnings = computed?.playerLevelWarnings ?? null;
  const skillReqConflicts = computed?.skillReqConflicts ?? [];
  const skillIncreaseConflictIds = useMemo(
    () => new Set(playerWarnings?.skillIncreases.map((skill) => skill.skillId) ?? []),
    [playerWarnings],
  );
  const skillsOverCapIds = useMemo(
    () => new Set(playerWarnings?.skills.map((skill) => skill.skillId) ?? []),
    [playerWarnings],
  );
  const conflictPerkIdsBySkillId = useMemo(() => {
    const map = new Map<string, string[]>();
    if (!playerWarnings) return map;

    for (const perk of playerWarnings.perks) {
      const existing = map.get(perk.skillId);
      if (existing) {
        existing.push(perk.id);
      } else {
        map.set(perk.skillId, [perk.id]);
      }
    }

    for (const perk of skillReqConflicts) {
      const existing = map.get(perk.skillId);
      if (existing) {
        existing.push(perk.id);
      } else {
        map.set(perk.skillId, [perk.id]);
      }
    }

    return map;
  }, [playerWarnings, skillReqConflicts]);

  const { ref: gridContainerRef, width: gridWidth } = useContainerSize<HTMLDivElement>();
  const responsiveColumns = getSkillGridColumnCount(gridWidth, {
    minCellWidth: stackedLayout ? 120 : 100,
    maxColumns: stackedLayout ? 3 : 4,
  });
  const gridColumns =
    gridWidth > 0 && gridWidth <= 300
      ? 2
      : useThreeColumnLayout
        ? 3
        : responsiveColumns;
  const perkSearchTokens = useMemo(() => getPerkSearchTokens(perkSearchQuery), [perkSearchQuery]);
  const perkSearchPositionKeysBySkillId = useMemo(
    () => getPerkSearchPositionKeysForTrees(allTrees, perkSearchTokens),
    [allTrees, perkSearchTokens],
  );

  const openTree = useCallback(
    (skillId: string) => {
      openSkillTree(skillId);
      if (stackedLayout) {
        goToSwipePane(CENTER_SWIPE_PANE_INDEX);
      }
    },
    [goToSwipePane, openSkillTree, stackedLayout],
  );

  if (!gameData || !playerWarnings || !computed) return null;

  return (
    <Card
      className={cn(
        "flex min-h-0 flex-col overflow-hidden max-h-full",
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
          "flex min-h-0 flex-1 flex-col overflow-hidden",
          compact ? "p-1" : "p-2",
        )}
      >
        <div
          ref={gridContainerRef}
          className={cn(
            "grid gap-1.5",
            compact && "gap-1",
            "min-h-0 flex-1 overflow-y-auto overscroll-y-contain",
          )}
          style={{
            gridTemplateColumns: `repeat(${gridColumns}, minmax(0, 1fr))`,
            gridAutoRows: "minmax(145px, auto)",
          }}
        >
          {trees.map((tree) => {
            const isActive = skillTreeOpen && activeSkillTreeId === tree.skillId;
            const skillLevel = computed.skillLevels[tree.skillId] ?? 0;
            const isDestinyTree = tree.skillId === "destiny";
            const skillBonusLines = !isDestinyTree
              ? getSkillLevelBonusLines(gameData.game, build, tree.skillId, labels)
              : [];
            const conflictPerkIds =
              conflictPerkIdsBySkillId.get(tree.skillId) ?? EMPTY_CONFLICT_PERK_IDS;
            const hasPerkLevelConflict = conflictPerkIds.length > 0;
            const hasSkillIncreaseConflict = skillIncreaseConflictIds.has(tree.skillId);
            const hasProblem =
              skillsOverCapIds.has(tree.skillId) ||
              hasPerkLevelConflict ||
              hasSkillIncreaseConflict;

            return (
              <SkillTreeSidebarTile
                key={tree.skillId}
                tree={tree}
                skillLevel={skillLevel}
                skillBonusLines={skillBonusLines}
                labels={labels}
                compact={compact}
                isActive={isActive}
                hasProblem={hasProblem}
                conflictPerkIds={conflictPerkIds}
                searchPerkPositionKeys={perkSearchPositionKeysBySkillId.get(tree.skillId)}
                onOpenTree={openTree}
              />
            );
          })}
        </div>

        <div
          className={cn(
            "mt-2 flex shrink-0 flex-col gap-2 border-t border-[var(--color-border)]/50 pt-2",
            "sticky bottom-0 z-20 bg-[var(--color-surface)]/85 backdrop-blur-sm",
          )}
        >
          <PickerSearchInput
            value={perkSearchQuery}
            onChange={(next) => setPerkSearchQuery(next)}
            placeholder="Search perks..."
            className={cn(compact && "max-w-none")}
          />
        </div>
      </CardContent>
    </Card>
  );
}
