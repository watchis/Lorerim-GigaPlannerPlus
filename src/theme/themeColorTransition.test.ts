import { describe, expect, it } from "vitest";
import {
  themeColorMixExpression,
  toThemeCssVarName,
} from "@/theme/themeColorTransition";

describe("themeColorTransition", () => {
  it("maps theme color keys to css custom properties", () => {
    expect(toThemeCssVarName("surfaceElevated")).toBe("--color-surface-elevated");
    expect(toThemeCssVarName("accent")).toBe("--color-accent");
  });

  it("builds a single mix expression driven by --theme-mix", () => {
    const expression = themeColorMixExpression("accent");
    expect(expression).toContain("color-mix(in oklch");
    expect(expression).toContain("var(--theme-accent-from)");
    expect(expression).toContain("var(--theme-accent-to)");
    expect(expression).toContain("var(--theme-mix");
  });
});
