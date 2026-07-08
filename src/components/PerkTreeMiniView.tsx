import { useId, useMemo } from "react";
import type { PerkTree } from "@/data/schemas";
import { cn } from "@/lib/utils";
import {
  computePerkTreeEdges,
  getPerkGridCenter,
  getPerkAllocationRank,
  getPerkPositionKey,
  getPerkStackRank,
  canUpgradePerkStackRank,
  getPerkTreeCompactViewBox,
  getPerkTreeGridBounds,
  getVisiblePerksForTree,
  groupPerksByPosition,
} from "@/lib/perkTreeGrid";
import { useBuildStore } from "@/store/buildStore";

interface PerkTreeMiniViewProps {
  tree: PerkTree;
  className?: string;
  compact?: boolean;
  conflictPerkIds?: string[];
}

const COMPACT_NODE_RADIUS = 0.5;
const COMPACT_NODE_RADIUS_UNSELECTED = 0.40;
const COMPACT_NODE_STROKE_HIGHLIGHT = 0.22;
const COMPACT_EDGE_STROKE = 0.2;
const COMPACT_EDGE_STROKE_ACTIVE = 0.25;
const COMPACT_SELECTED_FILL = "color-mix(in srgb, var(--color-perk-selected) 90%, #fff0c8)";
const COMPACT_PARTIAL_FILL = "color-mix(in srgb, var(--color-perk-partial) 90%, #d8f4ff)";
const COMPACT_CONFLICT_FILL = "color-mix(in srgb, var(--color-error) 88%, #ffd4dc)";
const COMPACT_UNSELECTED_FILL = "var(--color-perk-available)";

const COMPACT_NODE_HALO_PAD = 0.1;
const COMPACT_HIGHLIGHT_HALO_OPACITY = 0.62;
const COMPACT_INACTIVE_EDGE_OPACITY = 0.72;
const COMPACT_ACTIVE_EDGE_OPACITY = 1;
const COMPACT_VIEWBOX_PADDING = 0.55;
const COMPACT_VIEWBOX_ASPECT_PAD = 1.14;

function compactNodeExtent(): number {
  return (
    COMPACT_NODE_RADIUS +
    COMPACT_NODE_HALO_PAD +
    COMPACT_NODE_STROKE_HIGHLIGHT / 2 +
    COMPACT_EDGE_STROKE / 2 +
    0.35
  );
}

function getNodeEdgeTrimRadius(
  perkId: string,
  selectedPerkIds: string[],
  compact: boolean,
  isConflict: boolean,
): number {
  const isSelected = selectedPerkIds.includes(perkId);

  if (compact) {
    if (isConflict) {
      return COMPACT_NODE_RADIUS + COMPACT_NODE_HALO_PAD + COMPACT_NODE_STROKE_HIGHLIGHT / 2;
    }
    if (isSelected) {
      return COMPACT_NODE_RADIUS + COMPACT_NODE_HALO_PAD + COMPACT_NODE_STROKE_HIGHLIGHT / 2;
    }
    return COMPACT_NODE_RADIUS_UNSELECTED;
  }

  if (isConflict) {
    return (isSelected ? 0.45 : 0.35) + 0.2;
  }
  return (isSelected ? 0.45 : 0.35) + 0.1 / 2;
}

function CompactConflictNode({
  cx,
  cy,
  radius,
  glowFilterId,
}: {
  cx: number;
  cy: number;
  radius: number;
  glowFilterId: string;
}) {
  return (
    <g className="animate-pulse" filter={`url(#${glowFilterId})`}>
      <circle
        cx={cx}
        cy={cy}
        r={radius + COMPACT_NODE_HALO_PAD}
        fill="var(--color-error)"
        fillOpacity={COMPACT_HIGHLIGHT_HALO_OPACITY}
      />
      <circle
        cx={cx}
        cy={cy}
        r={radius}
        fill={COMPACT_CONFLICT_FILL}
        stroke="var(--color-error)"
        strokeWidth={COMPACT_NODE_STROKE_HIGHLIGHT}
        strokeOpacity={1}
      />
    </g>
  );
}

export function PerkTreeMiniView({
  tree,
  className,
  compact = false,
  conflictPerkIds = [],
}: PerkTreeMiniViewProps) {
  const glowFilterId = useId().replace(/:/g, "");
  const selectedPerkIds = useBuildStore((s) => s.build.selectedPerkIds);
  const perkPointsRemaining = useBuildStore((s) => s.computed?.perkPointsRemaining ?? 0);
  const gridBounds = useMemo(() => getPerkTreeGridBounds(tree), [tree]);
  const { width, height, origin } = gridBounds;

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

  const edges = useMemo(
    () =>
      computePerkTreeEdges(tree, selectedPerkIds, {
        nodeRadiusByPerkId: (perkId) => {
          const perk = tree.perks.find((candidate) => candidate.id === perkId);
          const isConflict = perk
            ? conflictPositionKeys.has(getPerkPositionKey(perk.position))
            : false;
          return getNodeEdgeTrimRadius(perkId, selectedPerkIds, compact, isConflict);
        },
      }),
    [tree, selectedPerkIds, compact, conflictPositionKeys],
  );

  const visiblePerks = useMemo(
    () => getVisiblePerksForTree(tree, selectedPerkIds),
    [tree, selectedPerkIds],
  );

  const stacksByPosition = useMemo(() => groupPerksByPosition(tree), [tree]);

  const partialRankPositionKeys = useMemo(() => {
    const keys = new Set<string>();
    for (const [positionKey, stack] of stacksByPosition) {
      const stackRank =
        stack.length > 1
          ? getPerkStackRank(stack, selectedPerkIds)
          : getPerkAllocationRank(stack[0], selectedPerkIds);
      if (!stackRank || stackRank.current <= 0) continue;

      const canAllocateMore = stackRank.unbounded
        ? perkPointsRemaining > 0
        : stackRank.total !== undefined && stackRank.current < stackRank.total;

      if (canUpgradePerkStackRank(stackRank, canAllocateMore)) {
        keys.add(positionKey);
      }
    }
    return keys;
  }, [stacksByPosition, selectedPerkIds, perkPointsRemaining]);

  const viewBox = useMemo(() => {
    if (!compact) {
      return `${origin.x} ${origin.y} ${width} ${height}`;
    }
    return getPerkTreeCompactViewBox(
      tree,
      compactNodeExtent(),
      COMPACT_VIEWBOX_PADDING,
      COMPACT_VIEWBOX_ASPECT_PAD,
    );
  }, [compact, tree, origin.x, origin.y, width, height]);

  const nodeRadius = compact ? COMPACT_NODE_RADIUS : 0.45;
  const nodeRadiusUnselected = compact ? COMPACT_NODE_RADIUS_UNSELECTED : 0.35;

  return (
    <div
      className={cn(
        "overflow-hidden",
        compact
          ? "h-full min-h-0 w-full"
          : "relative w-full rounded-[var(--radius-sm)] border border-[var(--color-border)]/60 bg-[var(--color-background)]/50",
        className,
      )}
      style={compact ? undefined : { aspectRatio: `${width} / ${height}` }}
    >
      <svg
        className={cn("block h-full w-full", compact && "max-h-full max-w-full")}
        viewBox={viewBox}
        preserveAspectRatio="xMidYMid meet"
        style={{ overflow: "hidden" }}
      >
        <defs>
          <filter id={glowFilterId} x="-80%" y="-80%" width="260%" height="260%">
            <feGaussianBlur stdDeviation="0.22" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        {compact ? (
          <g>
            {edges
              .filter((edge) => !edge.active)
              .map((edge, i) => (
                <line
                  key={`edge-inactive-${i}`}
                  x1={edge.x1}
                  y1={edge.y1}
                  x2={edge.x2}
                  y2={edge.y2}
                  stroke="var(--color-perk-available)"
                  strokeWidth={COMPACT_EDGE_STROKE}
                  strokeOpacity={COMPACT_INACTIVE_EDGE_OPACITY}
                  strokeLinecap="round"
                />
              ))}
            {edges
              .filter((edge) => edge.active)
              .map((edge, i) => (
                <line
                  key={`edge-active-${i}`}
                  x1={edge.x1}
                  y1={edge.y1}
                  x2={edge.x2}
                  y2={edge.y2}
                  stroke="var(--color-accent)"
                  strokeWidth={COMPACT_EDGE_STROKE_ACTIVE}
                  strokeOpacity={COMPACT_ACTIVE_EDGE_OPACITY}
                  strokeLinecap="round"
                />
              ))}
          </g>
        ) : null}
        {compact ? (
          <>
            {visiblePerks
              .filter((perk) => !selectedPerkIds.includes(perk.id))
              .map((perk) => {
                const center = getPerkGridCenter(perk.position);
                return (
                  <circle
                    key={perk.id}
                    cx={center.x}
                    cy={center.y}
                    r={nodeRadiusUnselected}
                    fill={COMPACT_UNSELECTED_FILL}
                  />
                );
              })}
            {visiblePerks
              .filter((perk) => selectedPerkIds.includes(perk.id))
              .map((perk) => {
                const center = getPerkGridCenter(perk.position);
                const isConflict = conflictPositionKeys.has(getPerkPositionKey(perk.position));
                const isPartialRank = partialRankPositionKeys.has(getPerkPositionKey(perk.position));

                if (isConflict) {
                  return (
                    <CompactConflictNode
                      key={perk.id}
                      cx={center.x}
                      cy={center.y}
                      radius={nodeRadius}
                      glowFilterId={glowFilterId}
                    />
                  );
                }

                const highlightColor = isPartialRank
                  ? "var(--color-perk-partial)"
                  : "var(--color-accent)";

                return (
                  <g key={perk.id} filter={`url(#${glowFilterId})`}>
                    <circle
                      cx={center.x}
                      cy={center.y}
                      r={nodeRadius + COMPACT_NODE_HALO_PAD}
                      fill={highlightColor}
                      fillOpacity={COMPACT_HIGHLIGHT_HALO_OPACITY}
                    />
                    <circle
                      cx={center.x}
                      cy={center.y}
                      r={nodeRadius}
                      fill={isPartialRank ? COMPACT_PARTIAL_FILL : COMPACT_SELECTED_FILL}
                      stroke={highlightColor}
                      strokeWidth={COMPACT_NODE_STROKE_HIGHLIGHT}
                      strokeOpacity={1}
                    />
                  </g>
                );
              })}
          </>
        ) : (
          <>
            {edges.map((edge, i) => (
              <line
                key={i}
                x1={edge.x1}
                y1={edge.y1}
                x2={edge.x2}
                y2={edge.y2}
                stroke={edge.active ? "var(--color-accent)" : "var(--color-border)"}
                strokeWidth={edge.active ? 0.15 : 0.1}
                strokeOpacity={edge.active ? 0.85 : edge.kind === "any" ? 0.45 : 0.35}
                strokeLinecap="round"
              />
            ))}
            {visiblePerks.map((perk) => {
              const isSelected = selectedPerkIds.includes(perk.id);
              const isConflict = conflictPositionKeys.has(getPerkPositionKey(perk.position));
              const isPartialRank =
                isSelected && partialRankPositionKeys.has(getPerkPositionKey(perk.position));
              const center = getPerkGridCenter(perk.position);

              return (
                <g key={perk.id} className={isConflict ? "animate-pulse" : undefined}>
                  {isConflict && (
                    <>
                      <circle
                        cx={center.x}
                        cy={center.y}
                        r={(isSelected ? nodeRadius : nodeRadiusUnselected) + 0.2}
                        fill="var(--color-error)"
                        fillOpacity={0.3}
                      />
                      <circle
                        cx={center.x}
                        cy={center.y}
                        r={(isSelected ? nodeRadius : nodeRadiusUnselected) + 0.1}
                        fill="var(--color-error)"
                        fillOpacity={0.5}
                      />
                    </>
                  )}
                  <circle
                    cx={center.x}
                    cy={center.y}
                    r={isSelected ? nodeRadius : nodeRadiusUnselected}
                    fill={
                      isConflict
                        ? "var(--color-error)"
                        : isPartialRank
                          ? "var(--color-perk-partial)"
                          : isSelected
                            ? "var(--color-perk-selected)"
                            : "var(--color-surface-elevated)"
                    }
                    stroke={
                      isConflict
                        ? "var(--color-error-muted)"
                        : isPartialRank
                          ? "var(--color-perk-partial)"
                          : isSelected
                            ? "var(--color-foreground)"
                            : "var(--color-border)"
                    }
                    strokeWidth={isConflict ? 0.14 : 0.1}
                    strokeOpacity={1}
                  />
                </g>
              );
            })}
          </>
        )}
      </svg>
    </div>
  );
}
