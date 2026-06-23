import { PerkTreeMiniView } from "@/components/PerkTreeMiniView";
import { BuildVariantsDropdown } from "@/components/BuildVariantsDropdown";
import { SkillIcon } from "@/components/SkillIcon";
import { ResetPerksButton } from "@/components/ResetPerksButton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  getBuildPlayerLevelWarnings,
  getOrderedPerkTrees,
  getStoredSkillLevel,
  isAllocatableSkill,
  isSkillOverPlayerLevelCap,
} from "@/engine/buildEngine";
import { useBuildStore } from "@/store/buildStore";
import { isSkillTreeOpenInMiddlePane, useUiStore } from "@/store/uiStore";
import { usePanelLabels } from "@/theme/ThemeProvider";

const SIDEBAR_COLUMNS = 3;
const SIDEBAR_ROWS = 6;

export function SkillTreesSidebarPanel() {
  const labels = usePanelLabels("skill-trees");
  const gameData = useBuildStore((s) => s.gameData);
  const build = useBuildStore((s) => s.build);
  const resetAllPerks = useBuildStore((s) => s.resetAllPerks);
  const activeSkillTreeId = useUiStore((s) => s.activeSkillTreeId);
  const skillTreeOpen = useUiStore(isSkillTreeOpenInMiddlePane);
  const setActiveSkillTreeId = useUiStore((s) => s.setActiveSkillTreeId);
  const setMiddleView = useUiStore((s) => s.setMiddleView);

  if (!gameData) return null;

  const trees = getOrderedPerkTrees(gameData.game).filter((tree) =>
    isAllocatableSkill(gameData.game, tree.skillId),
  );
  const { perks: overLevelPerks, skillIncreases } = getBuildPlayerLevelWarnings(
    gameData.game,
    build,
  );
  const skillIncreaseConflictIds = new Set(skillIncreases.map((skill) => skill.skillId));

  return (
    <Card className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <CardHeader className="flex-shrink-0 flex-col items-stretch gap-3 space-y-0 border-b border-[var(--color-border)]/50 px-3 py-3">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="min-w-0 flex-1 truncate text-base">{labels.title}</CardTitle>
          <ResetPerksButton onClick={resetAllPerks}>{labels.resetAll}</ResetPerksButton>
        </div>
        <BuildVariantsDropdown />
      </CardHeader>
      <CardContent className="flex min-h-0 flex-1 flex-col overflow-hidden p-2">
        <div
          className="grid h-full min-h-0 flex-1 gap-1"
          style={{
            gridTemplateColumns: `repeat(${SIDEBAR_COLUMNS}, minmax(0, 1fr))`,
            gridTemplateRows: `repeat(${SIDEBAR_ROWS}, minmax(0, 1fr))`,
          }}
        >
          {trees.map((tree) => {
            const isActive = skillTreeOpen && activeSkillTreeId === tree.skillId;
            const skillLevel = getStoredSkillLevel(gameData.game, build, tree.skillId);
            const isOverCap = isSkillOverPlayerLevelCap(gameData.game, build, tree.skillId);
            const conflictPerkIds = overLevelPerks
              .filter((perk) => perk.skillId === tree.skillId)
              .map((perk) => perk.id);
            const hasPerkLevelConflict = conflictPerkIds.length > 0;
            const hasSkillIncreaseConflict = skillIncreaseConflictIds.has(tree.skillId);
            const hasProblem = isOverCap || hasPerkLevelConflict || hasSkillIncreaseConflict;

            return (
              <button
                key={tree.skillId}
                type="button"
                onClick={() => {
                  setActiveSkillTreeId(tree.skillId);
                  setMiddleView("skill-trees");
                }}
                className={cn(
                  "grid h-full min-h-0 grid-rows-[auto_minmax(0,1fr)] gap-0.5 overflow-hidden rounded-[var(--radius-sm)] border p-1 text-left transition-colors",
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
                    className="min-w-0 truncate text-[11px] font-semibold leading-snug tracking-tight text-[var(--color-foreground)]"
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
                <div className="flex min-h-0 items-center justify-center overflow-hidden px-0.5 pb-0.5 pt-px">
                  <PerkTreeMiniView
                    tree={tree}
                    compact
                    conflictPerkIds={conflictPerkIds}
                    className="aspect-square max-h-full w-full max-w-full"
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
