import { describe, expect, it } from "vitest";
import { lerpThemeColor, toThemeCssVarName } from "@/theme/animateThemeColors";

describe("animateThemeColors", () => {
  it("maps theme color keys to css custom properties", () => {
    expect(toThemeCssVarName("surfaceElevated")).toBe("--color-surface-elevated");
    expect(toThemeCssVarName("accent")).toBe("--color-accent");
  });

  it("returns endpoints unchanged for lerpThemeColor", () => {
    expect(lerpThemeColor("#c9a227", "#b81c3a", 0)).toBe("#c9a227");
    expect(lerpThemeColor("#c9a227", "#b81c3a", 1)).toBe("#b81c3a");
  });

  it("uses oklch color-mix for midpoints instead of sRGB snaps", () => {
    const mid = lerpThemeColor("#c9a227", "#b81c3a", 0.5);
    expect(mid).toContain("color-mix(in oklch");
    expect(mid).toContain("#c9a227");
    expect(mid).toContain("#b81c3a");
  });
});
