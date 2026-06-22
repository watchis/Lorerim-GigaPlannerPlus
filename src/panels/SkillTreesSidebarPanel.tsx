import { PerkTreeMiniView } from "@/components/PerkTreeMiniView";
import { SkillIcon } from "@/components/SkillIcon";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { getOrderedPerkTrees } from "@/engine/buildEngine";
import { useBuildStore } from "@/store/buildStore";
import { useUiStore } from "@/store/uiStore";
import { usePanelLabels } from "@/theme/ThemeProvider";

const SIDEBAR_COLUMNS = 3;
const SIDEBAR_ROWS = 6;

export function SkillTreesSidebarPanel() {
  const labels = usePanelLabels("skill-trees");
  const gameData = useBuildStore((s) => s.gameData);
  const resetAllPerks = useBuildStore((s) => s.resetAllPerks);
  const activeSkillTreeId = useUiStore((s) => s.activeSkillTreeId);
  const setActiveSkillTreeId = useUiStore((s) => s.setActiveSkillTreeId);
  const setMiddleView = useUiStore((s) => s.setMiddleView);

  if (!gameData) return null;

  const trees = getOrderedPerkTrees(gameData.game);

  return (
    <Card className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <CardHeader className="flex-shrink-0 flex-row items-center justify-between space-y-0 border-b border-[var(--color-border)]/50 px-3 py-2">
        <CardTitle className="text-sm">{labels.title}</CardTitle>
        <Button variant="ghost" size="sm" className="h-auto px-1.5 py-0.5 text-[10px]" onClick={resetAllPerks}>
          {labels.resetAll}
        </Button>
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
            const isActive = activeSkillTreeId === tree.skillId;

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
                  isActive
                    ? "border-[var(--color-accent)] bg-[var(--color-accent)]/[0.03]"
                    : "border-[var(--color-border)]/50 bg-transparent hover:border-[var(--color-border)] hover:bg-[var(--color-surface-elevated)]/15",
                )}
              >
                <div className="flex items-start gap-1 leading-tight">
                  <SkillIcon
                    skillId={tree.skillId}
                    className="mt-px h-3 w-3 shrink-0 text-[var(--color-accent-muted)]"
                  />
                  <span className="text-[10px] font-medium leading-snug text-[var(--color-foreground)]">
                    {tree.skillName}
                  </span>
                </div>
                <div className="flex min-h-0 items-center justify-center overflow-hidden px-0.5 pb-0.5 pt-px">
                  <PerkTreeMiniView tree={tree} compact className="aspect-square max-h-full w-full max-w-full" />
                </div>
              </button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
