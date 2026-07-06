import { describe, expect, it } from "vitest";

import { getSkillGridColumnCount } from "@/lib/useContainerSize";

describe("getSkillGridColumnCount", () => {
  it("uses at least two columns", () => {
    expect(getSkillGridColumnCount(200)).toBe(2);
  });

  it("scales down columns on narrow widths", () => {
    expect(getSkillGridColumnCount(240, { minCellWidth: 120 })).toBe(2);
    expect(getSkillGridColumnCount(360, { minCellWidth: 120 })).toBe(3);
    expect(getSkillGridColumnCount(480, { minCellWidth: 120 })).toBe(4);
  });

  it("caps at maxColumns", () => {
    expect(getSkillGridColumnCount(900, { minCellWidth: 100, maxColumns: 3 })).toBe(3);
  });
});
