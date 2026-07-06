import { AlertCircle, ChevronsDown, ChevronsUp, Info, Minus, Plus } from "lucide-react";
import type { ReactNode } from "react";
import { NumericLevelInput } from "@/components/NumericLevelInput";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger, CursorTooltip } from "@/components/ui/tooltip";
import {
  getBuildPlayerLevelWarnings,
  ensurePlayerLevelForBuild,
  getMinimumPlayerLevelForBuild,
  getRemainingDestinyPerkPoints,
  getSelectedPerksBelowSkillRequirement,
  getSkillLevelForPerkChecks,
  type BuildPlayerLevelWarnings,
} from "@/engine/buildEngine";
import { cn } from "@/lib/utils";
import { useBuildStore } from "@/store/buildStore";
import { useThemeConfig } from "@/theme/ThemeProvider";

function formatLabel(template: string, values: Record<string, string | number>): string {
  return Object.entries(values).reduce(
    (result, [key, value]) => result.replace(`{${key}}`, String(value)),
    template,
  );
}

function remainingCountClassName(overBudget: boolean): string {
  return cn(
    "font-mono text-base font-bold tabular-nums leading-none",
    overBudget ? "text-[var(--color-error)]" : "text-[var(--color-foreground)]",
  );
}

function formatPlayerLevelWarningMessages(
  barLabels: Record<string, string>,
  warnings: BuildPlayerLevelWarnings,
  playerLevel: number,
): string[] {
  const { skills, skillIncreases, perks, attributeChoicesOverBy } = warnings;
  const messages: string[] = [];

  for (const skill of skills) {
    messages.push(
      formatLabel(barLabels.playerLevelSkillCapSingle, {
        skill: skill.skillName,
        skillLevel: skill.skillLevel,
        maxAllowed: skill.maxAllowed,
        playerLevel,
      }),
    );
  }

  for (const skill of skillIncreases) {
    messages.push(
      formatLabel(barLabels.playerLevelSkillIncreaseSingle, {
        skill: skill.skillName,
        skillLevel: skill.skillLevel,
        required: skill.requiredLevel,
        playerLevel,
      }),
    );
  }

  for (const perk of perks) {
    messages.push(
      formatLabel(barLabels.playerLevelPerkReqSingle, {
        perk: perk.name,
        required: perk.playerLevelReq,
        playerLevel,
      }),
    );
  }

  if (attributeChoicesOverBy > 0) {
    messages.push(
      attributeChoicesOverBy === 1
        ? formatLabel(barLabels.playerLevelAttributeOverBudgetSingle, { playerLevel })
        : formatLabel(barLabels.playerLevelAttributeOverBudgetMultiple, {
            count: attributeChoicesOverBy,
            playerLevel,
          }),
    );
  }

  return messages;
}

function BuildIssuesTooltipContent({ messages }: { messages: string[] }) {
  if (messages.length === 1) {
    return <p className="text-xs leading-relaxed">{messages[0]}</p>;
  }

  return (
    <ul className="space-y-1.5 text-xs leading-relaxed">
      {messages.map((message, index) => (
        <li key={index} className="flex gap-2">
          <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-[var(--color-error)]" />
          <span>{message}</span>
        </li>
      ))}
    </ul>
  );
}

function BuildIssuesBanner({
  summary,
  messages,
}: {
  summary: string;
  messages: string[];
}) {
  const bannerClassName =
    "mx-auto mt-2 flex max-w-[1600px] items-start gap-2 rounded-[var(--radius-md)] border border-[var(--color-error)]/40 bg-[var(--color-error)]/10 px-3 py-2 text-sm text-[var(--color-foreground)]";

  const banner = (
    <>
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-error)]" />
      <p className="min-w-0 flex-1 leading-snug">{summary}</p>
    </>
  );

  if (messages.length <= 1) {
    return <div className={bannerClassName}>{banner}</div>;
  }

  return (
    <CursorTooltip
      className={cn(bannerClassName, "cursor-help")}
      content={<BuildIssuesTooltipContent messages={messages} />}
    >
      {banner}
    </CursorTooltip>
  );
}

function PointsInfoTooltip({ text }: { text: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          className="inline-flex text-[var(--color-muted)] hover:text-[var(--color-foreground)]"
          aria-label={text}
        >
          <Info className="h-3 w-3" />
        </button>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="max-w-xs">
        {text}
      </TooltipContent>
    </Tooltip>
  );
}

function LevelStepperTooltipButton({
  label,
  info,
  onClick,
  disabled,
  children,
}: {
  label: string;
  info: string;
  onClick: () => void;
  disabled: boolean;
  children: ReactNode;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="inline-flex">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={onClick}
            disabled={disabled}
            aria-label={label}
          >
            {children}
          </Button>
        </span>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="max-w-xs">
        {info}
      </TooltipContent>
    </Tooltip>
  );
}

export function LevelBar() {
  const { labels } = useThemeConfig();
  const barLabels = labels["level-bar"];
  const gameData = useBuildStore((s) => s.gameData);
  const build = useBuildStore((s) => s.build);
  const computed = useBuildStore((s) => s.computed);
  const setPlayerLevel = useBuildStore((s) => s.setPlayerLevel);
  const ensurePlayerLevel = useBuildStore((s) => s.ensurePlayerLevel);

  if (!gameData || !computed) return null;

  const { baseLevel, maxPlayerLevel, initialPerkPoints } = gameData.game.mechanics.leveling;
  const minimumPlayerLevel = getMinimumPlayerLevelForBuild(gameData.game, build);
  const ensuredPlayerLevel = ensurePlayerLevelForBuild(gameData.game, build, {
    ensureMinimumPlayerLevel: true,
  }).playerLevel;
  const perkPointsInfo = formatLabel(barLabels.perkPointsInfo, {
    initial: initialPerkPoints,
    perLevel: computed.perkPointsPerLevel,
  });
  const skillPointsInfo = formatLabel(barLabels.skillPointsInfo, {
    perLevel: computed.skillPointsPerLevel,
  });
  const trainingLevelsInfo = formatLabel(barLabels.trainingLevelsInfo, {
    perLevel: computed.trainingLevelsPerLevel,
    total: build.playerLevel * computed.trainingLevelsPerLevel,
    playerLevel: build.playerLevel,
  });
  const skillOverBudget = computed.skillPointsRemaining < 0;
  const perkOverBudget = computed.perkPointsRemaining < 0;
  const destinyOverBudget = getRemainingDestinyPerkPoints(gameData.game, build) < 0;
  const trainingOverBudget = computed.trainingLevelsRemaining < 0;
  const skillOverBy = skillOverBudget ? Math.abs(computed.skillPointsRemaining) : 0;
  const perkOverBy = perkOverBudget ? Math.abs(computed.perkPointsRemaining) : 0;
  const destinyOverBy = destinyOverBudget
    ? Math.abs(getRemainingDestinyPerkPoints(gameData.game, build))
    : 0;
  const warnings = getBuildPlayerLevelWarnings(gameData.game, build);
  const skillReqConflicts = getSelectedPerksBelowSkillRequirement(gameData.game, build);

  const perkOverBudgetMessage = perkOverBudget
    ? formatLabel(barLabels.perkOverBudgetAlert, {
        count: perkOverBy,
        playerLevel: build.playerLevel,
      })
    : null;

  const destinyOverBudgetMessage = destinyOverBudget
    ? formatLabel(barLabels.destinyOverBudgetAlert, {
        count: destinyOverBy,
        playerLevel: build.playerLevel,
      })
    : null;

  const skillOverBudgetMessage = skillOverBudget
    ? formatLabel(barLabels.skillOverBudgetAlert, {
        count: skillOverBy,
        playerLevel: build.playerLevel,
      })
    : null;

  const trainingOverBudgetMessage = trainingOverBudget
    ? formatLabel(barLabels.trainingOverBudgetAlert, {
        used: computed.trainingLevelsUsed,
        earned: build.playerLevel * computed.trainingLevelsPerLevel,
        required: warnings.training?.requiredLevel ?? build.playerLevel,
        playerLevel: build.playerLevel,
      })
    : null;

  const skillReqConflictMessages =
    skillReqConflicts.length === 1
      ? [
          formatLabel(barLabels.skillReqConflictSingle, {
            perk: skillReqConflicts[0].name,
            required: skillReqConflicts[0].skillReq,
            current: getSkillLevelForPerkChecks(
              gameData.game,
              build,
              skillReqConflicts[0].skillId,
            ),
          }),
        ]
      : skillReqConflicts.length > 1
        ? [
            formatLabel(barLabels.skillReqConflictMultiple, {
              count: skillReqConflicts.length,
            }),
          ]
        : [];

  const alertMessages = [
    ...(perkOverBudgetMessage ? [perkOverBudgetMessage] : []),
    ...(destinyOverBudgetMessage ? [destinyOverBudgetMessage] : []),
    ...(skillOverBudgetMessage ? [skillOverBudgetMessage] : []),
    ...(trainingOverBudgetMessage ? [trainingOverBudgetMessage] : []),
    ...skillReqConflictMessages,
    ...formatPlayerLevelWarningMessages(barLabels, warnings, build.playerLevel),
  ];
  const alertSummary =
    alertMessages.length === 1
      ? alertMessages[0]
      : formatLabel(barLabels.buildIssuesAlert, { playerLevel: build.playerLevel });

  return (
    <div className="shrink-0 border-b border-[var(--color-border)]/50 bg-[var(--color-surface)]/80 px-4 py-2 sm:px-6">
      <div className="mx-auto flex max-w-[1600px] flex-col gap-2 md:flex-row md:flex-wrap md:items-center md:justify-between md:gap-3">
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <span className="text-xs font-medium uppercase tracking-wide text-[var(--color-muted)]">
            {barLabels.playerLevel}
          </span>
          <div className="inline-flex items-center rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-elevated)]/50 p-0.5">
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 md:h-7 md:w-7"
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
              className="h-9 w-9 md:h-7 md:w-7"
              onClick={() => setPlayerLevel(build.playerLevel + 1)}
              disabled={build.playerLevel >= maxPlayerLevel}
            >
              <Plus className="h-3.5 w-3.5" />
            </Button>
          </div>
          <LevelStepperTooltipButton
            label={barLabels.ensurePlayerLevel}
            info={barLabels.ensurePlayerLevelInfo}
            onClick={ensurePlayerLevel}
            disabled={build.playerLevel >= ensuredPlayerLevel}
          >
            <ChevronsUp className="h-3.5 w-3.5" />
          </LevelStepperTooltipButton>
          <LevelStepperTooltipButton
            label={barLabels.setToMinimumLevel}
            info={barLabels.setToMinimumLevelInfo}
            onClick={() => setPlayerLevel(minimumPlayerLevel)}
            disabled={build.playerLevel <= minimumPlayerLevel}
          >
            <ChevronsDown className="h-3.5 w-3.5" />
          </LevelStepperTooltipButton>
        </div>

        <div className="-mx-1 flex items-center gap-3 overflow-x-auto overscroll-x-contain px-1 pb-0.5 text-xs md:flex-wrap md:overflow-visible md:pb-0">
          <div className="flex shrink-0 items-center gap-x-2 whitespace-nowrap">
            <span className="inline-flex items-center gap-1.5 text-xs text-[var(--color-muted)]">
              <span>{barLabels.perkPointsRemaining}:</span>
              <span className={remainingCountClassName(perkOverBudget)}>
                {computed.perkPointsRemaining}
              </span>
              <PointsInfoTooltip text={perkPointsInfo} />
            </span>
            <span className="text-[var(--color-muted)]">
              ({computed.perkPointsSpent} {barLabels.perkPointsSpent})
            </span>
          </div>

          <div className="flex shrink-0 items-center gap-x-2 whitespace-nowrap">
            <span className="inline-flex items-center gap-1.5 text-xs text-[var(--color-muted)]">
              <span>{barLabels.trainingLevelsRemaining}:</span>
              <span className={remainingCountClassName(trainingOverBudget)}>
                {computed.trainingLevelsRemaining}
              </span>
              <PointsInfoTooltip text={trainingLevelsInfo} />
            </span>
            <span className="text-[var(--color-muted)]">
              ({computed.trainingLevelsUsed} {barLabels.trainingLevelsSpent})
            </span>
          </div>

          <div className="flex shrink-0 items-center gap-x-2 whitespace-nowrap">
            <span className="inline-flex items-center gap-1.5 text-xs text-[var(--color-muted)]">
              <span>{barLabels.skillPointsRemaining}:</span>
              <span className={remainingCountClassName(skillOverBudget)}>
                {computed.skillPointsRemaining}
              </span>
              <PointsInfoTooltip text={skillPointsInfo} />
            </span>
            <span className="text-[var(--color-muted)]">
              ({computed.skillPointsSpent} {barLabels.skillPointsSpent})
            </span>
          </div>
        </div>
      </div>

      {alertMessages.length > 0 && (
        <BuildIssuesBanner summary={alertSummary} messages={alertMessages} />
      )}
    </div>
  );
}
