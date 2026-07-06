import { describe, expect, it } from "vitest";

import type { Layout } from "@/data/schemas";

import {
  computePlannerLayoutMetrics,
  getStackedPanelIds,
  getThreeColumnDesignWidth,
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

  it("orders stacked panels with skill navigation first", () => {
    expect(getStackedPanelIds(lorerimLayout)).toEqual([
      "skill-trees-sidebar",
      "skill-trees",
      "character-setup",
    ]);
  });
});
