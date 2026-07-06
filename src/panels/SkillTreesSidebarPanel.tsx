import { PerkTreeMiniView } from "@/components/PerkTreeMiniView";
import { BuildVariantsDropdown } from "@/components/BuildVariantsDropdown";
import { SkillIcon } from "@/components/SkillIcon";
import { ResetPerksButton } from "@/components/ResetPerksButton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  getBuildPlayerLevelWarnings,
  getOrderedPerkTrees,
  getSelectedPerksBelowSkillRequirement,
  getStoredSkillLevel,
  isAllocatableSkill,
  isSkillOverPlayerLevelCap,
} from "@/engine/buildEngine";
import { useBuildStore } from "@/store/buildStore";
import { isSkillTreeOpenInMiddlePane, useUiStore } from "@/store/uiStore";
import { usePanelLabels } from "@/theme/ThemeProvider";
import {
  usePlannerLayoutScale,
  usePlannerSideWidths,
  usePlannerThreeColumnLayout,
} from "@/layout/plannerLayout";

const RESET_ICON_ONLY_MAX_WIDTH = 280;

export function SkillTreesSidebarPanel() {
  const labels = usePanelLabels("skill-trees");
  const useThreeColumnLayout = usePlannerThreeColumnLayout();
  const layoutScale = usePlannerLayoutScale();
  const sideWidths = usePlannerSideWidths();
  const compact = useThreeColumnLayout && layoutScale < 0.75;
  const iconOnlyReset =
    useThreeColumnLayout &&
    (sideWidths?.right ?? Number.POSITIVE_INFINITY) < RESET_ICON_ONLY_MAX_WIDTH;
  const gameData = useBuildStore((s) => s.gameData);
  const build = useBuildStore((s) => s.build);
  const resetAllPerks = useBuildStore((s) => s.resetAllPerks);
  const activeSkillTreeId = useUiStore((s) => s.activeSkillTreeId);
  const skillTreeOpen = useUiStore(isSkillTreeOpenInMiddlePane);
  const openSkillTree = useUiStore((s) => s.openSkillTree);

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

  return (
    <Card className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <CardHeader
        className={cn(
          "flex-shrink-0 flex-col items-stretch gap-3 space-y-0 border-b border-[var(--color-border)]/50 py-3",
          compact ? "gap-2 px-2 py-2" : "px-3",
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
      <CardContent className={cn("flex min-h-0 flex-1 flex-col overflow-hidden", compact ? "p-1" : "p-2")}>
        <div
          className={cn(
            "grid gap-1",
            !useThreeColumnLayout &&
              "auto-rows-[minmax(5.5rem,auto)] grid-cols-4 sm:grid-cols-5",
            useThreeColumnLayout && "h-full min-h-0 flex-1 grid-cols-3 grid-rows-6",
            compact && "gap-0.5",
          )}
        >
          {trees.map((tree) => {
            const isActive = skillTreeOpen && activeSkillTreeId === tree.skillId;
            const skillLevel = getStoredSkillLevel(gameData.game, build, tree.skillId);
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
                onClick={() => openSkillTree(tree.skillId)}
                className={cn(
                  "grid min-h-[5.5rem] grid-rows-[auto_minmax(0,1fr)] gap-0.5 overflow-hidden rounded-[var(--radius-sm)] border text-left transition-colors",
                  compact ? "p-0.5" : "p-1",
                  useThreeColumnLayout && "h-full min-h-0",
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
                  <span
                    className={cn(
                      "min-w-0 truncate font-semibold leading-snug tracking-tight text-[var(--color-foreground)]",
                      compact ? "text-[10px]" : "text-[11px]",
                    )}
                    title={tree.skillName}
                  >
                    {tree.skillName}
                  </span>
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
