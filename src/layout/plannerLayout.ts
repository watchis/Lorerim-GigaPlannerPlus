import { createContext, useContext } from "react";

import type { Layout } from "@/data/schemas";

const CENTER_TO_SIDES_RATIO = 1.5;
const PLANNER_COLUMN_GAP_PX = 16;

export const PlannerLayoutContext = createContext(false);

export function usePlannerThreeColumnLayout(): boolean {
  return useContext(PlannerLayoutContext);
}

function parsePxWidth(width: string): number | null {
  const trimmed = width.trim();
  if (!trimmed.endsWith("px")) return null;

  const px = Number.parseInt(trimmed, 10);
  return Number.isNaN(px) ? null : px;
}

function getDeclaredSideWidths(layout: Layout): number[] {
  if (layout.columns.length < 3) return [];

  const first = parsePxWidth(layout.columns[0].width);
  const last = parsePxWidth(layout.columns[layout.columns.length - 1].width);

  return [first, last].filter((width): width is number => width !== null);
}

export function getThreeColumnMinWidth(
  layout: Layout,
  columnGapPx = PLANNER_COLUMN_GAP_PX,
): number {
  const sideWidths = getDeclaredSideWidths(layout);
  if (sideWidths.length === 0) return Number.POSITIVE_INFINITY;

  const sideTotal = sideWidths.reduce((sum, width) => sum + width, 0);
  const gaps = columnGapPx * (layout.columns.length - 1);

  return sideTotal + sideTotal * CENTER_TO_SIDES_RATIO + gaps;
}

export function canShowThreeColumnLayout(
  containerWidth: number,
  layout: Layout,
  columnGapPx = PLANNER_COLUMN_GAP_PX,
): boolean {
  if (containerWidth <= 0) return false;
  return containerWidth >= getThreeColumnMinWidth(layout, columnGapPx);
}
