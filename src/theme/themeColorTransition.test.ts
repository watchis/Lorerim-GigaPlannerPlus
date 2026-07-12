import { describe, expect, it } from "vitest";
import {
  lerpColor,
  normalizeColorToHex,
  parseColor,
  rgbToHex,
} from "@/theme/colorInterpolation";
import { toThemeCssVarName } from "@/theme/themeColorTransition";

describe("colorInterpolation", () => {
  it("parses hex and rgb colors", () => {
    expect(rgbToHex(parseColor("#c9a227")!)).toBe("#c9a227");
    expect(rgbToHex(parseColor("rgb(201, 162, 39)")!)).toBe("#c9a227");
  });

  it("returns endpoints for lerpColor", () => {
    expect(lerpColor("#c9a227", "#b81c3a", 0)).toBe("#c9a227");
    expect(lerpColor("#c9a227", "#b81c3a", 1)).toBe("#b81c3a");
  });

  it("keeps werewolf gold-to-amber blends warm", () => {
    const mid = lerpColor("#c9a227", "#c9922e", 0.5);
    const rgb = parseColor(mid)!;
    expect(rgb.g).toBeGreaterThan(0.45);
    expect(rgb.r).toBeGreaterThan(0.6);
  });

  it("normalizes rgb strings to hex", () => {
    expect(normalizeColorToHex("rgb(15, 17, 23)")).toBe("#0f1117");
  });
});

describe("themeColorTransition", () => {
  it("maps theme color keys to css custom properties", () => {
    expect(toThemeCssVarName("surfaceElevated")).toBe("--color-surface-elevated");
    expect(toThemeCssVarName("accent")).toBe("--color-accent");
  });
});
