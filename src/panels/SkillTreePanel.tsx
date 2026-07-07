import { useState } from "react";
import { AlertCircle, Minus, Plus, RotateCcw, ChevronLeft, ChevronDown, ChevronUp, ListFilter } from "lucide-react";
import { WorkspacePanelHeader } from "@/components/WorkspacePanelHeader";
import { ResetPerksButton } from "@/components/ResetPerksButton";
import { SkillTrainingSection } from "@/components/SkillTrainingSection";
import { NumericLevelInput } from "@/components/NumericLevelInput";
import { PerkTreeView } from "@/components/PerkTreeView";
import { SkillIcon } from "@/components/SkillIcon";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { HoverTapTooltip } from "@/components/ui/tooltip";
import {
  getOrderedPerkTrees,
  computeDestinyPerkPointsSpent,
  getEarnedDestinyPerkPoints,
  getBuildPlayerLevelWarnings,
  getMaxAllowedSkillLevel,
  getMaxSkillLevel,
  getRemainingDestinyPerkPoints,
  getSelectedPerksBelowSkillRequirement,
  getSkillFloor,
  getSkillLevelFromTraining,
  getStoredSkillLevel,
  isSkillOverPlayerLevelCap,
} from "@/engine/buildEngine";
import { cn } from "@/lib/utils";
import { useUiStore } from "@/store/uiStore";
import { usePanelLabels } from "@/theme/ThemeProvider";
import { useBuildStore } from "@/store/buildStore";
import { usePlannerStackedLayout } from "@/layout/plannerLayout";

function formatLabel(template: string, values: Record<string, string | number>): string {
  return Object.entries(values).reduce(
    (result, [key, value]) => result.replace(`{${key}}`, String(value)),
    template,
  );
}

function SkillTreeWarningIcon({
  messages,
  ariaLabel,
}: {
  messages: string[];
  ariaLabel: string;
}) {
  if (messages.length === 0) return null;

  return (
    <HoverTapTooltip
      content={
        messages.length === 1 ? (
          <p className="text-xs leading-relaxed">{messages[0]}</p>
        ) : (
          <ul className="space-y-1.5 text-xs leading-relaxed">
            {messages.map((message, index) => (
              <li key={index} className="flex gap-2">
                <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-[var(--color-error)]" />
                <span>{message}</span>
              </li>
            ))}
          </ul>
        )
      }
      side="bottom"
      align="start"
      contentClassName="max-w-xs"
    >
      <button
        type="button"
        className="inline-flex min-h-8 min-w-8 shrink-0 items-center justify-center rounded-[var(--radius-md)] text-[var(--color-error)] transition-colors hover:text-[var(--color-error-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-error)]/50"
        aria-label={ariaLabel}
      >
        <AlertCircle className="h-4 w-4" />
      </button>
    </HoverTapTooltip>
  );
}

function PerkLegend({
  labels,
  hasProblem,
}: {
  labels: Record<string, string>;
  hasProblem: boolean;
}) {
  const items = [
    {
      label: labels.selected,
      className:
        "border border-[var(--color-perk-selected)] bg-[var(--color-perk-selected)]/30",
    },
    {
      label: labels.partialSelected,
      className:
        "border border-[var(--color-perk-partial)] bg-[var(--color-perk-partial)]/30",
    },
    {
      label: labels.available,
      className:
        "border border-[var(--color-perk-available)] bg-[var(--color-surface-elevated)]",
    },
    {
      label: labels.locked,
      className:
        "border border-[var(--color-perk-locked)] bg-[var(--color-surface)] opacity-55",
    },
    ...(hasProblem
      ? [{ label: labels.buildProblemLegend, className: "bg-[var(--color-error)]" }]
      : []),
  ];

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-[var(--color-muted)]">
      {items.map((item) => (
        <span key={item.label} className="inline-flex items-center gap-1.5">
          <span className={cn("h-2.5 w-2.5 shrink-0 rounded-full", item.className)} />
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
  const skillWorkspaceMode = useUiStore((s) => s.skillWorkspaceMode);
  const setSkillWorkspaceMode = useUiStore((s) => s.setSkillWorkspaceMode);
  const showPerkSkillRequirements = useUiStore((s) => s.showPerkSkillRequirements);
  const setShowPerkSkillRequirements = useUiStore((s) => s.setShowPerkSkillRequirements);
  const stackedLayout = usePlannerStackedLayout();
  const gameData = useBuildStore((s) => s.gameData);
  const build = useBuildStore((s) => s.build);
  const computed = useBuildStore((s) => s.computed);
  const setSkillLevel = useBuildStore((s) => s.setSkillLevel);
  const resetSkillPerks = useBuildStore((s) => s.resetSkillPerks);
  const resetSkillTraining = useBuildStore((s) => s.resetSkillTraining);
  const [mobileControlsCollapsed, setMobileControlsCollapsed] = useState(false);

  if (!gameData || !computed) return null;

  const trees = getOrderedPerkTrees(gameData.game);
  const activeTree =
    trees.find((tree) => tree.skillId === activeSkillTreeId) ?? trees[0];

  if (!activeTree) return null;
  const isDestinyTree = activeTree.skillId === "destiny";

  const skillReqConflictsOnTree = getSelectedPerksBelowSkillRequirement(
    gameData.game,
    build,
  ).filter((perk) => perk.skillId === activeTree.skillId);
  const hasSkillReqConflict = !isDestinyTree && skillReqConflictsOnTree.length > 0;

  const floor = isDestinyTree ? 0 : getSkillFloor(gameData.game, build, activeTree.skillId);
  const skillLevelCap = isDestinyTree ? 0 : getMaxSkillLevel(gameData.game);
  const maxAllowedAtLevel = isDestinyTree
    ? 0
    : getMaxAllowedSkillLevel(gameData.game, build);
  const level = isDestinyTree ? 0 : getStoredSkillLevel(gameData.game, build, activeTree.skillId);
  const trainingFloor = isDestinyTree
    ? 0
    : getSkillLevelFromTraining(gameData.game, build, activeTree.skillId);
  const isTrainingMode = !isDestinyTree && skillWorkspaceMode === "training";
  const { perks: overLevelPerks, skillIncreases, destinyPerksOverBudget } =
    getBuildPlayerLevelWarnings(gameData.game, build);
  const skillIncreaseConflict = skillIncreases.find(
    (skill) => skill.skillId === activeTree.skillId,
  );
  const isOverCap = isDestinyTree
    ? false
    : isSkillOverPlayerLevelCap(gameData.game, build, activeTree.skillId);
  const isOverIncreaseLimit = !isDestinyTree && skillIncreaseConflict != null;
  const hasSkillLevelProblem = isOverCap || isOverIncreaseLimit;
  const playerLevelPerksOnTree = overLevelPerks.filter(
    (perk) => perk.skillId === activeTree.skillId,
  );
  const destinyOverBudgetOnTree = isDestinyTree ? destinyPerksOverBudget : [];
  const invalidPerkIdsOnTree = [
    ...playerLevelPerksOnTree.map((perk) => perk.id),
    ...destinyOverBudgetOnTree.map((perk) => perk.id),
  ];
  const hasPlayerLevelPerkConflict = playerLevelPerksOnTree.length > 0;
  const hasDestinyOverBudgetConflict = destinyOverBudgetOnTree.length > 0;
  const destinyOverBudget = isDestinyTree && getRemainingDestinyPerkPoints(gameData.game, build) < 0;
  const selectedCount = activeTree.perks.filter((perk) =>
    build.selectedPerkIds.includes(perk.id),
  ).length;

  const conflictMessage = hasSkillReqConflict
    ? skillReqConflictsOnTree.length === 1
      ? formatLabel(labels.skillReqConflictSingle, {
          perk: skillReqConflictsOnTree[0].name,
          required: skillReqConflictsOnTree[0].skillReq,
          current: level,
        })
      : formatLabel(labels.skillReqConflictMultiple, {
          count: skillReqConflictsOnTree.length,
        })
    : null;
  const playerLevelPerkMessage = hasPlayerLevelPerkConflict
    ? playerLevelPerksOnTree.length === 1
      ? formatLabel(labels.playerLevelPerkConflictSingle, {
          perk: playerLevelPerksOnTree[0].name,
          required: playerLevelPerksOnTree[0].playerLevelReq,
          playerLevel: build.playerLevel,
        })
      : formatLabel(labels.playerLevelPerkConflictMultiple, {
          count: playerLevelPerksOnTree.length,
          playerLevel: build.playerLevel,
        })
    : null;
  const destinyOverBudgetMessage = hasDestinyOverBudgetConflict
    ? destinyOverBudgetOnTree.length === 1
      ? formatLabel(labels.destinyOverBudgetSingle, {
          perk: destinyOverBudgetOnTree[0].name,
          playerLevel: build.playerLevel,
        })
      : formatLabel(labels.destinyOverBudgetMultiple, {
          count: destinyOverBudgetOnTree.length,
          playerLevel: build.playerLevel,
        })
    : null;
  const overCapMessage = !isDestinyTree && isOverCap
    ? formatLabel(labels.skillLevelOverCapSingle, {
        skill: activeTree.skillName,
        skillLevel: level,
        maxAllowed: maxAllowedAtLevel,
      })
    : null;
  const overIncreaseLimitMessage = skillIncreaseConflict
    ? formatLabel(labels.skillLevelIncreaseOverLimitSingle, {
        skill: activeTree.skillName,
        skillLevel: level,
        required: skillIncreaseConflict.requiredLevel,
        playerLevel: build.playerLevel,
      })
    : null;

  const warningMessages = [
    ...(overCapMessage ? [overCapMessage] : []),
    ...(overIncreaseLimitMessage ? [overIncreaseLimitMessage] : []),
    ...(playerLevelPerkMessage ? [playerLevelPerkMessage] : []),
    ...(destinyOverBudgetMessage ? [destinyOverBudgetMessage] : []),
    ...(conflictMessage ? [conflictMessage] : []),
  ];
  const hasTreeProblem = warningMessages.length > 0;

  const perkTree = (
    <PerkTreeView
      fit={!stackedLayout}
      scrollable={stackedLayout}
      className="min-h-0 flex-1"
      tree={activeTree}
      labels={labels}
      conflictPerkIds={skillReqConflictsOnTree.map((perk) => perk.id)}
      playerLevelConflictPerkIds={invalidPerkIdsOnTree}
      showSkillRequirements={showPerkSkillRequirements}
    />
  );

  if (stackedLayout) {
    return (
      <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-[var(--color-surface)]">
        <header className="shrink-0 border-b border-[var(--color-border)]/50 px-3 py-2.5">
          <div className="flex items-start gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 shrink-0"
              onClick={() => setMiddleView("character-info")}
              aria-label={setupLabels.backToOverview ?? setupLabels.title}
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <div className="min-w-0 flex-1">
              <div className="flex min-w-0 items-center gap-2">
                <SkillIcon
                  skillId={activeTree.skillId}
                  className="h-5 w-5 shrink-0 text-[var(--color-accent-muted)]"
                />
                <h2 className="truncate font-[family-name:var(--font-heading)] text-base font-semibold text-[var(--color-foreground)]">
                  {activeTree.skillName}
                </h2>
                <SkillTreeWarningIcon
                  messages={warningMessages}
                  ariaLabel={labels.skillTreeWarning}
                />
              </div>
              <p className="mt-0.5 text-xs text-[var(--color-muted)]">
                {isTrainingMode ? (
                  labels.trainingModeActive
                ) : (
                  <>
                    <span className="font-medium tabular-nums text-[var(--color-foreground)]">
                      {selectedCount}/{activeTree.perks.length}
                    </span>{" "}
                    {labels.perksSelected}
                  </>
                )}
              </p>
            </div>
            {!isDestinyTree && (
              <div className="flex shrink-0 items-center gap-0.5">
                {!isTrainingMode && (
                  <Button
                    variant={showPerkSkillRequirements ? "default" : "ghost"}
                    size="icon"
                    className="h-9 w-9"
                    onClick={() => setShowPerkSkillRequirements(!showPerkSkillRequirements)}
                    aria-label={labels.showSkillRequirements}
                    aria-pressed={showPerkSkillRequirements}
                  >
                    <ListFilter className="h-4 w-4" />
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 text-[var(--color-muted)]"
                  onClick={() =>
                    isTrainingMode
                      ? resetSkillTraining(activeTree.skillId)
                      : resetSkillPerks(activeTree.skillId)
                  }
                  aria-label={isTrainingMode ? labels.resetTraining : labels.resetSkill}
                >
                  <RotateCcw className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        </header>

        {mobileControlsCollapsed ? (
          <div className="flex shrink-0 items-center gap-2 border-b border-[var(--color-border)]/50 px-3 py-1.5">
            {!isDestinyTree ? (
              <>
                <div className="inline-flex shrink-0 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-elevated)]/50 p-0.5">
                  <Button
                    variant={isTrainingMode ? "ghost" : "default"}
                    size="sm"
                    className="h-7 px-2.5 text-[10px] font-medium"
                    onClick={() => setSkillWorkspaceMode("perks")}
                  >
                    {labels.perksMode}
                  </Button>
                  <Button
                    variant={isTrainingMode ? "default" : "ghost"}
                    size="sm"
                    className="h-7 px-2.5 text-[10px] font-medium"
                    onClick={() => setSkillWorkspaceMode("training")}
                  >
                    {labels.trainingMode}
                  </Button>
                </div>
                <div
                  className={cn(
                    "ml-auto inline-flex items-center rounded-[var(--radius-md)] border bg-[var(--color-surface-elevated)]/50 p-0.5",
                    hasSkillLevelProblem
                      ? "border-[var(--color-error)]/70"
                      : "border-[var(--color-border)]",
                  )}
                >
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => setSkillLevel(activeTree.skillId, level - 1)}
                    disabled={level <= Math.max(floor, trainingFloor)}
                    aria-label={`Decrease ${labels.skillLevel}`}
                  >
                    <Minus className="h-3.5 w-3.5" />
                  </Button>
                  <NumericLevelInput
                    value={level}
                    min={Math.max(floor, trainingFloor)}
                    max={skillLevelCap}
                    onCommit={(next) => setSkillLevel(activeTree.skillId, next)}
                    size="compact"
                    className={hasSkillLevelProblem ? "text-[var(--color-error)]" : undefined}
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => setSkillLevel(activeTree.skillId, level + 1)}
                    disabled={level >= skillLevelCap}
                    aria-label={`Increase ${labels.skillLevel}`}
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </>
            ) : (
              <div className="flex min-w-0 flex-1 items-center gap-2 text-[11px]">
                <span className="font-medium uppercase tracking-wide text-[var(--color-muted)]">
                  {labels.destinyPoints ?? "Destiny points"}
                </span>
                <span
                  className={cn(
                    "tabular-nums",
                    destinyOverBudget
                      ? "font-medium text-[var(--color-error)]"
                      : "text-[var(--color-muted)]",
                  )}
                >
                  {computeDestinyPerkPointsSpent(gameData.game, build)}/
                  {getEarnedDestinyPerkPoints(gameData.game, build)}
                </span>
              </div>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 shrink-0 text-[var(--color-muted)]"
              onClick={() => setMobileControlsCollapsed(false)}
              aria-label="Expand skill controls"
              aria-expanded={false}
            >
              <ChevronDown className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <div className="relative shrink-0 space-y-2 border-b border-[var(--color-border)]/50 px-3 py-2 pr-11">
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-2 top-2 h-7 w-7 text-[var(--color-muted)]"
              onClick={() => setMobileControlsCollapsed(true)}
              aria-label="Collapse skill controls"
              aria-expanded
            >
              <ChevronUp className="h-4 w-4" />
            </Button>

            {!isDestinyTree && (
              <div className="grid grid-cols-2 gap-1 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-elevated)]/50 p-0.5">
                <Button
                  variant={isTrainingMode ? "ghost" : "default"}
                  size="sm"
                  className="h-9 text-xs"
                  onClick={() => setSkillWorkspaceMode("perks")}
                >
                  {labels.perksMode}
                </Button>
                <Button
                  variant={isTrainingMode ? "default" : "ghost"}
                  size="sm"
                  className="h-9 text-xs"
                  onClick={() => setSkillWorkspaceMode("training")}
                >
                  {labels.trainingMode}
                </Button>
              </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-2">
              {isDestinyTree ? (
                <div className="flex items-center gap-2 text-xs">
                  <span className="font-medium uppercase tracking-wide text-[var(--color-muted)]">
                    {labels.destinyPoints ?? "Destiny points"}
                  </span>
                  <span
                    className={cn(
                      "tabular-nums",
                      destinyOverBudget
                        ? "font-medium text-[var(--color-error)]"
                        : "text-[var(--color-muted)]",
                    )}
                  >
                    {computeDestinyPerkPointsSpent(gameData.game, build)}/
                    {getEarnedDestinyPerkPoints(gameData.game, build)}
                  </span>
                </div>
              ) : (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[11px] font-medium uppercase tracking-wide text-[var(--color-muted)]">
                    {labels.skillLevel}
                  </span>
                  <div
                    className={cn(
                      "inline-flex items-center rounded-[var(--radius-md)] border bg-[var(--color-surface-elevated)]/50 p-0.5",
                      hasSkillLevelProblem
                        ? "border-[var(--color-error)]/70 ring-1 ring-[var(--color-error)]/30"
                        : "border-[var(--color-border)]",
                    )}
                  >
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9"
                      onClick={() => setSkillLevel(activeTree.skillId, level - 1)}
                      disabled={level <= Math.max(floor, trainingFloor)}
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                    <NumericLevelInput
                      value={level}
                      min={Math.max(floor, trainingFloor)}
                      max={skillLevelCap}
                      onCommit={(next) => setSkillLevel(activeTree.skillId, next)}
                      className={hasSkillLevelProblem ? "text-[var(--color-error)]" : undefined}
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9"
                      onClick={() => setSkillLevel(activeTree.skillId, level + 1)}
                      disabled={level >= skillLevelCap}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  <span className="text-[11px] text-[var(--color-muted)]">
                    {labels.skillLevelMin}: <span className="tabular-nums">{floor}</span>
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-[var(--color-background)]/40 p-2">
          {isTrainingMode ? (
            <SkillTrainingSection
              game={gameData.game}
              build={build}
              skillId={activeTree.skillId}
              labels={labels}
            />
          ) : (
            perkTree
          )}
        </div>
      </div>
    );
  }

  return (
    <Card className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <WorkspacePanelHeader
        back={{
          label: setupLabels.backToOverview ?? setupLabels.title,
          onClick: () => setMiddleView("character-info"),
        }}
        titleRow={
          <div className="flex min-w-0 gap-2">
            <SkillIcon
              skillId={activeTree.skillId}
              className="h-5 w-5 shrink-0 text-[var(--color-accent-muted)]"
            />
            <div className="min-w-0">
              <div className="flex min-w-0 items-center gap-2">
                <CardTitle className="min-w-0 truncate text-base">{activeTree.skillName}</CardTitle>
                <SkillTreeWarningIcon
                  messages={warningMessages}
                  ariaLabel={labels.skillTreeWarning}
                />
              </div>
              <p className="mt-1 text-xs text-[var(--color-muted)]">
                {isTrainingMode ? (
                  labels.trainingModeActive
                ) : (
                  <>
                    <span className="font-medium tabular-nums text-[var(--color-foreground)]">
                      {selectedCount}/{activeTree.perks.length}
                    </span>{" "}
                    {labels.perksSelected}
                  </>
                )}
              </p>
            </div>
          </div>
        }
      />

      <div
        className={cn(
          "flex-shrink-0 border-b border-[var(--color-border)]/50 px-4 py-3",
          stackedLayout && "px-3 py-2",
        )}
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          {!isDestinyTree && (
            <div className="inline-flex rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-elevated)]/50 p-0.5">
              <Button
                variant={isTrainingMode ? "ghost" : "default"}
                size="sm"
                className="h-7 px-3 text-xs"
                onClick={() => setSkillWorkspaceMode("perks")}
              >
                {labels.perksMode}
              </Button>
              <Button
                variant={isTrainingMode ? "default" : "ghost"}
                size="sm"
                className="h-7 px-3 text-xs"
                onClick={() => setSkillWorkspaceMode("training")}
              >
                {labels.trainingMode}
              </Button>
            </div>
          )}

          {isDestinyTree ? (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-medium uppercase tracking-wide text-[var(--color-muted)]">
                {labels.destinyPoints ?? "Destiny points"}
              </span>
              <span
                className={cn(
                  "text-xs tabular-nums",
                  destinyOverBudget
                    ? "font-medium text-[var(--color-error)]"
                    : "text-[var(--color-muted)]",
                )}
              >
                {computeDestinyPerkPointsSpent(gameData.game, build)}/
                {getEarnedDestinyPerkPoints(gameData.game, build)}
              </span>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-medium uppercase tracking-wide text-[var(--color-muted)]">
                {labels.skillLevel}
              </span>
              <div
                className={cn(
                  "inline-flex items-center rounded-[var(--radius-md)] border bg-[var(--color-surface-elevated)]/50 p-0.5",
                  hasSkillLevelProblem
                    ? "border-[var(--color-error)]/70 ring-1 ring-[var(--color-error)]/30"
                    : "border-[var(--color-border)]",
                )}
              >
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => setSkillLevel(activeTree.skillId, level - 1)}
                  disabled={level <= Math.max(floor, trainingFloor)}
                >
                  <Minus className="h-3.5 w-3.5" />
                </Button>
                <NumericLevelInput
                  value={level}
                  min={Math.max(floor, trainingFloor)}
                  max={skillLevelCap}
                  onCommit={(next) => setSkillLevel(activeTree.skillId, next)}
                  className={hasSkillLevelProblem ? "text-[var(--color-error)]" : undefined}
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => setSkillLevel(activeTree.skillId, level + 1)}
                  disabled={level >= skillLevelCap}
                >
                  <Plus className="h-3.5 w-3.5" />
                </Button>
              </div>
              <span className="text-xs text-[var(--color-muted)]">
                {labels.skillLevelMin}: <span className="tabular-nums">{floor}</span>
              </span>
            </div>
          )}

          {!isDestinyTree && isTrainingMode && (
            <ResetPerksButton
              className="h-7 shrink-0 px-3 text-xs"
              onClick={() => resetSkillTraining(activeTree.skillId)}
            >
              {labels.resetTraining}
            </ResetPerksButton>
          )}

          {!isDestinyTree && !isTrainingMode && (
            <ResetPerksButton onClick={() => resetSkillPerks(activeTree.skillId)}>
              {labels.resetSkill}
            </ResetPerksButton>
          )}
        </div>

        {!isTrainingMode && !stackedLayout && (
          <div className="mt-3 flex flex-col gap-2 md:flex-row md:items-center md:justify-between md:gap-3">
            <PerkLegend labels={labels} hasProblem={hasTreeProblem} />
            {!isDestinyTree && (
              <label className="inline-flex shrink-0 cursor-pointer items-center gap-2 text-[11px] text-[var(--color-muted)]">
                <input
                  type="checkbox"
                  checked={showPerkSkillRequirements}
                  onChange={(event) => setShowPerkSkillRequirements(event.target.checked)}
                  className="h-4 w-4 shrink-0 accent-[var(--color-accent)] md:h-3.5 md:w-3.5"
                />
                {labels.showSkillRequirements}
              </label>
            )}
          </div>
        )}
      </div>

      <CardContent
        className={cn(
          "flex min-h-0 flex-1 flex-col overflow-hidden bg-[var(--color-background)]/40 p-4 sm:p-6",
          stackedLayout && "p-2",
        )}
      >
        {isTrainingMode ? (
          <SkillTrainingSection
            game={gameData.game}
            build={build}
            skillId={activeTree.skillId}
            labels={labels}
          />
        ) : (
          perkTree
        )}
      </CardContent>
    </Card>
  );
}
