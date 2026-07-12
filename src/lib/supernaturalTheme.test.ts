import { describe, expect, it } from "vitest";
import themeJson from "../../data/ui/theme.json";
import { parseColor } from "@/theme/colorInterpolation";
import {
  applySupernaturalThemeVariant,
  getSupernaturalThemeVariant,
  getSupernaturalThemeVariantFromChoices,
  SUPERNATURAL_THEME_OVERRIDES,
} from "@/lib/supernaturalTheme";
import { SUPERNATURAL_CLAIMED_CHOICE, VAMPIRE_OPTION_ID, WEREWOLF_OPTION_ID } from "@/lib/supernatural";
import { createTestBuildState } from "@/test/helpers";
import type { Theme } from "@/data/schemas";

const baseTheme = themeJson as Theme;

function relativeLuminance(hex: string): number {
  const rgb = parseColor(hex);
  if (!rgb) return 0;
  return 0.2126 * rgb.r + 0.7152 * rgb.g + 0.0722 * rgb.b;
}

describe("supernaturalTheme", () => {
  it("returns vampire variant when vampire option is active", () => {
    const state = createTestBuildState({
      characterOptionChoices: { [VAMPIRE_OPTION_ID]: "stage-4" },
    });

    expect(getSupernaturalThemeVariant(state)).toBe("vampire");
  });

  it("returns werewolf variant when werewolf option is active", () => {
    const state = createTestBuildState({
      characterOptionChoices: { [WEREWOLF_OPTION_ID]: SUPERNATURAL_CLAIMED_CHOICE },
    });

    expect(getSupernaturalThemeVariant(state)).toBe("werewolf");
  });

  it("returns null when no supernatural curse is active", () => {
    expect(getSupernaturalThemeVariant(createTestBuildState())).toBeNull();
    expect(getSupernaturalThemeVariantFromChoices({})).toBeNull();
  });

  it("derives theme variant from character option choices only", () => {
    expect(
      getSupernaturalThemeVariantFromChoices({
        [VAMPIRE_OPTION_ID]: "stage-2",
        [WEREWOLF_OPTION_ID]: "none",
      }),
    ).toBe("vampire");
    expect(
      getSupernaturalThemeVariantFromChoices({
        [VAMPIRE_OPTION_ID]: "none",
        [WEREWOLF_OPTION_ID]: SUPERNATURAL_CLAIMED_CHOICE,
      }),
    ).toBe("werewolf");
  });

  it("prefers vampire when both curses are set (reconcile should clear one)", () => {
    const state = createTestBuildState({
      characterOptionChoices: {
        [VAMPIRE_OPTION_ID]: "stage-4",
        [WEREWOLF_OPTION_ID]: SUPERNATURAL_CLAIMED_CHOICE,
      },
    });

    expect(getSupernaturalThemeVariant(state)).toBe("vampire");
  });

  it("applies Skyrim-inspired vampire palette overrides", () => {
    const themed = applySupernaturalThemeVariant(baseTheme, "vampire");

    expect(themed.colors.accent).toBe(SUPERNATURAL_THEME_OVERRIDES.vampire.colors.accent);
    expect(themed.colors.background).toBe(SUPERNATURAL_THEME_OVERRIDES.vampire.colors.background);
    expect(themed.shadows.glow).toBe(SUPERNATURAL_THEME_OVERRIDES.vampire.shadows?.glow);
    expect(themed.fonts.heading).toBe(baseTheme.fonts.heading);
  });

  it("applies Skyrim-inspired werewolf palette overrides", () => {
    const themed = applySupernaturalThemeVariant(baseTheme, "werewolf");

    expect(themed.colors.accent).toBe(SUPERNATURAL_THEME_OVERRIDES.werewolf.colors.accent);
    expect(themed.colors.stamina).toBe(SUPERNATURAL_THEME_OVERRIDES.werewolf.colors.stamina);
    expect(themed.shadows.glow).toBe(SUPERNATURAL_THEME_OVERRIDES.werewolf.shadows?.glow);
  });

  it("returns the base theme when variant is null", () => {
    expect(applySupernaturalThemeVariant(baseTheme, null)).toEqual(baseTheme);
  });

  it("uses curse backgrounds near base-theme brightness for readability", () => {
    const baseBackgroundLuminance = relativeLuminance(baseTheme.colors.background);

    for (const variant of ["vampire", "werewolf"] as const) {
      const themed = applySupernaturalThemeVariant(baseTheme, variant);
      const backgroundLuminance = relativeLuminance(themed.colors.background);
      const surfaceLuminance = relativeLuminance(themed.colors.surface);

      expect(backgroundLuminance).toBeGreaterThanOrEqual(baseBackgroundLuminance * 0.9);
      expect(surfaceLuminance).toBeGreaterThanOrEqual(relativeLuminance(baseTheme.colors.surface) * 0.9);
    }
  });

  it("uses steel-gray vampire surfaces and warm amber/rust werewolf foreground", () => {
    const vampire = applySupernaturalThemeVariant(baseTheme, "vampire");
    const werewolf = applySupernaturalThemeVariant(baseTheme, "werewolf");

    expect(vampire.colors.background).toBe("#1b1e24");
    expect(vampire.colors.muted).toBe("#9099a6");

    expect(werewolf.colors.background).toBe("#25221d");
    expect(werewolf.colors.foreground).toBe("#e8c9a8");
    expect(werewolf.colors.muted).toBe("#b89572");
    expect(werewolf.colors.accent).toBe("#c97a2e");

    const vampireRgb = parseColor(vampire.colors.foreground)!;
    const werewolfRgb = parseColor(werewolf.colors.foreground)!;
    expect(werewolfRgb.r).toBeGreaterThan(werewolfRgb.b);
    expect(vampireRgb.b).toBeGreaterThan(werewolfRgb.b);
    expect(werewolfRgb.r - werewolfRgb.b).toBeGreaterThan(vampireRgb.r - vampireRgb.b);
  });
});
