import { describe, expect, it } from "vitest";

import type { Layout } from "@/data/schemas";

import {
  canShowThreeColumnLayout,
  getThreeColumnMinWidth,
} from "@/layout/plannerLayout";

const lorerimLayout: Layout = {
  columns: [
    { width: "300px", panels: ["character-setup"] },
    { width: "1fr", panels: ["skill-trees"] },
    { width: "370px", panels: ["skill-trees-sidebar"] },
  ],
};

describe("plannerLayout", () => {
  it("requires center width to be 1.5x combined side panes", () => {
    // 300 + 370 side panes => center min 1005 => total 1707 + 32 gap
    expect(getThreeColumnMinWidth(lorerimLayout)).toBe(1707);
  });

  it("shows three columns only when the container is wide enough", () => {
    expect(canShowThreeColumnLayout(1706, lorerimLayout)).toBe(false);
    expect(canShowThreeColumnLayout(1707, lorerimLayout)).toBe(true);
  });
});
