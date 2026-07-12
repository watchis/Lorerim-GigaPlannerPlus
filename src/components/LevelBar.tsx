import { AlertCircle, AlertTriangle, ChevronsDown, ChevronsUp, Minus, Plus, Wallet } from "lucide-react";
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import { createPortal } from "react-dom";
import { NumericLevelInput } from "@/components/NumericLevelInput";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  CursorTooltip,
  HoverTapTooltip,
  InfoTooltipButton,
  claimExclusiveTouchOverlay,
  releaseExclusiveTouchOverlay,
  useSupportsHover,
} from "@/components/ui/tooltip";
import {
  type BuildPlayerLevelWarnings,
} from "@/engine/buildEngine";
import {
  BUILD_ISSUES_TOOLTIP_ITEM_GAP_PX,
  BUILD_ISSUES_TOOLTIP_WIDTH_PX,
  computeVisibleBuildIssueCount,
  getBuildIssuesBannerState,
  getBuildIssuesTooltipContentMaxHeight,
  shouldShowEasyModeLevelWarning,
  shrinkFontSizeToFit,
} from "@/lib/levelBarDisplay";
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

function useMobileLayout(): boolean {
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia("(max-width: 767px)").matches;
  });

  useEffect(() => {
    const media = window.matchMedia("(max-width: 767px)");
    const update = () => setIsMobile(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  return isMobile;
}

function FitTextLine({
  children,
  className,
  maxFontSize = 14,
  minFontSize = 9,
}: {
  children: string;
  className?: string;
  maxFontSize?: number;
  minFontSize?: number;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLParagraphElement>(null);
  const [fontSize, setFontSize] = useState(maxFontSize);

  useLayoutEffect(() => {
    const update = () => {
      const container = containerRef.current;
      const text = textRef.current;
      if (!container || !text) return;

      let size = maxFontSize;
      text.style.fontSize = `${size}px`;
      const textWidthAtMax = text.scrollWidth;
      size = shrinkFontSizeToFit(
        maxFontSize,
        minFontSize,
        textWidthAtMax,
        container.clientWidth,
      );
      text.style.fontSize = `${size}px`;
      setFontSize(size);
    };

    update();
    const observer = new ResizeObserver(update);
    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [children, maxFontSize, minFontSize]);

  return (
    <div ref={containerRef} className="min-w-0 flex-1 overflow-hidden">
      <p
        ref={textRef}
        className={cn("whitespace-nowrap leading-snug", className)}
        style={{ fontSize }}
      >
        {children}
      </p>
    </div>
  );
}

function BuildIssueListItem({ message }: { message: string }) {
  return (
    <li className="flex gap-2">
      <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-[var(--color-error)]" />
      <span>{message}</span>
    </li>
  );
}

const buildIssuesTooltipClassName =
  "max-h-[75vh] overflow-hidden overflow-x-hidden";

function BuildIssuesTooltipContent({
  messages,
  andMoreLabel,
}: {
  messages: string[];
  andMoreLabel: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const measureListRef = useRef<HTMLUListElement>(null);
  const [visibleCount, setVisibleCount] = useState(messages.length);

  useLayoutEffect(() => {
    const updateVisibleCount = () => {
      if (messages.length <= 1) {
        setVisibleCount(messages.length);
        return;
      }

      const list = measureListRef.current;
      const container = containerRef.current;
      if (!list || !container) return;

      const measureWidth = container.clientWidth;
      list.style.width =
        measureWidth > 0 ? `${measureWidth}px` : `${BUILD_ISSUES_TOOLTIP_WIDTH_PX}px`;

      const children = Array.from(list.children) as HTMLElement[];
      const issueItems = children.slice(0, messages.length);
      const andMoreItem = children[messages.length];
      if (issueItems.length !== messages.length || !andMoreItem) {
        setVisibleCount(messages.length);
        return;
      }

      const itemHeights = issueItems.map((item) => item.getBoundingClientRect().height);
      const maxHeight = getBuildIssuesTooltipContentMaxHeight(window.innerHeight);
      setVisibleCount(
        computeVisibleBuildIssueCount(
          itemHeights,
          andMoreItem.getBoundingClientRect().height,
          BUILD_ISSUES_TOOLTIP_ITEM_GAP_PX,
          maxHeight,
        ),
      );
    };

    updateVisibleCount();
    const frame = window.requestAnimationFrame(updateVisibleCount);

    const observer = new ResizeObserver(updateVisibleCount);
    if (containerRef.current) observer.observe(containerRef.current);

    window.addEventListener("resize", updateVisibleCount);
    return () => {
      window.cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("resize", updateVisibleCount);
    };
  }, [messages, andMoreLabel]);

  if (messages.length === 1) {
    return (
      <p className="max-h-[calc(75vh-1rem)] overflow-y-auto text-xs leading-relaxed">
        {messages[0]}
      </p>
    );
  }

  const hasMore = visibleCount < messages.length;
  const visibleMessages = messages.slice(0, visibleCount);

  return (
    <div ref={containerRef} className="relative overflow-hidden">
      <ul
        ref={measureListRef}
        aria-hidden
        className="pointer-events-none invisible absolute top-0 left-0 space-y-1.5 text-xs leading-relaxed"
      >
        {messages.map((message, index) => (
          <BuildIssueListItem key={`measure-${index}`} message={message} />
        ))}
        <li className="flex gap-2">
          <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-[var(--color-error)]" />
          <span>{andMoreLabel}</span>
        </li>
      </ul>
      <ul className="space-y-1.5 text-xs leading-relaxed">
        {visibleMessages.map((message, index) => (
          <BuildIssueListItem key={index} message={message} />
        ))}
        {hasMore && (
          <li className="flex gap-2">
            <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-[var(--color-error)]" />
            <span>{andMoreLabel}</span>
          </li>
        )}
      </ul>
    </div>
  );
}

function BuildIssuesBanner({
  mobileSummaryTemplate,
  desktopSummaryTemplate,
  andMoreLabel,
  messages,
}: {
  mobileSummaryTemplate: string;
  desktopSummaryTemplate: string;
  andMoreLabel: string;
  messages: string[];
}) {
  const isMobile = useMobileLayout();
  const supportsHover = useSupportsHover();
  const [touchOpen, setTouchOpen] = useState(false);
  const [touchAnchor, setTouchAnchor] = useState<{ x: number; y: number } | null>(null);
  const bannerButtonRef = useRef<HTMLButtonElement>(null);
  const { displaySummary, showTooltip } = getBuildIssuesBannerState({
    isMobile,
    messages,
    mobileSummaryTemplate,
    desktopSummaryTemplate,
  });

  const bannerClassName = cn(
    "mx-auto mt-2 flex max-w-[1600px] gap-2 rounded-[var(--radius-md)] border border-[var(--color-error)]/40 bg-[var(--color-error)]/10 px-3 py-2 text-[var(--color-foreground)]",
    isMobile ? "items-center text-sm" : "items-start text-sm",
  );

  const summaryNode = isMobile ? (
    <FitTextLine>{displaySummary}</FitTextLine>
  ) : (
    <p className="min-w-0 flex-1 leading-snug">{displaySummary}</p>
  );

  const banner = (
    <>
      <AlertCircle
        className={cn(
          "h-4 w-4 shrink-0 text-[var(--color-error)]",
          isMobile ? "" : "mt-0.5",
        )}
      />
      {summaryNode}
    </>
  );

  if (!showTooltip) {
    return <div className={bannerClassName}>{banner}</div>;
  }

  if (isMobile && !supportsHover) {
    return (
      <CursorTooltip
        open={touchOpen}
        onOpenChange={setTouchOpen}
        touchAnchor={touchAnchor}
        dismissOnPointerDownOutside
        dismissOutsideRefs={[bannerButtonRef]}
        contentClassName={buildIssuesTooltipClassName}
        content={<BuildIssuesTooltipContent messages={messages} andMoreLabel={andMoreLabel} />}
        className={cn(bannerClassName, "cursor-pointer touch-manipulation")}
      >
        <button
          ref={bannerButtonRef}
          type="button"
          className="flex w-full min-w-0 items-center gap-2 border-0 bg-transparent p-0 text-left text-inherit"
          aria-label={displaySummary}
          onClick={(event) => {
            setTouchAnchor({ x: event.clientX, y: event.clientY });
            setTouchOpen((open) => !open);
          }}
        >
          {banner}
        </button>
      </CursorTooltip>
    );
  }

  return (
    <CursorTooltip
      className={cn(bannerClassName, "cursor-help")}
      contentClassName={buildIssuesTooltipClassName}
      content={<BuildIssuesTooltipContent messages={messages} andMoreLabel={andMoreLabel} />}
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

function BudgetInlineStats({
  barLabels,
  computed,
  perkPointsInfo,
  skillPointsInfo,
  trainingLevelsInfo,
  perkOverBudget,
  skillOverBudget,
  trainingOverBudget,
  className,
}: {
  barLabels: Record<string, string>;
  computed: NonNullable<ReturnType<typeof useBuildStore.getState>["computed"]>;
  perkPointsInfo: string;
  skillPointsInfo: string;
  trainingLevelsInfo: string;
  perkOverBudget: boolean;
  skillOverBudget: boolean;
  trainingOverBudget: boolean;
  className?: string;
}) {
  return (
    <div className={cn("flex shrink-0 items-center gap-3 text-xs", className)}>
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
  );
}

function BudgetDropdown({
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
  const overlayId = "budget-dropdown";
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number; width: number } | null>(
    null,
  );
  const hasIssue = perkOverBudget || skillOverBudget || trainingOverBudget;

  useEffect(() => {
    if (!open) return;
    claimExclusiveTouchOverlay(overlayId);
    return () => releaseExclusiveTouchOverlay(overlayId);
  }, [open]);

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
    <>
      <Button
        ref={triggerRef}
        type="button"
        variant="outline"
        size="icon"
        className={cn(
          "h-9 w-9 border-[var(--color-border)] bg-[var(--color-surface-elevated)]/50 md:h-7 md:w-7",
          hasIssue && "border-[var(--color-error)]/50 text-[var(--color-error)]",
        )}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label={barLabels.budgetSummaryTitle ?? "Build budget"}
        onClick={() =>
          setOpen((value) => {
            const next = !value;
            if (next) claimExclusiveTouchOverlay(overlayId);
            else releaseExclusiveTouchOverlay(overlayId);
            return next;
          })
        }
      >
        <Wallet className="h-4 w-4" />
      </Button>
      {menu}
    </>
  );
}

type BudgetProps = {
  barLabels: Record<string, string>;
  computed: NonNullable<ReturnType<typeof useBuildStore.getState>["computed"]>;
  perkPointsInfo: string;
  skillPointsInfo: string;
  trainingLevelsInfo: string;
  perkOverBudget: boolean;
  skillOverBudget: boolean;
  trainingOverBudget: boolean;
};

function useCompactBudgetLayout(
  rowRef: RefObject<HTMLDivElement | null>,
  levelControlsRef: RefObject<HTMLDivElement | null>,
  budgetMeasureRef: RefObject<HTMLDivElement | null>,
  deps: unknown[],
) {
  const [useCompactBudget, setUseCompactBudget] = useState(false);

  useLayoutEffect(() => {
    const update = () => {
      const row = rowRef.current;
      const levelControls = levelControlsRef.current;
      const budgetMeasure = budgetMeasureRef.current;
      if (!row || !levelControls || !budgetMeasure) return;

      const gapBuffer = 12;
      const availableWidth = row.clientWidth - levelControls.offsetWidth - gapBuffer;
      const budgetWidth = budgetMeasure.scrollWidth;
      setUseCompactBudget(budgetWidth > availableWidth);
    };

    update();

    const observer = new ResizeObserver(update);
    for (const element of [rowRef.current, levelControlsRef.current, budgetMeasureRef.current]) {
      if (element) observer.observe(element);
    }

    window.addEventListener("resize", update);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", update);
    };
  }, deps);

  return useCompactBudget;
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
            className="h-9 w-9 shrink-0 md:h-7 md:w-7"
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

function EasyModeLevelWarningIcon({ message }: { message: string }) {
  return (
    <HoverTapTooltip
      content={message}
      side="bottom"
      align="center"
      contentClassName="max-w-[16rem] text-xs leading-relaxed"
    >
      <button
        type="button"
        className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-md)] text-[var(--color-accent)] transition-colors hover:text-[var(--color-accent-muted)] md:h-7 md:w-7"
        aria-label={message}
      >
        <AlertTriangle className="h-3.5 w-3.5" />
      </button>
    </HoverTapTooltip>
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

  return (
    <LevelBarContent
      barLabels={barLabels}
      game={gameData.game}
      build={build}
      computed={computed}
      setPlayerLevel={setPlayerLevel}
      ensurePlayerLevel={ensurePlayerLevel}
    />
  );
}

function LevelBarContent({
  barLabels,
  game,
  build,
  computed,
  setPlayerLevel,
  ensurePlayerLevel,
}: {
  barLabels: Record<string, string>;
  game: NonNullable<ReturnType<typeof useBuildStore.getState>["gameData"]>["game"];
  build: NonNullable<ReturnType<typeof useBuildStore.getState>["build"]>;
  computed: NonNullable<ReturnType<typeof useBuildStore.getState>["computed"]>;
  setPlayerLevel: (level: number) => void;
  ensurePlayerLevel: () => void;
}) {
  const rowRef = useRef<HTMLDivElement>(null);
  const levelControlsRef = useRef<HTMLDivElement>(null);
  const budgetMeasureRef = useRef<HTMLDivElement>(null);

  const { baseLevel, maxPlayerLevel, standardMaxPlayerLevel, initialPerkPoints } =
    game.mechanics.leveling;
  const minimumPlayerLevel = computed.minimumPlayerLevel;
  const ensuredPlayerLevel = Math.max(build.playerLevel, minimumPlayerLevel);
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
  const destinyOverBudget = computed.destinyPerkPointsRemaining < 0;
  const trainingOverBudget = computed.trainingLevelsRemaining < 0;
  const skillOverBy = skillOverBudget ? Math.abs(computed.skillPointsRemaining) : 0;
  const perkOverBy = perkOverBudget ? Math.abs(computed.perkPointsRemaining) : 0;
  const destinyOverBy = destinyOverBudget
    ? Math.abs(computed.destinyPerkPointsRemaining)
    : 0;
  const warnings = computed.playerLevelWarnings;
  const skillReqConflicts = computed.skillReqConflicts;

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
            current: computed.skillLevels[skillReqConflicts[0].skillId] ?? 0,
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
  const showEasyModeWarning = shouldShowEasyModeLevelWarning(
    build.playerLevel,
    standardMaxPlayerLevel,
  );
  const easyModeLevelWarning = formatLabel(barLabels.easyModeLevelWarning, {
    standardMax: standardMaxPlayerLevel,
  });
  const budgetProps: BudgetProps = {
    barLabels,
    computed,
    perkPointsInfo,
    skillPointsInfo,
    trainingLevelsInfo,
    perkOverBudget,
    skillOverBudget,
    trainingOverBudget,
  };
  const compactBudget = useCompactBudgetLayout(
    rowRef,
    levelControlsRef,
    budgetMeasureRef,
    [showEasyModeWarning, build.playerLevel, computed],
  );

  return (
    <div className="shrink-0 border-b border-[var(--color-border)]/50 bg-[var(--color-surface)]/80 px-4 py-2 sm:px-6">
      <div className="mx-auto max-w-[1600px]">
        <div
          ref={rowRef}
          className="flex w-full min-w-0 flex-nowrap items-center gap-1.5 sm:gap-3"
        >
          <div
            ref={levelControlsRef}
            className="flex min-w-0 shrink-0 flex-nowrap items-center gap-1.5 sm:gap-3"
          >
            <span className="hidden shrink-0 text-xs font-medium uppercase tracking-wide text-[var(--color-muted)] min-[380px]:inline">
              {barLabels.playerLevel}
            </span>
            <div
              className={cn(
                "inline-flex shrink-0 items-center rounded-[var(--radius-md)] border bg-[var(--color-surface-elevated)]/50 p-0.5",
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
                className="w-11 sm:w-14"
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
            {showEasyModeWarning && <EasyModeLevelWarningIcon message={easyModeLevelWarning} />}
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

          <div className="relative ml-auto flex shrink-0 items-center justify-end">
            <div
              ref={budgetMeasureRef}
              className="pointer-events-none invisible absolute right-0 top-0 flex"
              aria-hidden
            >
              <BudgetInlineStats {...budgetProps} />
            </div>
            {compactBudget ? (
              <BudgetDropdown {...budgetProps} />
            ) : (
              <BudgetInlineStats {...budgetProps} />
            )}
          </div>
        </div>
      </div>

      {alertMessages.length > 0 && (
        <BuildIssuesBanner
          mobileSummaryTemplate={barLabels.buildIssuesAlertMobile}
          desktopSummaryTemplate={barLabels.buildIssuesAlertDesktop}
          andMoreLabel={barLabels.buildIssuesAndMore}
          messages={alertMessages}
        />
      )}
    </div>
  );
}
