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

function colorChroma(hex: string): number {
  const rgb = parseColor(hex);
  if (!rgb) return 0;
  const max = Math.max(rgb.r, rgb.g, rgb.b);
  const min = Math.min(rgb.r, rgb.g, rgb.b);
  return max - min;
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

  it("applies vampire palette overrides", () => {
    const themed = applySupernaturalThemeVariant(baseTheme, "vampire");

    expect(themed.colors.accent).toBe(SUPERNATURAL_THEME_OVERRIDES.vampire.colors.accent);
    expect(themed.colors.background).toBe(SUPERNATURAL_THEME_OVERRIDES.vampire.colors.background);
    expect(themed.shadows.glow).toBe(SUPERNATURAL_THEME_OVERRIDES.vampire.shadows?.glow);
    expect(themed.fonts.heading).toBe(baseTheme.fonts.heading);
  });

  it("applies werewolf palette overrides", () => {
    const themed = applySupernaturalThemeVariant(baseTheme, "werewolf");

    expect(themed.colors.accent).toBe(SUPERNATURAL_THEME_OVERRIDES.werewolf.colors.accent);
    expect(themed.colors.stamina).toBe(SUPERNATURAL_THEME_OVERRIDES.werewolf.colors.stamina);
    expect(themed.shadows.glow).toBe(SUPERNATURAL_THEME_OVERRIDES.werewolf.shadows?.glow);
  });

  it("returns the base theme when variant is null", () => {
    expect(applySupernaturalThemeVariant(baseTheme, null)).toEqual(baseTheme);
  });

  it("keeps readable surface elevation for both curse themes", () => {
    const baseBackgroundLuminance = relativeLuminance(baseTheme.colors.background);
    const baseSurfaceLuminance = relativeLuminance(baseTheme.colors.surface);

    for (const variant of ["vampire", "werewolf"] as const) {
      const themed = applySupernaturalThemeVariant(baseTheme, variant);

      expect(relativeLuminance(themed.colors.background)).toBeGreaterThanOrEqual(
        baseBackgroundLuminance * 0.85,
      );
      expect(relativeLuminance(themed.colors.surface)).toBeGreaterThan(
        relativeLuminance(themed.colors.background),
      );
      expect(relativeLuminance(themed.colors.surfaceElevated)).toBeGreaterThan(
        relativeLuminance(themed.colors.surface),
      );
      expect(relativeLuminance(themed.colors.surface)).toBeGreaterThanOrEqual(
        baseSurfaceLuminance * 0.85,
      );
    }
  });

  it("uses neutral gray/black with red accents for vampire", () => {
    const vampire = applySupernaturalThemeVariant(baseTheme, "vampire");
    const accent = parseColor(vampire.colors.accent)!;
    const background = parseColor(vampire.colors.background)!;

    expect(colorChroma(vampire.colors.background)).toBeLessThan(0.04);
    expect(colorChroma(vampire.colors.surface)).toBeLessThan(0.04);
    expect(accent.r).toBeGreaterThan(accent.g);
    expect(accent.r).toBeGreaterThan(accent.b);
    expect(background.r).toBeCloseTo(background.g, 1);
    expect(background.g).toBeCloseTo(background.b, 1);
  });

  it("uses beige-to-rust spectrum for werewolf", () => {
    const werewolf = applySupernaturalThemeVariant(baseTheme, "werewolf");
    const background = parseColor(werewolf.colors.background)!;
    const foreground = parseColor(werewolf.colors.foreground)!;
    const accent = parseColor(werewolf.colors.accent)!;

    expect(background.r).toBeGreaterThan(background.b);
    expect(foreground.r).toBeGreaterThan(foreground.b);
    expect(accent.r).toBeGreaterThan(accent.b);
    expect(accent.g).toBeGreaterThan(accent.b);
    expect(relativeLuminance(werewolf.colors.foreground)).toBeGreaterThan(
      relativeLuminance(werewolf.colors.background) * 2,
    );
  });
});
