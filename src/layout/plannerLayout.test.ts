import { describe, expect, it } from "vitest";

import type { Layout } from "@/data/schemas";

import {
  computePlannerLayoutMetrics,
  estimatePlannerLayoutContainerWidth,
  getInitialPlannerLayoutMetrics,
  getSwipePanelIds,
  getThreeColumnDesignWidth,
  PICKER_SIDE_BY_SIDE_MIN_WIDTH,
  PLANNER_LAYOUT_MAX_WIDTH_PX,
  plannerLayoutMetricsEqual,
  STACKED_LAYOUT_MAX_WIDTH,
} from "@/layout/plannerLayout";

const lorerimLayout: Layout = {
  columns: [
    { width: "300px", panels: ["character-setup"] },
    { width: "1fr", panels: ["skill-trees"] },
    { width: "370px", panels: ["skill-trees-sidebar"] },
  ],
};

describe("plannerLayout", () => {
  it("uses stacked layout below the narrow-width threshold", () => {
    expect(computePlannerLayoutMetrics(STACKED_LAYOUT_MAX_WIDTH - 1, lorerimLayout).useThreeColumnLayout).toBe(
      false,
    );
  });

  it("scales side panes on a 1080p vertical monitor width", () => {
    const metrics = computePlannerLayoutMetrics(1032, lorerimLayout);

    expect(metrics.useThreeColumnLayout).toBe(true);
    expect(metrics.scale).toBeCloseTo(0.597, 2);
    expect(metrics.sideWidths).toEqual({ left: 179, right: 221 });
    expect(metrics.centerWidth).toBe(600);
    expect(metrics.centerWidth / (metrics.sideWidths!.left + metrics.sideWidths!.right)).toBeCloseTo(
      1.5,
      5,
    );
    expect(metrics.gridTemplateColumns).toBe("179px minmax(0, 1fr) 221px");
  });

  it("uses full design side widths on wide containers", () => {
    const metrics = computePlannerLayoutMetrics(1800, lorerimLayout);

    expect(metrics.useThreeColumnLayout).toBe(true);
    expect(metrics.scale).toBe(1);
    expect(metrics.sideWidths).toEqual({ left: 300, right: 370 });
    expect(metrics.centerWidth).toBe(1098);
    expect(metrics.gridTemplateColumns).toBe("300px minmax(0, 1fr) 370px");
  });

  it("reports the unscaled design width for full-size side panes", () => {
    expect(getThreeColumnDesignWidth(lorerimLayout)).toBe(1707);
  });

  it("orders swipe panels as setup, center, then skill trees", () => {
    expect(getSwipePanelIds(lorerimLayout)).toEqual([
      "character-setup",
      "skill-trees",
      "skill-trees-sidebar",
    ]);
  });

  it("returns stacked layout for non-positive container width", () => {
    const metrics = computePlannerLayoutMetrics(0, lorerimLayout);
    expect(metrics.useThreeColumnLayout).toBe(false);
    expect(metrics.centerWidth).toBe(0);
  });

  it("returns stacked layout when layout has fewer than three columns", () => {
    const twoColumn: Layout = {
      columns: [
        { width: "300px", panels: ["character-setup"] },
        { width: "1fr", panels: ["skill-trees"] },
      ],
    };
    expect(computePlannerLayoutMetrics(1200, twoColumn).useThreeColumnLayout).toBe(false);
  });

  it("uses three-column layout once inner width clears the stacked threshold", () => {
    const metrics = computePlannerLayoutMetrics(STACKED_LAYOUT_MAX_WIDTH + 32, lorerimLayout);
    expect(metrics.useThreeColumnLayout).toBe(true);
    expect(metrics.centerWidth).toBeGreaterThan(0);
  });

  it("filters swipe panels to those present in the layout", () => {
    const partial: Layout = {
      columns: [
        { width: "300px", panels: ["character-setup"] },
        { width: "1fr", panels: ["skill-trees"] },
        { width: "370px", panels: ["derived-stats"] },
      ],
    };
    expect(getSwipePanelIds(partial)).toEqual(["character-setup", "skill-trees"]);
  });

  it("exports picker compact threshold constant", () => {
    expect(PICKER_SIDE_BY_SIDE_MIN_WIDTH).toBe(520);
  });

  it("estimates inner layout width from viewport size and padding", () => {
    expect(estimatePlannerLayoutContainerWidth(500)).toBe(484);
    expect(estimatePlannerLayoutContainerWidth(800)).toBe(768);
    expect(estimatePlannerLayoutContainerWidth(1400)).toBe(1352);
    expect(estimatePlannerLayoutContainerWidth(PLANNER_LAYOUT_MAX_WIDTH_PX + 200)).toBe(
      PLANNER_LAYOUT_MAX_WIDTH_PX - 48,
    );
  });

  it("uses three-column layout on first paint for wide viewports", () => {
    const metrics = getInitialPlannerLayoutMetrics(lorerimLayout);
    expect(metrics.useThreeColumnLayout).toBe(
      estimatePlannerLayoutContainerWidth() > STACKED_LAYOUT_MAX_WIDTH,
    );
  });

  it("compares planner layout metrics by value", () => {
    const left = computePlannerLayoutMetrics(1800, lorerimLayout);
    const right = computePlannerLayoutMetrics(1800, lorerimLayout);
    const narrow = computePlannerLayoutMetrics(600, lorerimLayout);

    expect(plannerLayoutMetricsEqual(left, right)).toBe(true);
    expect(plannerLayoutMetricsEqual(left, narrow)).toBe(false);
  });
});
