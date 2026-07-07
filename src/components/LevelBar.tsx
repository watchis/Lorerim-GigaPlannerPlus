import { AlertCircle, AlertTriangle, ChevronsDown, ChevronsUp, Minus, Plus, Wallet } from "lucide-react";
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { NumericLevelInput } from "@/components/NumericLevelInput";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  CursorTooltip,
  InfoTooltipButton,
} from "@/components/ui/tooltip";
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
  return <InfoTooltipButton text={text} />;
}

function BudgetStatRow({
  label,
  remaining,
  spentLabel,
  spent,
  info,
  overBudget,
  showInfoText = false,
}: {
  label: string;
  remaining: number;
  spentLabel: string;
  spent: number;
  info: string;
  overBudget: boolean;
  showInfoText?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0 space-y-1">
        <p className="text-xs text-[var(--color-muted)]">{label}</p>
        <p className="text-[11px] text-[var(--color-muted)]">
          {spent} {spentLabel}
        </p>
        {showInfoText && (
          <p className="text-[10px] leading-snug text-[var(--color-muted)]/90">{info}</p>
        )}
      </div>
      <span className={remainingCountClassName(overBudget)}>{remaining}</span>
    </div>
  );
}

function MobileBudgetDropdown({
  barLabels,
  computed,
  perkPointsInfo,
  skillPointsInfo,
  trainingLevelsInfo,
  perkOverBudget,
  skillOverBudget,
  trainingOverBudget,
}: {
  barLabels: Record<string, string>;
  computed: NonNullable<ReturnType<typeof useBuildStore.getState>["computed"]>;
  perkPointsInfo: string;
  skillPointsInfo: string;
  trainingLevelsInfo: string;
  perkOverBudget: boolean;
  skillOverBudget: boolean;
  trainingOverBudget: boolean;
}) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number; width: number } | null>(
    null,
  );
  const hasIssue = perkOverBudget || skillOverBudget || trainingOverBudget;

  useLayoutEffect(() => {
    if (!open || !triggerRef.current) {
      setMenuPosition(null);
      return;
    }

    const updatePosition = () => {
      if (!triggerRef.current) return;
      const rect = triggerRef.current.getBoundingClientRect();
      const width = Math.min(288, window.innerWidth - 16);
      const left = Math.min(
        Math.max(8, rect.right - width),
        window.innerWidth - width - 8,
      );
      setMenuPosition({
        top: rect.bottom + 6,
        left,
        width,
      });
    };

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (triggerRef.current?.contains(target) || menuRef.current?.contains(target)) return;
      setOpen(false);
    };

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [open]);

  const menu =
    open && menuPosition
      ? createPortal(
          <div
            ref={menuRef}
            role="dialog"
            aria-label={barLabels.budgetSummaryTitle ?? "Build budget"}
            className="fixed z-[90] space-y-3 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-3 shadow-[var(--shadow-panel)]"
            style={{
              top: menuPosition.top,
              left: menuPosition.left,
              width: menuPosition.width,
            }}
          >
            <BudgetStatRow
              label={barLabels.perkPointsRemaining}
              remaining={computed.perkPointsRemaining}
              spentLabel={barLabels.perkPointsSpent}
              spent={computed.perkPointsSpent}
              info={perkPointsInfo}
              overBudget={perkOverBudget}
              showInfoText
            />
            <BudgetStatRow
              label={barLabels.trainingLevelsRemaining}
              remaining={computed.trainingLevelsRemaining}
              spentLabel={barLabels.trainingLevelsSpent}
              spent={computed.trainingLevelsUsed}
              info={trainingLevelsInfo}
              overBudget={trainingOverBudget}
              showInfoText
            />
            <BudgetStatRow
              label={barLabels.skillPointsRemaining}
              remaining={computed.skillPointsRemaining}
              spentLabel={barLabels.skillPointsSpent}
              spent={computed.skillPointsSpent}
              info={skillPointsInfo}
              overBudget={skillOverBudget}
              showInfoText
            />
          </div>,
          document.body,
        )
      : null;

  return (
    <div className="md:hidden">
      <Button
        ref={triggerRef}
        type="button"
        variant="outline"
        size="icon"
        className={cn(
          "h-9 w-9 border-[var(--color-border)] bg-[var(--color-surface-elevated)]/50",
          hasIssue && "border-[var(--color-error)]/50 text-[var(--color-error)]",
        )}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label={barLabels.budgetSummaryTitle ?? "Build budget"}
        onClick={() => setOpen((value) => !value)}
      >
        <Wallet className="h-4 w-4" />
      </Button>
      {menu}
    </div>
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

  const { baseLevel, maxPlayerLevel, standardMaxPlayerLevel, initialPerkPoints } =
    gameData.game.mechanics.leveling;
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
  const showEasyModeWarning = build.playerLevel > standardMaxPlayerLevel;
  const easyModeLevelWarning = formatLabel(barLabels.easyModeLevelWarning, {
    standardMax: standardMaxPlayerLevel,
  });

  return (
    <div className="shrink-0 border-b border-[var(--color-border)]/50 bg-[var(--color-surface)]/80 px-4 py-2 sm:px-6">
      <div className="mx-auto flex max-w-[1600px] flex-col gap-2 md:flex-row md:flex-wrap md:items-center md:justify-between md:gap-3">
        <div className="flex w-full min-w-0 flex-col gap-2 md:w-auto">
          <div className="flex flex-wrap items-center justify-between gap-2 sm:justify-start sm:gap-3">
            <span className="text-xs font-medium uppercase tracking-wide text-[var(--color-muted)]">
              {barLabels.playerLevel}
            </span>
            <div
              className={cn(
                "inline-flex items-center rounded-[var(--radius-md)] border bg-[var(--color-surface-elevated)]/50 p-0.5",
                showEasyModeWarning
                  ? "border-[var(--color-accent)]"
                  : "border-[var(--color-border)]",
              )}
            >
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
                className="w-12 sm:w-14"
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

            <MobileBudgetDropdown
              barLabels={barLabels}
              computed={computed}
              perkPointsInfo={perkPointsInfo}
              skillPointsInfo={skillPointsInfo}
              trainingLevelsInfo={trainingLevelsInfo}
              perkOverBudget={perkOverBudget}
              skillOverBudget={skillOverBudget}
              trainingOverBudget={trainingOverBudget}
            />
          </div>

          {showEasyModeWarning && (
            <div
              className="flex w-full min-w-0 items-start gap-1.5 rounded-[var(--radius-md)] border border-[var(--color-accent)]/30 bg-[var(--color-accent)]/5 px-2.5 py-1.5 text-[11px] leading-snug text-[var(--color-accent)] sm:text-xs"
              role="status"
            >
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
              <span className="min-w-0">{easyModeLevelWarning}</span>
            </div>
          )}
        </div>

        <div className="hidden items-center gap-3 text-xs md:flex md:flex-wrap">
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
