import { AlertCircle, Minus, Plus, RotateCcw } from "lucide-react";
import { useMemo, useEffect, type ReactNode } from "react";
import { PerkBadgeVisibilityDropdown } from "@/components/PerkBadgeVisibilityDropdown";
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
  getMaxAllowedSkillLevel,
  getMaxSkillLevel,
  getRemainingDestinyPerkPoints,
  getEffectiveSkillFloor,
  getSkillLevelFromTraining,
  getStoredSkillLevel,
  isSkillOverPlayerLevelCap,
} from "@/engine/buildEngine";
import { cn } from "@/lib/utils";
import {
  getSkillTreeTitleActionsClassName,
  getSkillTreeTitleIconClassName,
  getSkillTreeTitleNameClassName,
  getSkillTreeTitleNameGroupClassName,
  getSkillTreeTitleRowClassName,
  getSkillTreeTitleSubtitleClassName,
} from "@/lib/skillTreePanelTitle";
import type { SkillLevelBonusLine } from "@/lib/skillLevelBonuses";
import { useUiStore } from "@/store/uiStore";
import { usePanelLabels } from "@/theme/ThemeProvider";
import { useBuildStore } from "@/store/buildStore";
import { usePlannerStackedLayout } from "@/layout/plannerLayout";
import { getPerkSearchPositionKeysForTree, getPerkSearchTokens } from "@/lib/perkSearch";
import { SkillLevelBonusIndicator } from "@/components/SkillLevelBonusIndicator";
import { getSkillLevelBonusLines } from "@/lib/skillLevelBonuses";
import { isSupernaturalPerkTreeSkillId } from "@/lib/supernatural";

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

function SkillTreeTitleRow({
  skillId,
  skillName,
  skillBonusLines,
  warningMessages,
  warningAriaLabel,
  bonusAriaLabel,
  subtitle,
  useCardTitle = false,
}: {
  skillId: string;
  skillName: string;
  skillBonusLines: SkillLevelBonusLine[];
  warningMessages: string[];
  warningAriaLabel: string;
  bonusAriaLabel: string;
  subtitle?: ReactNode;
  useCardTitle?: boolean;
}) {
  const nameClassName = getSkillTreeTitleNameClassName();

  return (
    <div className={getSkillTreeTitleRowClassName()}>
      <SkillIcon skillId={skillId} className={getSkillTreeTitleIconClassName()} />
      <div className={getSkillTreeTitleNameGroupClassName()}>
        {useCardTitle ? (
          <CardTitle className={nameClassName} title={skillName}>
            {skillName}
          </CardTitle>
        ) : (
          <h2 className={nameClassName} title={skillName}>
            {skillName}
          </h2>
        )}
        <SkillLevelBonusIndicator
          lines={skillBonusLines}
          reserveSpace
          ariaLabel={bonusAriaLabel}
        />
      </div>
      <div className={getSkillTreeTitleActionsClassName()}>
        <SkillTreeWarningIcon messages={warningMessages} ariaLabel={warningAriaLabel} />
      </div>
      {subtitle ? <p className={getSkillTreeTitleSubtitleClassName()}>{subtitle}</p> : null}
    </div>
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
  const perkSearchQuery = useUiStore((s) => s.perkSearchQuery);
  const skillWorkspaceMode = useUiStore((s) => s.skillWorkspaceMode);
  const setSkillWorkspaceMode = useUiStore((s) => s.setSkillWorkspaceMode);
  const stackedLayout = usePlannerStackedLayout();
  const gameData = useBuildStore((s) => s.gameData);
  const build = useBuildStore((s) => s.build);
  const computed = useBuildStore((s) => s.computed);
  const setSkillLevel = useBuildStore((s) => s.setSkillLevel);
  const resetSkillPerks = useBuildStore((s) => s.resetSkillPerks);
  const resetSkillTraining = useBuildStore((s) => s.resetSkillTraining);

  if (!gameData || !computed) return null;

  const trees = getOrderedPerkTrees(gameData.game);
  const activeTree =
    trees.find((tree) => tree.skillId === activeSkillTreeId) ?? trees[0];

  if (!activeTree) return null;

  const perkSearchTokens = useMemo(
    () => getPerkSearchTokens(perkSearchQuery),
    [perkSearchQuery],
  );
  const perkSearchPositionKeys = useMemo(
    () => getPerkSearchPositionKeysForTree(activeTree, perkSearchTokens),
    [activeTree, perkSearchTokens],
  );
  const isDestinyTree = activeTree.skillId === "destiny";
  const isSupernaturalTree = isSupernaturalPerkTreeSkillId(activeTree.skillId);
  const supportsSkillProgression = !isDestinyTree && !isSupernaturalTree;

  useEffect(() => {
    if (isSupernaturalTree && skillWorkspaceMode === "training") {
      setSkillWorkspaceMode("perks");
    }
  }, [isSupernaturalTree, skillWorkspaceMode, setSkillWorkspaceMode]);

  const skillReqConflictsOnTree = computed.skillReqConflicts.filter(
    (perk) => perk.skillId === activeTree.skillId,
  );
  const hasSkillReqConflict = supportsSkillProgression && skillReqConflictsOnTree.length > 0;

  const floor = supportsSkillProgression
    ? getEffectiveSkillFloor(gameData.game, build, activeTree.skillId)
    : 0;
  const skillLevelCap = supportsSkillProgression ? getMaxSkillLevel(gameData.game) : 0;
  const maxAllowedAtLevel = supportsSkillProgression
    ? getMaxAllowedSkillLevel(gameData.game, build)
    : 0;
  const level = supportsSkillProgression
    ? (computed.skillLevels[activeTree.skillId] ??
      getStoredSkillLevel(gameData.game, build, activeTree.skillId))
    : 0;
  const trainingFloor = supportsSkillProgression
    ? getSkillLevelFromTraining(gameData.game, build, activeTree.skillId)
    : 0;
  const isTrainingMode = supportsSkillProgression && skillWorkspaceMode === "training";
  const skillBonusLines = supportsSkillProgression
    ? getSkillLevelBonusLines(gameData.game, build, activeTree.skillId, labels)
    : [];
  const { perks: overLevelPerks, skillIncreases, destinyPerksOverBudget } =
    computed.playerLevelWarnings;
  const skillIncreaseConflict = skillIncreases.find(
    (skill) => skill.skillId === activeTree.skillId,
  );
  const isOverCap =
    supportsSkillProgression &&
    isSkillOverPlayerLevelCap(gameData.game, build, activeTree.skillId);
  const isOverIncreaseLimit = supportsSkillProgression && skillIncreaseConflict != null;
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
  const skillTreeSubtitle = isTrainingMode ? (
    labels.trainingModeActive
  ) : (
    <>
      <span className="font-medium tabular-nums text-[var(--color-foreground)]">
        {selectedCount}/{activeTree.perks.length}
      </span>{" "}
      {labels.perksSelected}
    </>
  );

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
  const overCapMessage =
    supportsSkillProgression && isOverCap
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
      fit
      className="min-h-0 flex-1"
      tree={activeTree}
      labels={labels}
      conflictPerkIds={skillReqConflictsOnTree.map((perk) => perk.id)}
      playerLevelConflictPerkIds={invalidPerkIdsOnTree}
      searchPerkPositionKeys={perkSearchPositionKeys}
    />
  );

  if (stackedLayout) {
    return (
      <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-[var(--color-surface)]">
        <header className="shrink-0 border-b border-[var(--color-border)]/50 px-3 py-2.5">
          <div className="flex items-start gap-2">
            <div className="min-w-0 flex-1">
              <SkillTreeTitleRow
                skillId={activeTree.skillId}
                skillName={activeTree.skillName}
                skillBonusLines={skillBonusLines}
                warningMessages={warningMessages}
                warningAriaLabel={labels.skillTreeWarning}
                bonusAriaLabel={labels.skillBonusIndicator ?? "View skill level bonuses"}
                subtitle={skillTreeSubtitle}
              />
            </div>
            {(supportsSkillProgression || isDestinyTree) && (
              <div className="flex shrink-0 items-center gap-0.5">
                {(supportsSkillProgression && !isTrainingMode) || isDestinyTree ? (
                  <PerkBadgeVisibilityDropdown labels={labels} />
                ) : null}
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

        {(supportsSkillProgression || isDestinyTree) && (
          <div className="flex w-full shrink-0 items-center gap-2 border-b border-[var(--color-border)]/50 px-3 py-1.5">
            {supportsSkillProgression ? (
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
                <div className="ml-auto flex items-center gap-1.5">
                  <span className="text-[10px] font-medium uppercase tracking-wide text-[var(--color-muted)]">
                    {labels.skillLevel}
                  </span>
                  <div
                    className={cn(
                      "inline-flex items-center rounded-[var(--radius-md)] border bg-[var(--color-surface-elevated)]/50 p-0.5",
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
          </div>
        )}

        {isSupernaturalTree && (
          <div className="flex w-full shrink-0 items-center border-b border-[var(--color-border)]/50 px-3 py-1.5">
            <ResetPerksButton
              className="ml-auto h-7 shrink-0 px-3 text-[10px]"
              onClick={() => resetSkillPerks(activeTree.skillId)}
            >
              {labels.resetSkill}
            </ResetPerksButton>
          </div>
        )}

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-[var(--color-background)]/40 p-0.5">
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
    <Card className="flex min-h-0 flex-1 flex-col">
      <div className="sticky top-0 z-10 overflow-hidden rounded-t-[var(--radius-lg)] bg-[var(--color-surface)]">
        <WorkspacePanelHeader
          back={{
            label: setupLabels.backToOverview ?? setupLabels.title,
            onClick: () => setMiddleView("character-info"),
          }}
          titleRow={
            <div className="min-w-0">
              <SkillTreeTitleRow
                skillId={activeTree.skillId}
                skillName={activeTree.skillName}
                skillBonusLines={skillBonusLines}
                warningMessages={warningMessages}
                warningAriaLabel={labels.skillTreeWarning}
                bonusAriaLabel={labels.skillBonusIndicator ?? "View skill level bonuses"}
                subtitle={skillTreeSubtitle}
                useCardTitle
              />
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
          {supportsSkillProgression && (
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
          ) : supportsSkillProgression ? (
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
          ) : null}

          {supportsSkillProgression && isTrainingMode && (
            <ResetPerksButton
              className="h-7 shrink-0 px-3 text-xs"
              onClick={() => resetSkillTraining(activeTree.skillId)}
            >
              {labels.resetTraining}
            </ResetPerksButton>
          )}

          {supportsSkillProgression && !isTrainingMode && (
            <ResetPerksButton onClick={() => resetSkillPerks(activeTree.skillId)}>
              {labels.resetSkill}
            </ResetPerksButton>
          )}

          {(isDestinyTree || isSupernaturalTree) && (
            <ResetPerksButton
              className="ml-auto shrink-0"
              onClick={() => resetSkillPerks(activeTree.skillId)}
            >
              {labels.resetSkill}
            </ResetPerksButton>
          )}
        </div>

        {!isTrainingMode && !stackedLayout && (
          <div className="mt-3 flex flex-col gap-2 md:flex-row md:items-center md:justify-between md:gap-3">
            <PerkLegend labels={labels} hasProblem={hasTreeProblem} />
            <PerkBadgeVisibilityDropdown labels={labels} className="h-7 w-7" iconClassName="h-3.5 w-3.5" />
          </div>
        )}
      </div>

      </div>

      <CardContent
        className={cn(
          "flex min-h-0 flex-1 flex-col overflow-hidden bg-[var(--color-background)]/40 p-2 sm:p-3",
          stackedLayout && "p-1",
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
