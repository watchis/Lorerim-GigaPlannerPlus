import { ChevronLeft, AlertCircle, Minus, Plus, RotateCcw, X } from "lucide-react";
import { NumericLevelInput } from "@/components/NumericLevelInput";
import { PerkTreeView } from "@/components/PerkTreeView";
import { SkillIcon } from "@/components/SkillIcon";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  getOrderedPerkTrees,
  getMaxAllowedSkillLevel,
  getSkillFloor,
  getStoredSkillLevel,
} from "@/engine/buildEngine";
import { cn } from "@/lib/utils";
import { useUiStore } from "@/store/uiStore";
import { usePanelLabels } from "@/theme/ThemeProvider";
import { useBuildStore } from "@/store/buildStore";

function formatLabel(template: string, values: Record<string, string | number>): string {
  return Object.entries(values).reduce(
    (result, [key, value]) => result.replace(`{${key}}`, String(value)),
    template,
  );
}

function PerkLegend({
  labels,
  showConflict,
}: {
  labels: Record<string, string>;
  showConflict: boolean;
}) {
  const items = [
    { label: labels.selected, className: "bg-[var(--color-perk-selected)]" },
    { label: labels.available, className: "bg-[var(--color-perk-available)]" },
    { label: labels.locked, className: "bg-[var(--color-perk-locked)]" },
    ...(showConflict
      ? [{ label: labels.skillReqConflictLegend, className: "bg-[var(--color-health)]" }]
      : []),
  ];

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-[var(--color-muted)]">
      {items.map((item) => (
        <span key={item.label} className="inline-flex items-center gap-1.5">
          <span className={cn("h-2 w-2 rounded-full", item.className)} />
          {item.label}
        </span>
      ))}
    </div>
  );
}

export function SkillTreePanel() {
  const labels = usePanelLabels("skill-trees");
  const setupLabels = usePanelLabels("character-setup");
  const setMiddleView = useUiStore((s) => s.setMiddleView);
  const activeSkillTreeId = useUiStore((s) => s.activeSkillTreeId);
  const gameData = useBuildStore((s) => s.gameData);
  const build = useBuildStore((s) => s.build);
  const computed = useBuildStore((s) => s.computed);
  const setSkillLevel = useBuildStore((s) => s.setSkillLevel);
  const resetSkillPerks = useBuildStore((s) => s.resetSkillPerks);
  const skillReqConflict = useBuildStore((s) => s.skillReqConflict);
  const clearSkillReqConflict = useBuildStore((s) => s.clearSkillReqConflict);

  if (!gameData || !computed) return null;

  const trees = getOrderedPerkTrees(gameData.game);
  const activeTree =
    trees.find((tree) => tree.skillId === activeSkillTreeId) ?? trees[0];

  if (!activeTree) return null;

  const droppedOnActiveTree =
    skillReqConflict?.droppedPerks.filter((perk) =>
      activeTree.perks.some((treePerk) => treePerk.id === perk.id),
    ) ?? [];

  const activeConflict =
    droppedOnActiveTree.length > 0
      ? {
          skillId: activeTree.skillId,
          skillLevel: getStoredSkillLevel(gameData.game, build, activeTree.skillId),
          droppedPerks: droppedOnActiveTree,
        }
      : null;
  const conflictMessage = activeConflict
    ? activeConflict.droppedPerks.length === 1
      ? formatLabel(labels.skillReqConflictSingle, {
          perk: activeConflict.droppedPerks[0].name,
          required: activeConflict.droppedPerks[0].skillReq,
          current: activeConflict.skillLevel,
        })
      : formatLabel(labels.skillReqConflictMultiple, {
          count: activeConflict.droppedPerks.length,
        })
    : null;

  const floor = getSkillFloor(gameData.game, build, activeTree.skillId);
  const maxSkillLevel = getMaxAllowedSkillLevel(gameData.game, build);
  const level = getStoredSkillLevel(gameData.game, build, activeTree.skillId);
  const selectedCount = activeTree.perks.filter((perk) =>
    build.selectedPerkIds.includes(perk.id),
  ).length;

  return (
    <Card className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <CardHeader className="flex-shrink-0 space-y-0 border-b border-[var(--color-border)]/50 px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 shrink-0 px-2 text-[var(--color-muted)] hover:text-[var(--color-foreground)]"
            onClick={() => setMiddleView("character-info")}
          >
            <ChevronLeft className="h-4 w-4" />
            {setupLabels.backToOverview ?? setupLabels.title}
          </Button>
          <p className="truncate text-xs text-[var(--color-muted)]">
            <span className="font-medium tabular-nums text-[var(--color-foreground)]">
              {selectedCount}/{activeTree.perks.length}
            </span>{" "}
            {labels.perksSelected}
          </p>
        </div>

        <div className="mt-3 flex min-w-0 items-center gap-2">
          <SkillIcon
            skillId={activeTree.skillId}
            className="h-5 w-5 shrink-0 text-[var(--color-accent-muted)]"
          />
          <CardTitle className="truncate text-base">{activeTree.skillName}</CardTitle>
        </div>
      </CardHeader>

      <div className="flex-shrink-0 border-b border-[var(--color-border)]/50 px-4 py-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium uppercase tracking-wide text-[var(--color-muted)]">
              {labels.skillLevel}
            </span>
            <div className="inline-flex items-center rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-elevated)]/50 p-0.5">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => setSkillLevel(activeTree.skillId, level - 1)}
                disabled={level <= floor}
              >
                <Minus className="h-3.5 w-3.5" />
              </Button>
              <NumericLevelInput
                value={level}
                min={floor}
                max={maxSkillLevel}
                onCommit={(next) => setSkillLevel(activeTree.skillId, next)}
              />
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => setSkillLevel(activeTree.skillId, level + 1)}
                disabled={level >= maxSkillLevel}
              >
                <Plus className="h-3.5 w-3.5" />
              </Button>
            </div>
            <span className="text-xs text-[var(--color-muted)]">
              {labels.skillLevelMin}: <span className="tabular-nums">{floor}</span>
            </span>
          </div>

          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1.5 text-xs"
            onClick={() => resetSkillPerks(activeTree.skillId)}
          >
            <RotateCcw className="h-3.5 w-3.5" />
            {labels.resetSkill}
          </Button>
        </div>

        {conflictMessage && (
          <div className="mt-3 flex items-start gap-2 rounded-[var(--radius-md)] border border-[var(--color-health)]/40 bg-[var(--color-health)]/10 px-3 py-2 text-sm text-[var(--color-foreground)]">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-health)]" />
            <p className="min-w-0 flex-1 leading-snug">{conflictMessage}</p>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 shrink-0 text-[var(--color-muted)] hover:text-[var(--color-foreground)]"
              onClick={clearSkillReqConflict}
              aria-label={labels.skillReqConflictDismiss}
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}

        <div className="mt-3">
          <PerkLegend labels={labels} showConflict={Boolean(activeConflict)} />
        </div>
      </div>

      <CardContent className="min-h-0 flex-1 overflow-hidden p-0">
        <ScrollArea className="h-full min-h-0">
          <div className="flex min-h-full items-start justify-center p-4 sm:p-6">
            <PerkTreeView
              tree={activeTree}
              labels={labels}
              conflictPerkIds={activeConflict?.droppedPerks.map((perk) => perk.id) ?? []}
            />
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
