import { createContext, useContext } from "react";

import type { Layout } from "@/data/schemas";

const CENTER_TO_SIDES_RATIO = 1.5;
export const PLANNER_COLUMN_GAP_PX = 16;
/** Below this inner layout width, panes stack vertically (phones / narrow portrait). */
export const STACKED_LAYOUT_MAX_WIDTH = 720;
/** Side-by-side picker layout needs at least this much center column width. */
export const PICKER_SIDE_BY_SIDE_MIN_WIDTH = 520;

/** Stacked mobile order: skill navigation first, workspace second, setup last. */
export const STACKED_PANEL_ORDER = [
  "skill-trees-sidebar",
  "skill-trees",
  "character-setup",
] as const;

export interface PlannerLayoutState {
  useThreeColumnLayout: boolean;
  scale: number;
  gridTemplateColumns: string | null;
  sideWidths: { left: number; right: number } | null;
  centerWidth: number;
}

export const PlannerLayoutContext = createContext<PlannerLayoutState>({
  useThreeColumnLayout: false,
  scale: 1,
  gridTemplateColumns: null,
  sideWidths: null,
  centerWidth: 0,
});

export function usePlannerLayoutState(): PlannerLayoutState {
  return useContext(PlannerLayoutContext);
}

export function usePlannerThreeColumnLayout(): boolean {
  return useContext(PlannerLayoutContext).useThreeColumnLayout;
}

export function usePlannerLayoutScale(): number {
  return useContext(PlannerLayoutContext).scale;
}

export function usePlannerSideWidths(): { left: number; right: number } | null {
  return useContext(PlannerLayoutContext).sideWidths;
}

export function usePlannerStackedLayout(): boolean {
  return !useContext(PlannerLayoutContext).useThreeColumnLayout;
}

export function usePlannerCompactUI(): boolean {
  const state = useContext(PlannerLayoutContext);
  return !state.useThreeColumnLayout || state.centerWidth < PICKER_SIDE_BY_SIDE_MIN_WIDTH;
}

export function getStackedPanelIds(layout: Layout): string[] {
  const panelIds = new Set(layout.columns.flatMap((column) => column.panels));
  return STACKED_PANEL_ORDER.filter((panelId) => panelIds.has(panelId));
}

function parsePxWidth(width: string): number | null {
  const trimmed = width.trim();
  if (!trimmed.endsWith("px")) return null;

  const px = Number.parseInt(trimmed, 10);
  return Number.isNaN(px) ? null : px;
}

function getSideDesignWidths(layout: Layout): { left: number; right: number } | null {
  if (layout.columns.length < 3) return null;

  const left = parsePxWidth(layout.columns[0].width);
  const right = parsePxWidth(layout.columns[layout.columns.length - 1].width);

  if (left === null || right === null) return null;
  return { left, right };
}

export interface PlannerLayoutMetrics extends PlannerLayoutState {
  sideWidths: { left: number; right: number } | null;
  centerWidth: number;
}

export function computePlannerLayoutMetrics(
  containerWidth: number,
  layout: Layout,
  columnGapPx = PLANNER_COLUMN_GAP_PX,
): PlannerLayoutMetrics {
  const stacked: PlannerLayoutMetrics = {
    useThreeColumnLayout: false,
    scale: 1,
    gridTemplateColumns: null,
    sideWidths: null,
    centerWidth: 0,
  };

  if (containerWidth <= 0) return stacked;

  const sides = getSideDesignWidths(layout);
  if (!sides) return stacked;

  const gaps = columnGapPx * (layout.columns.length - 1);
  const available = containerWidth - gaps;

  if (available < STACKED_LAYOUT_MAX_WIDTH) return stacked;

  const designSideTotal = sides.left + sides.right;
  const scaledSideTotal = available / (1 + CENTER_TO_SIDES_RATIO);
  const scale = Math.min(1, scaledSideTotal / designSideTotal);
  const leftWidth = Math.round(sides.left * scale);
  const rightWidth = Math.round(sides.right * scale);
  const centerWidth = available - leftWidth - rightWidth;

  if (centerWidth <= 0) return stacked;

  return {
    useThreeColumnLayout: true,
    scale,
    gridTemplateColumns: `${leftWidth}px minmax(0, 1fr) ${rightWidth}px`,
    sideWidths: { left: leftWidth, right: rightWidth },
    centerWidth,
  };
}

/** Full design width where side panes reach their declared sizes at 1.5x center ratio. */
export function getThreeColumnDesignWidth(
  layout: Layout,
  columnGapPx = PLANNER_COLUMN_GAP_PX,
): number {
  const sides = getSideDesignWidths(layout);
  if (!sides) return Number.POSITIVE_INFINITY;

  const designSideTotal = sides.left + sides.right;
  const gaps = columnGapPx * (layout.columns.length - 1);

  return designSideTotal + designSideTotal * CENTER_TO_SIDES_RATIO + gaps;
}
