import {
  useEffect,
  useRef,
  type MouseEvent,
  type MutableRefObject,
  type PointerEvent as ReactPointerEvent,
} from "react";

import { CursorTooltip, useSupportsHover } from "@/components/ui/tooltip";
import type { Perk } from "@/data/schemas";
import {
  formatPerkNodeRequirementLabel,
  getPerkNodeRequirements,
} from "@/lib/perkRequirements";
import {
  PERK_DOUBLE_TAP_MS,
  PERK_TOOLTIP_DELAY_MS,
  perkAbbreviation,
} from "@/lib/perkTreeViewLayout";
import {
  DEFAULT_PERK_BADGE_PLACEMENT,
  getPerkBadgeContainerClassName,
  getPerkBadgeContainerStyle,
  type PerkBadgePlacement,
} from "@/lib/perkBadgeLayout";
import { canUpgradePerkStackRank, formatPerkStackRank, type PerkStackRank } from "@/lib/perkTreeGrid";
import { cn } from "@/lib/utils";
import type { PerkBadgeVisibility } from "@/store/uiStore";

function renderNextRankSection(nextRank: Perk, labels: Record<string, string>) {
  const nextRankRequirements = getPerkNodeRequirements(nextRank);
  return (
    <div className="mt-2 border-t border-[var(--color-border)]/60 pt-2">
      <p className="text-xs font-medium text-[var(--color-accent-muted)]">
        {labels.nextRank}
      </p>
      {nextRankRequirements.skillReq !== null && (
        <p className="mt-1 text-xs text-[var(--color-muted)]">
          {labels.skillReq}: {nextRankRequirements.skillReq}
        </p>
      )}
      {nextRankRequirements.playerLevelReq !== null && (
        <p
          className={cn(
            "text-xs",
            nextRankRequirements.skillReq !== null ? "mt-0.5" : "mt-1",
            "text-[var(--color-muted)]",
          )}
        >
          {labels.playerLevelReq}: {nextRankRequirements.playerLevelReq}
        </p>
      )}
      <p className="mt-1 text-xs leading-relaxed">{nextRank.description}</p>
    </div>
  );
}

export interface PerkNodeProps {
  perk: Perk;
  position: { x: number; y: number };
  requirements: { skillReq: number | null; playerLevelReq: number | null };
  badgeRequirements: { skillReq: number | null; playerLevelReq: number | null };
  takeTargetId: string;
  stackRank: PerkStackRank | null;
  canUpgradeRank: boolean;
  nextRank: Perk | undefined;
  isSelected: boolean;
  isAvailable: boolean;
  isLocked: boolean;
  isConflict: boolean;
  isInteractive: boolean;
  paintOrder: number;
  nodeDiameterPx: number;
  tookPerkWithLastClickRef: MutableRefObject<boolean>;
  onTryTake: (perkId: string) => boolean;
  onForceTake: (perkId: string) => boolean;
  onRemove: (perkId: string) => void;
  labels: Record<string, string>;
  badgeVisibility: PerkBadgeVisibility;
  badgePerkName: string;
  badgePlacement?: PerkBadgePlacement;
  positionKey: string;
  tooltipScale?: number;
  touchTooltipOpen?: boolean;
  touchAnchor?: { x: number; y: number } | null;
  onOpenTouchTooltip: (anchor: { x: number; y: number }) => void;
  onCloseTouchTooltip: () => void;
}

export function PerkNode({
  perk,
  position,
  requirements,
  badgeRequirements,
  takeTargetId,
  stackRank,
  canUpgradeRank,
  nextRank,
  isSelected,
  isAvailable,
  isLocked,
  isConflict,
  isInteractive,
  paintOrder,
  nodeDiameterPx,
  tookPerkWithLastClickRef,
  onTryTake,
  onForceTake,
  onRemove,
  labels,
  badgeVisibility,
  badgePerkName,
  badgePlacement = DEFAULT_PERK_BADGE_PLACEMENT,
  positionKey,
  tooltipScale = 1,
  touchTooltipOpen = false,
  touchAnchor = null,
  onOpenTouchTooltip,
  onCloseTouchTooltip,
}: PerkNodeProps) {
  const supportsHover = useSupportsHover();
  const longPressTimerRef = useRef<number | null>(null);
  const circleRef = useRef<HTMLSpanElement>(null);
  const badgeRef = useRef<HTMLDivElement>(null);
  const longPressTriggeredRef = useRef(false);
  const singleTapTooltipTimerRef = useRef<number | null>(null);
  const lastTapRef = useRef(0);
  const touchInteractionRef = useRef(false);
  const touchClearRef = useRef<number | null>(null);
  const forceAllocateHandledOnMouseDownRef = useRef(false);

  const clearLongPressTimer = () => {
    if (longPressTimerRef.current !== null) {
      window.clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const clearSingleTapTooltipTimer = () => {
    if (singleTapTooltipTimerRef.current !== null) {
      window.clearTimeout(singleTapTooltipTimerRef.current);
      singleTapTooltipTimerRef.current = null;
    }
  };

  const showTouchTooltip = () => {
    if (supportsHover) return;
    const circle = circleRef.current?.getBoundingClientRect();
    if (!circle) return;
    onOpenTouchTooltip({
      x: circle.left + circle.width / 2,
      y: circle.top + circle.height / 2,
    });
  };

  const scheduleTouchTooltip = () => {
    clearSingleTapTooltipTimer();
    singleTapTooltipTimerRef.current = window.setTimeout(() => {
      singleTapTooltipTimerRef.current = null;
      showTouchTooltip();
    }, PERK_TOOLTIP_DELAY_MS);
  };

  const markTouchInteraction = () => {
    touchInteractionRef.current = true;
    if (touchClearRef.current !== null) {
      window.clearTimeout(touchClearRef.current);
    }
    touchClearRef.current = window.setTimeout(() => {
      touchInteractionRef.current = false;
      touchClearRef.current = null;
    }, 500);
  };

  const clearTouchInteraction = () => {
    if (touchClearRef.current !== null) {
      window.clearTimeout(touchClearRef.current);
      touchClearRef.current = null;
    }
    touchInteractionRef.current = false;
  };

  const handleForceAllocate = (fromDoubleAction = false) => {
    if (!isInteractive) return false;
    if (!fromDoubleAction && tookPerkWithLastClickRef.current) return false;
    if (fromDoubleAction) {
      tookPerkWithLastClickRef.current = false;
    }
    const tookPerk = onForceTake(perk.id);
    tookPerkWithLastClickRef.current = tookPerk;
    return tookPerk;
  };

  const handleMouseDown = (event: MouseEvent<HTMLButtonElement>) => {
    if (!isInteractive) return;
    if (touchInteractionRef.current) {
      event.preventDefault();
      return;
    }

    window.getSelection()?.removeAllRanges();

    if (event.button === 2) {
      event.preventDefault();
      event.stopPropagation();
      onRemove(perk.id);
      return;
    }

    if (event.button !== 0) return;

    if (event.detail > 1) {
      forceAllocateHandledOnMouseDownRef.current = true;
      handleForceAllocate(true);
      return;
    }

    forceAllocateHandledOnMouseDownRef.current = false;
    tookPerkWithLastClickRef.current = onTryTake(takeTargetId);
  };

  const handleDoubleClick = (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    if (forceAllocateHandledOnMouseDownRef.current) {
      forceAllocateHandledOnMouseDownRef.current = false;
      return;
    }
    handleForceAllocate(true);
  };

  const handlePointerDown = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (!isInteractive) return;
    if (event.pointerType === "mouse") return;

    longPressTriggeredRef.current = false;
    clearLongPressTimer();
    clearSingleTapTooltipTimer();

    markTouchInteraction();

    longPressTimerRef.current = window.setTimeout(() => {
      longPressTriggeredRef.current = true;
      if (isSelected) {
        onRemove(perk.id);
      } else {
        showTouchTooltip();
      }
    }, 500);
  };

  const handlePointerUp = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (event.pointerType === "mouse") return;

    clearLongPressTimer();
    if (!isInteractive || longPressTriggeredRef.current) {
      if (longPressTriggeredRef.current) {
        longPressTriggeredRef.current = false;
      }
      return;
    }

    const now = Date.now();
    if (now - lastTapRef.current < PERK_DOUBLE_TAP_MS) {
      lastTapRef.current = 0;
      clearSingleTapTooltipTimer();
      onCloseTouchTooltip();
      handleForceAllocate(true);
      return;
    }

    lastTapRef.current = now;
    scheduleTouchTooltip();
  };

  const handlePointerCancel = () => {
    clearLongPressTimer();
    clearSingleTapTooltipTimer();
    longPressTriggeredRef.current = false;
    clearTouchInteraction();
  };

  useEffect(
    () => () => {
      clearLongPressTimer();
      clearSingleTapTooltipTimer();
      clearTouchInteraction();
    },
    [],
  );

  const isPartialRank = isSelected && stackRank !== null && canUpgradePerkStackRank(stackRank, canUpgradeRank);

  const labelFontPx = Math.max(8, Math.round(nodeDiameterPx * 0.30));
  const circleClassName = cn(
    "flex shrink-0 items-center justify-center rounded-full border-2 font-semibold leading-none transition-all",
    isConflict &&
      "border-[var(--color-error)] bg-[var(--color-error)]/30 text-[var(--color-foreground)] shadow-[var(--shadow-error-glow)] ring-[3px] ring-[var(--color-error)]/90 ring-offset-2 ring-offset-[var(--color-background)] animate-pulse",
    !isConflict &&
      isPartialRank &&
      "border-[var(--color-perk-partial)] bg-[var(--color-perk-partial)]/30 text-[var(--color-perk-partial)] shadow-[0_0_12px_rgba(78,179,245,0.4)]",
    !isConflict &&
      isSelected &&
      !isPartialRank &&
      "border-[var(--color-perk-selected)] bg-[var(--color-perk-selected)]/30 text-[var(--color-perk-selected)] shadow-[0_0_12px_rgba(212,175,55,0.35)]",
    !isConflict &&
      !isSelected &&
      isAvailable &&
      "border-[var(--color-perk-available)] bg-[var(--color-surface-elevated)] text-[var(--color-foreground)] group-hover:scale-105 group-hover:border-[var(--color-accent)]",
    !isConflict &&
      !isSelected &&
      !isAvailable &&
      !isLocked &&
      "border-[var(--color-perk-prereq)]/80 bg-[var(--color-surface)] text-[var(--color-muted)]",
    !isConflict &&
      isLocked &&
      !isSelected &&
      "border-[var(--color-perk-locked)] bg-[var(--color-surface)]/80 text-[var(--color-muted)] opacity-55 group-hover:opacity-80",
  );

  const requirementLabel = formatPerkNodeRequirementLabel(badgeRequirements, {
    visibility: badgeVisibility,
    perkName: badgePerkName,
  });
  const badgeCount = (requirementLabel ? 1 : 0) + (stackRank ? 1 : 0);

  const requirementBadgeClassName = cn(
    "whitespace-nowrap rounded border px-1 py-px text-[10px] font-semibold tabular-nums leading-none shadow-[0_1px_4px_rgba(0,0,0,0.45)]",
    "border-[var(--color-border)] bg-[var(--color-surface)]",
    isConflict &&
      "border-[var(--color-error)] bg-[var(--color-error)]/20 text-[var(--color-error)]",
    !isConflict &&
      isPartialRank &&
      "border-[var(--color-perk-partial)]/60 text-[var(--color-perk-partial)]",
    !isConflict &&
      isSelected &&
      !isPartialRank &&
      "border-[var(--color-perk-selected)]/60 text-[var(--color-perk-selected)]",
    !isConflict &&
      !isSelected &&
      isAvailable &&
      "border-[var(--color-perk-available)]/60 text-[var(--color-foreground)]",
    !isConflict && isLocked && !isSelected && "text-[var(--color-foreground)]/75",
    !isConflict &&
      !isSelected &&
      !isAvailable &&
      !isLocked &&
      "text-[var(--color-foreground)]/85",
  );
  const stackRankBadgeClassName = requirementBadgeClassName;

  const tooltipContent = (
    <>
      <p className="font-semibold text-[var(--color-accent)]">{perk.name}</p>
      {stackRank && (
        <p className="mt-0.5 text-xs text-[var(--color-muted)]">
          {labels.perkRank}: {formatPerkStackRank(stackRank)}
        </p>
      )}
      {requirements.skillReq !== null && (
        <p className="mt-1 text-xs text-[var(--color-muted)]">
          {labels.skillReq}: {requirements.skillReq}
        </p>
      )}
      {requirements.playerLevelReq !== null && (
        <p
          className={cn(
            "text-xs",
            requirements.skillReq !== null ? "mt-0.5" : "mt-1",
            isConflict
              ? "font-medium text-[var(--color-error)]"
              : "text-[var(--color-muted)]",
          )}
        >
          {labels.playerLevelReq}: {requirements.playerLevelReq}
        </p>
      )}
      <p className="mt-2 text-xs leading-relaxed">{perk.description}</p>
      {nextRank && isSelected && renderNextRankSection(nextRank, labels)}
      <p className="mt-2 text-xs font-medium text-[var(--color-muted)]">
        {isConflict
          ? labels.buildProblemLegend
          : isSelected
            ? canUpgradeRank
              ? labels.upgradeAvailable
              : labels.selected
            : isLocked
              ? labels.locked
              : isAvailable
                ? labels.available
                : labels.locked}
      </p>
    </>
  );

  return (
    <CursorTooltip
      content={tooltipContent}
      contentScale={tooltipScale}
      open={supportsHover ? undefined : touchTooltipOpen}
      onOpenChange={
        supportsHover
          ? undefined
          : (open) => {
              if (!open) onCloseTouchTooltip();
            }
      }
      touchAnchor={touchAnchor}
      className={cn(
        "absolute -translate-x-1/2 -translate-y-1/2 select-none",
        !isInteractive && "pointer-events-none",
      )}
      style={{ left: `${position.x}%`, top: `${position.y}%`, zIndex: paintOrder }}
    >
      <button
        type="button"
        data-perk-node
        data-perk-position-key={positionKey}
        aria-label={perk.name}
        onMouseDown={handleMouseDown}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
        onDoubleClick={handleDoubleClick}
        onContextMenu={(event) => event.preventDefault()}
        className="group relative touch-manipulation border-0 bg-transparent p-0"
      >
        <span
          ref={circleRef}
          data-perk-circle
          className={circleClassName}
          style={{ width: nodeDiameterPx, height: nodeDiameterPx, fontSize: labelFontPx }}
        >
          <span className="leading-none">{perkAbbreviation(perk.name)}</span>
        </span>
        {badgeCount > 0 ? (
          <div
            ref={badgeRef}
            data-perk-badges
            className={getPerkBadgeContainerClassName(badgePlacement)}
            style={getPerkBadgeContainerStyle(badgePlacement)}
          >
            {requirementLabel && (
              <span className={requirementBadgeClassName}>{requirementLabel}</span>
            )}
            {stackRank && (
              <span className={stackRankBadgeClassName}>{formatPerkStackRank(stackRank)}</span>
            )}
          </div>
        ) : null}
      </button>
    </CursorTooltip>
  );
}
