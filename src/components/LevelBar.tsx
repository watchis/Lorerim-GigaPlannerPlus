import { Minus, Plus } from "lucide-react";
import { NumericLevelInput } from "@/components/NumericLevelInput";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useBuildStore } from "@/store/buildStore";
import { useThemeConfig } from "@/theme/ThemeProvider";

export function LevelBar() {
  const { labels } = useThemeConfig();
  const barLabels = labels["level-bar"];
  const gameData = useBuildStore((s) => s.gameData);
  const build = useBuildStore((s) => s.build);
  const computed = useBuildStore((s) => s.computed);
  const setPlayerLevel = useBuildStore((s) => s.setPlayerLevel);

  if (!gameData || !computed) return null;

  const { baseLevel, maxPlayerLevel } = gameData.game.mechanics.leveling;
  const skillOverBudget = computed.skillPointsRemaining < 0;
  const perkOverBudget = computed.perkPointsRemaining < 0;
  const skillOverBy = skillOverBudget ? Math.abs(computed.skillPointsRemaining) : 0;
  const perkOverBy = perkOverBudget ? Math.abs(computed.perkPointsRemaining) : 0;

  return (
    <div className="shrink-0 border-b border-[var(--color-border)]/50 bg-[var(--color-surface)]/80 px-4 py-2 sm:px-6">
      <div className="mx-auto flex max-w-[1600px] flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-xs font-medium uppercase tracking-wide text-[var(--color-muted)]">
            {barLabels.playerLevel}
          </span>
          <div className="inline-flex items-center rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-elevated)]/50 p-0.5">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => setPlayerLevel(build.playerLevel - 1)}
              disabled={build.playerLevel <= baseLevel}
            >
              <Minus className="h-3.5 w-3.5" />
            </Button>
            <NumericLevelInput
              value={build.playerLevel}
              min={baseLevel}
              max={maxPlayerLevel}
              onCommit={setPlayerLevel}
            />
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => setPlayerLevel(build.playerLevel + 1)}
              disabled={build.playerLevel >= maxPlayerLevel}
            >
              <Plus className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="text-[var(--color-muted)]">
              {barLabels.perkPointsRemaining}:{" "}
              <span
                className={cn(
                  "font-mono font-semibold tabular-nums",
                  perkOverBudget ? "text-[var(--color-health)]" : "text-[var(--color-foreground)]",
                )}
              >
                {computed.perkPointsRemaining}
              </span>
            </span>
            <span className="text-[var(--color-muted)]">
              ({computed.perkPointsSpent} {barLabels.perkPointsSpent})
            </span>
            <span className="text-[10px] text-[var(--color-muted)]">
              {barLabels.perkPointsPerLevel.replace("{count}", String(computed.perkPointsPerLevel))}
            </span>
            {perkOverBudget && (
              <span className="text-[var(--color-health)]">
                {barLabels.overBudget.replace("{count}", String(perkOverBy))}
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="text-[var(--color-muted)]">
              {barLabels.skillPointsRemaining}:{" "}
              <span
                className={cn(
                  "font-mono font-semibold tabular-nums",
                  skillOverBudget ? "text-[var(--color-health)]" : "text-[var(--color-foreground)]",
                )}
              >
                {computed.skillPointsRemaining}
              </span>
            </span>
            <span className="text-[var(--color-muted)]">
              ({computed.skillPointsSpent} {barLabels.skillPointsSpent})
            </span>
            <span className="text-[10px] text-[var(--color-muted)]">
              {barLabels.skillPointsPerLevel.replace(
                "{count}",
                String(computed.skillPointsPerLevel),
              )}
            </span>
            {skillOverBudget && (
              <span className="text-[var(--color-health)]">
                {barLabels.overBudget.replace("{count}", String(skillOverBy))}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
