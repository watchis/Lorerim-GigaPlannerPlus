import { useMemo } from "react";
import type { PerkTree } from "@/data/schemas";
import { cn } from "@/lib/utils";
import { computePerkTreeEdges, getPerkGridCenter, getPerkTreeCompactViewBox, getVisiblePerksForTree } from "@/lib/perkTreeGrid";
import { useBuildStore } from "@/store/buildStore";

interface PerkTreeMiniViewProps {
  tree: PerkTree;
  className?: string;
  compact?: boolean;
}

const COMPACT_NODE_RADIUS = 0.5;
const COMPACT_NODE_RADIUS_UNSELECTED = 0.29;
const COMPACT_HALO_EXTRA = 0.13;
const COMPACT_NODE_STROKE = 0.15;
const COMPACT_EDGE_STROKE = 0.1;
const COMPACT_EDGE_STROKE_ACTIVE = 0.19;

const COMPACT_UNSELECTED_FILL_OPACITY = 0.44;
const COMPACT_UNSELECTED_STROKE_OPACITY = 0.56;
const COMPACT_INACTIVE_EDGE_OPACITY = 0.4;
const COMPACT_ACTIVE_EDGE_OPACITY = 1;
const COMPACT_HALO_OPACITY = 0.68;
const COMPACT_VIEWBOX_PADDING = 1;
const COMPACT_VIEWBOX_ASPECT_PAD = 1.32;

function compactNodeExtent(): number {
  return (
    COMPACT_NODE_RADIUS +
    COMPACT_HALO_EXTRA +
    COMPACT_NODE_STROKE / 2 +
    COMPACT_EDGE_STROKE / 2 +
    0.2
  );
}

export function PerkTreeMiniView({ tree, className, compact = false }: PerkTreeMiniViewProps) {
  const selectedPerkIds = useBuildStore((s) => s.build.selectedPerkIds);
  const { width, height } = tree.grid;

  const edges = useMemo(
    () => computePerkTreeEdges(tree, selectedPerkIds),
    [tree, selectedPerkIds],
  );

  const visiblePerks = useMemo(
    () => getVisiblePerksForTree(tree, selectedPerkIds),
    [tree, selectedPerkIds],
  );

  const viewBox = useMemo(() => {
    if (!compact) {
      return `0 0 ${width} ${height}`;
    }
    return getPerkTreeCompactViewBox(
      tree,
      compactNodeExtent(),
      COMPACT_VIEWBOX_PADDING,
      COMPACT_VIEWBOX_ASPECT_PAD,
    );
  }, [compact, tree, width, height]);

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
        {compact ? (
          <>
            {edges
              .filter((edge) => !edge.active)
              .map((edge, i) => (
                <line
                  key={`edge-inactive-${i}`}
                  x1={edge.x1}
                  y1={edge.y1}
                  x2={edge.x2}
                  y2={edge.y2}
                  stroke="var(--color-foreground)"
                  strokeWidth={COMPACT_EDGE_STROKE}
                  strokeOpacity={COMPACT_INACTIVE_EDGE_OPACITY}
                  strokeLinecap="round"
                />
              ))}
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
                    fill="var(--color-muted)"
                    fillOpacity={COMPACT_UNSELECTED_FILL_OPACITY}
                    stroke="var(--color-muted)"
                    strokeWidth={0.1}
                    strokeOpacity={COMPACT_UNSELECTED_STROKE_OPACITY}
                  />
                );
              })}
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
            {visiblePerks
              .filter((perk) => selectedPerkIds.includes(perk.id))
              .map((perk) => {
                const center = getPerkGridCenter(perk.position);
                return (
                  <g key={perk.id}>
                    <circle
                      cx={center.x}
                      cy={center.y}
                      r={nodeRadius + COMPACT_HALO_EXTRA + 0.07}
                      fill="var(--color-accent)"
                      fillOpacity={COMPACT_HALO_OPACITY * 0.4}
                    />
                    <circle
                      cx={center.x}
                      cy={center.y}
                      r={nodeRadius + COMPACT_HALO_EXTRA}
                      fill="var(--color-accent)"
                      fillOpacity={COMPACT_HALO_OPACITY}
                    />
                    <circle
                      cx={center.x}
                      cy={center.y}
                      r={nodeRadius}
                      fill="var(--color-perk-selected)"
                      stroke="var(--color-foreground)"
                      strokeWidth={COMPACT_NODE_STROKE}
                    />
                    <circle
                      cx={center.x}
                      cy={center.y}
                      r={nodeRadius * 0.24}
                      fill="var(--color-foreground)"
                      fillOpacity={0.9}
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
                strokeOpacity={edge.active ? 0.85 : 0.35}
              />
            ))}
            {visiblePerks.map((perk) => {
              const isSelected = selectedPerkIds.includes(perk.id);
              const center = getPerkGridCenter(perk.position);

              return (
                <circle
                  key={perk.id}
                  cx={center.x}
                  cy={center.y}
                  r={isSelected ? nodeRadius : nodeRadiusUnselected}
                  fill={isSelected ? "var(--color-perk-selected)" : "var(--color-surface-elevated)"}
                  stroke={isSelected ? "var(--color-foreground)" : "var(--color-border)"}
                  strokeWidth={0.1}
                  strokeOpacity={1}
                />
              );
            })}
          </>
        )}
      </svg>
    </div>
  );
}
