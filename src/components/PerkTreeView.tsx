import { useMemo, useRef, type MouseEvent, type MutableRefObject } from "react";
import {
  arePrerequisitesMet,
  getPerkSkillId,
  getStoredSkillLevel,
} from "@/engine/buildEngine";
import type { Perk, PerkTree } from "@/data/schemas";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import {
  formatPerkNodeRequirementLabel,
  getPerkNodeRequirements,
} from "@/lib/perkRequirements";
import {
  computePerkTreeEdgesPercentInBounds,
  getNextRankInStack,
  getPerkPercentPositionInBounds,
  getPerkPositionKey,
  getPerkStackRank,
  getPerkTreeContentBounds,
  getVisiblePerksForTree,
  groupPerksByPosition,
  resolvePerkTakeTarget,
} from "@/lib/perkTreeGrid";
import { useBuildStore } from "@/store/buildStore";

const EDITOR_NODE_EXTENT = 1.25;
const EDITOR_BOUNDS_PADDING = 1.45;
const GRID_UNIT_PX = 26;

function perkAbbreviation(name: string): string {
  const words = name.split(/\s+/).filter((word) => /[A-Za-z]/.test(word));
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }
  const letters = name.replace(/[^A-Za-z]/g, "");
  return (letters.slice(0, 2) || "?").toUpperCase();
}

interface PerkNodeProps {
  perk: Perk;
  position: { x: number; y: number };
  takeTargetId: string;
  requirements: { skillReq: number | null; playerLevelReq: number | null };
  stackRank: { current: number; total: number } | null;
  nextRank: Perk | undefined;
  isSelected: boolean;
  isAvailable: boolean;
  isLocked: boolean;
  isConflict: boolean;
  isInteractive: boolean;
  tookPerkWithLastClickRef: MutableRefObject<boolean>;
  onTryTake: (perkId: string) => boolean;
  onForceTake: (perkId: string) => boolean;
  onRemove: (perkId: string) => void;
  labels: Record<string, string>;
}

function PerkNode({
  perk,
  position,
  takeTargetId,
  requirements,
  stackRank,
  nextRank,
  isSelected,
  isAvailable,
  isLocked,
  isConflict,
  isInteractive,
  tookPerkWithLastClickRef,
  onTryTake,
  onForceTake,
  onRemove,
  labels,
}: PerkNodeProps) {
  const handleMouseDown = (event: MouseEvent<HTMLButtonElement>) => {
    if (!isInteractive) return;

    window.getSelection()?.removeAllRanges();

    if (event.button === 2) {
      event.preventDefault();
      event.stopPropagation();
      onRemove(perk.id);
      return;
    }

    if (event.button !== 0) return;

    if (event.detail > 1 && !tookPerkWithLastClickRef.current) {
      const tookPerk = onForceTake(takeTargetId);
      tookPerkWithLastClickRef.current = tookPerk;
    } else {
      tookPerkWithLastClickRef.current = onTryTake(takeTargetId);
    }
  };

  const requirementLabel = formatPerkNodeRequirementLabel(requirements);
  const requirementBadgeClassName = cn(
    "whitespace-nowrap rounded border px-1 py-px text-[9px] font-semibold tabular-nums leading-none shadow-[0_1px_4px_rgba(0,0,0,0.45)]",
    "border-[var(--color-border)] bg-[var(--color-surface)]",
    isConflict && "border-[var(--color-health)]/70 text-[var(--color-health)]",
    !isConflict &&
      isSelected &&
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

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div
          className={cn(
            "absolute -translate-x-1/2 -translate-y-1/2 select-none",
            !isInteractive && "pointer-events-none",
            isInteractive && "z-20",
          )}
          style={{ left: `${position.x}%`, top: `${position.y}%` }}
        >
          <button
            type="button"
            onMouseDown={handleMouseDown}
            onContextMenu={(event) => event.preventDefault()}
            className={cn(
              "relative flex h-9 w-9 items-center justify-center rounded-full border-2 text-[9px] font-semibold leading-none transition-all",
              isConflict &&
                "z-30 border-[var(--color-health)] bg-[var(--color-health)]/20 text-[var(--color-foreground)] shadow-[0_0_16px_rgba(139,41,66,0.55)] ring-2 ring-[var(--color-health)]/80 animate-pulse",
              !isConflict &&
                isSelected &&
                "border-[var(--color-perk-selected)] bg-[var(--color-perk-selected)]/30 text-[var(--color-perk-selected)] shadow-[0_0_12px_rgba(212,175,55,0.35)]",
              !isConflict &&
                !isSelected &&
                isAvailable &&
                "border-[var(--color-perk-available)] bg-[var(--color-surface-elevated)] text-[var(--color-foreground)] hover:scale-105 hover:border-[var(--color-accent)]",
              !isConflict &&
                !isSelected &&
                !isAvailable &&
                !isLocked &&
                "border-[var(--color-perk-prereq)]/80 bg-[var(--color-surface)] text-[var(--color-muted)]",
              !isConflict &&
                isLocked &&
                !isSelected &&
                "border-[var(--color-perk-locked)] bg-[var(--color-surface)]/80 text-[var(--color-muted)] opacity-55 hover:opacity-80",
            )}
          >
            <span className="leading-none">{perkAbbreviation(perk.name)}</span>
          </button>
          {(requirementLabel || stackRank) && (
            <div className="pointer-events-none absolute top-full left-1/2 mt-0.5 flex -translate-x-1/2 flex-col items-center gap-0.5">
              {requirementLabel && (
                <span className={requirementBadgeClassName}>{requirementLabel}</span>
              )}
              {stackRank && (
                <span className={stackRankBadgeClassName}>
                  {stackRank.current}/{stackRank.total}
                </span>
              )}
            </div>
          )}
        </div>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-sm">
        <p className="font-semibold text-[var(--color-accent)]">{perk.name}</p>
        {stackRank && (
          <p className="mt-0.5 text-xs text-[var(--color-muted)]">
            {labels.perkRank}: {stackRank.current}/{stackRank.total}
          </p>
        )}
        {perk.skillReq > 0 && (
          <p className="mt-1 text-xs text-[var(--color-muted)]">
            {labels.skillReq}: {perk.skillReq}
          </p>
        )}
        {requirements.playerLevelReq !== null && (
          <p className={cn("text-xs text-[var(--color-muted)]", perk.skillReq > 0 ? "mt-0.5" : "mt-1")}>
            {labels.playerLevelReq}: {requirements.playerLevelReq}
          </p>
        )}
        <p className="mt-2 text-xs leading-relaxed">{perk.description}</p>
        {nextRank && isSelected && (
          <div className="mt-2 border-t border-[var(--color-border)]/60 pt-2">
            <p className="text-xs font-medium text-[var(--color-accent-muted)]">
              {labels.nextRank}
            </p>
            <p className="mt-1 text-xs text-[var(--color-muted)]">
              {labels.skillReq}: {nextRank.skillReq}
            </p>
            <p className="mt-1 text-xs leading-relaxed">{nextRank.description}</p>
          </div>
        )}
        <p className="mt-2 text-xs font-medium text-[var(--color-muted)]">
          {isConflict
            ? labels.skillReqConflictLegend
            : isSelected
              ? nextRank
                ? labels.upgradeAvailable
                : labels.selected
              : isLocked
                ? labels.locked
                : isAvailable
                  ? labels.available
                  : labels.locked}
        </p>
      </TooltipContent>
    </Tooltip>
  );
}

interface PerkTreeViewProps {
  tree: PerkTree;
  labels: Record<string, string>;
  conflictPerkIds?: string[];
  className?: string;
}

function PerkTreeView({ tree, labels, conflictPerkIds = [], className }: PerkTreeViewProps) {
  const gameData = useBuildStore((s) => s.gameData);
  const build = useBuildStore((s) => s.build);
  const tryTakePerk = useBuildStore((s) => s.tryTakePerk);
  const allocatePerk = useBuildStore((s) => s.allocatePerk);
  const removePerk = useBuildStore((s) => s.removePerk);
  const tookPerkWithLastClickRef = useRef(false);

  const bounds = useMemo(
    () => getPerkTreeContentBounds(tree, EDITOR_NODE_EXTENT, EDITOR_BOUNDS_PADDING),
    [tree],
  );

  const edges = useMemo(
    () => computePerkTreeEdgesPercentInBounds(tree, build.selectedPerkIds, bounds),
    [tree, build.selectedPerkIds, bounds],
  );

  const stacksByPosition = useMemo(() => groupPerksByPosition(tree), [tree]);

  const visiblePerks = useMemo(
    () => getVisiblePerksForTree(tree, build.selectedPerkIds),
    [tree, build.selectedPerkIds],
  );

  const conflictPositionKeys = useMemo(() => {
    const keys = new Set<string>();
    for (const perkId of conflictPerkIds) {
      const perk = tree.perks.find((candidate) => candidate.id === perkId);
      if (perk) {
        keys.add(getPerkPositionKey(perk.position));
      }
    }
    return keys;
  }, [conflictPerkIds, tree.perks]);

  if (!gameData) return null;

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-[var(--radius-md)] border border-[var(--color-border)]/70 bg-[var(--color-background)]/40",
        className,
      )}
      style={{
        aspectRatio: `${bounds.width} / ${bounds.height}`,
        width: `min(100%, ${bounds.width * GRID_UNIT_PX}px)`,
      }}
    >
      <svg className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden>
        {edges.map((edge, i) => (
          <line
            key={i}
            x1={`${edge.x1}%`}
            y1={`${edge.y1}%`}
            x2={`${edge.x2}%`}
            y2={`${edge.y2}%`}
            stroke={edge.active ? "var(--color-accent)" : "var(--color-border)"}
            strokeWidth={edge.active ? 2.5 : 1.5}
            strokeOpacity={edge.active ? 0.85 : 0.45}
            strokeLinecap="round"
          />
        ))}
      </svg>
      {visiblePerks.map((perk) => {
        const positionKey = getPerkPositionKey(perk.position);
        const stack = stacksByPosition.get(positionKey) ?? [perk];
        const stackRank = getPerkStackRank(stack, build.selectedPerkIds);
        const nextRank = getNextRankInStack(stack, build.selectedPerkIds);
        const isSelected = build.selectedPerkIds.includes(perk.id);
        const prereqsMet = arePrerequisitesMet(gameData.game, build, perk);
        const skillId = getPerkSkillId(gameData.game, perk.id);
        const skillLevel = skillId
          ? getStoredSkillLevel(gameData.game, build, skillId)
          : 0;
        const meetsSkillReq = skillLevel >= perk.skillReq;
        const isAvailable = !isSelected && prereqsMet && meetsSkillReq;
        const isLocked = !isSelected && (!prereqsMet || !meetsSkillReq);
        const isConflict = conflictPositionKeys.has(positionKey);
        const takeTargetId = resolvePerkTakeTarget(stack, build.selectedPerkIds);
        const takeTargetPerk = stack.find((candidate) => candidate.id === takeTargetId) ?? perk;
        const requirements = getPerkNodeRequirements(takeTargetPerk);

        return (
          <PerkNode
            key={positionKey}
            perk={perk}
            position={getPerkPercentPositionInBounds(perk.position, bounds)}
            takeTargetId={takeTargetId}
            requirements={requirements}
            stackRank={stackRank}
            nextRank={nextRank}
            isSelected={isSelected}
            isAvailable={isAvailable}
            isLocked={isLocked}
            isConflict={isConflict}
            isInteractive
            tookPerkWithLastClickRef={tookPerkWithLastClickRef}
            onTryTake={tryTakePerk}
            onForceTake={allocatePerk}
            onRemove={removePerk}
            labels={labels}
          />
        );
      })}
    </div>
  );
}

export { PerkTreeView };
