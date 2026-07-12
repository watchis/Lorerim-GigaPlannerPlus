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
    expect(themed.shadows.glow).toBe(SUPERNATURAL_THEME_OVERRIDES.werewolf.shadows?.glow);
  });

  it("keeps health, magicka, and stamina colors from the base theme", () => {
    for (const variant of ["vampire", "werewolf"] as const) {
      const themed = applySupernaturalThemeVariant(baseTheme, variant);

      expect(themed.colors.health).toBe(baseTheme.colors.health);
      expect(themed.colors.magicka).toBe(baseTheme.colors.magicka);
      expect(themed.colors.stamina).toBe(baseTheme.colors.stamina);
    }
  });

  it("returns the base theme when variant is null", () => {
    expect(applySupernaturalThemeVariant(baseTheme, null)).toEqual(baseTheme);
  });

  it("keeps readable surface elevation for both curse themes", () => {
    for (const variant of ["vampire", "werewolf"] as const) {
      const themed = applySupernaturalThemeVariant(baseTheme, variant);

      expect(relativeLuminance(themed.colors.surface)).toBeGreaterThan(
        relativeLuminance(themed.colors.background),
      );
      expect(relativeLuminance(themed.colors.surfaceElevated)).toBeGreaterThan(
        relativeLuminance(themed.colors.surface),
      );
    }

    const vampire = applySupernaturalThemeVariant(baseTheme, "vampire");
    expect(relativeLuminance(vampire.colors.background)).toBeGreaterThanOrEqual(
      relativeLuminance(baseTheme.colors.background) * 0.85,
    );
  });

  it("uses neutral gray/black with red accents for vampire", () => {
    const vampire = applySupernaturalThemeVariant(baseTheme, "vampire");
    const accent = parseColor(vampire.colors.accent)!;
    const partial = parseColor(vampire.colors.perkPartial)!;
    const background = parseColor(vampire.colors.background)!;
    const brightRed = parseColor("#dc2626")!;

    expect(colorChroma(vampire.colors.background)).toBeLessThan(0.04);
    expect(colorChroma(vampire.colors.surface)).toBeLessThan(0.04);
    expect(accent.r).toBeGreaterThan(accent.g);
    expect(accent.r).toBeGreaterThan(accent.b);
    expect(accent.r).toBeLessThan(brightRed.r);
    expect(partial.b).toBeGreaterThan(partial.r);
    expect(partial.b).toBeGreaterThan(partial.g);
    expect(colorChroma(vampire.colors.perkPartial)).toBeGreaterThan(0.25);
    expect(background.r).toBeCloseTo(background.g, 1);
    expect(background.g).toBeCloseTo(background.b, 1);
  });

  it("uses warm foreground and rust accents with neutral dark werewolf surfaces", () => {
    const werewolf = applySupernaturalThemeVariant(baseTheme, "werewolf");
    const background = parseColor(werewolf.colors.background)!;
    const foreground = parseColor(werewolf.colors.foreground)!;
    const accent = parseColor(werewolf.colors.accent)!;
    const surface = parseColor(werewolf.colors.surface)!;
    const surfaceStep =
      relativeLuminance(werewolf.colors.surface) - relativeLuminance(werewolf.colors.background);

    expect(foreground.r).toBeGreaterThan(foreground.b);
    expect(accent.r).toBeGreaterThan(accent.b);
    expect(accent.g).toBeGreaterThan(accent.b);
    expect(colorChroma(werewolf.colors.surface)).toBeLessThan(0.02);
    expect(colorChroma(werewolf.colors.background)).toBeLessThan(0.02);
    expect(surface.r).toBeCloseTo(surface.g, 1);
    expect(surface.g).toBeCloseTo(surface.b, 1);
    expect(surfaceStep).toBeLessThan(0.035);
    expect(relativeLuminance(werewolf.colors.foreground)).toBeGreaterThan(
      relativeLuminance(werewolf.colors.background) * 2,
    );
    expect(relativeLuminance(werewolf.colors.surface)).toBeGreaterThan(
      relativeLuminance("#131211"),
    );
  });

  it("uses brighter unselected perk borders on vampire theme", () => {
    const vampire = applySupernaturalThemeVariant(baseTheme, "vampire");
    const surface = parseColor(vampire.colors.surfaceElevated)!;
    const available = parseColor(vampire.colors.perkAvailable)!;
    const prereq = parseColor(vampire.colors.perkPrereq)!;
    const locked = parseColor(vampire.colors.perkLocked)!;
    const previousAvailable = "#75717c";
    const previousPrereq = "#56525e";
    const previousLocked = "#141318";

    expect(relativeLuminance(vampire.colors.perkAvailable)).toBeGreaterThan(
      relativeLuminance(previousAvailable),
    );
    expect(relativeLuminance(vampire.colors.perkPrereq)).toBeGreaterThan(
      relativeLuminance(previousPrereq),
    );
    expect(relativeLuminance(vampire.colors.perkLocked)).toBeGreaterThan(
      relativeLuminance(previousLocked),
    );

    const borderContrast = (channel: { r: number; g: number; b: number }) =>
      Math.max(channel.r, channel.g, channel.b) - Math.min(surface.r, surface.g, surface.b);

    expect(borderContrast(available)).toBeGreaterThan(0.18);
    expect(borderContrast(prereq)).toBeGreaterThan(0.12);
    expect(borderContrast(locked)).toBeGreaterThan(0.08);
  });

  it("keeps vampire mini previews dimmer than full-tree available borders", () => {
    const vampire = applySupernaturalThemeVariant(baseTheme, "vampire");

    expect(vampire.colors.perkMiniUnselected).toBe("#75717c");
    expect(relativeLuminance(vampire.colors.perkMiniUnselected!)).toBeLessThan(
      relativeLuminance(vampire.colors.perkAvailable),
    );
  });

  it("uses brighter unselected perk borders on werewolf theme", () => {
    const werewolf = applySupernaturalThemeVariant(baseTheme, "werewolf");
    const surface = parseColor(werewolf.colors.surfaceElevated)!;
    const available = parseColor(werewolf.colors.perkAvailable)!;
    const prereq = parseColor(werewolf.colors.perkPrereq)!;
    const locked = parseColor(werewolf.colors.perkLocked)!;
    const previousAvailable = "#756b60";
    const previousPrereq = "#524a42";
    const previousLocked = "#0e0c0a";

    expect(relativeLuminance(werewolf.colors.perkAvailable)).toBeGreaterThan(
      relativeLuminance(previousAvailable),
    );
    expect(relativeLuminance(werewolf.colors.perkPrereq)).toBeGreaterThan(
      relativeLuminance(previousPrereq),
    );
    expect(relativeLuminance(werewolf.colors.perkLocked)).toBeGreaterThan(
      relativeLuminance(previousLocked),
    );

    const borderContrast = (channel: { r: number; g: number; b: number }) =>
      Math.max(channel.r, channel.g, channel.b) - Math.min(surface.r, surface.g, surface.b);

    expect(borderContrast(available)).toBeGreaterThan(0.18);
    expect(borderContrast(prereq)).toBeGreaterThan(0.12);
    expect(borderContrast(locked)).toBeGreaterThan(0.08);
  });

  it("uses a vibrant green hue for werewolf partial nodes", () => {
    const werewolf = applySupernaturalThemeVariant(baseTheme, "werewolf");
    const partial = parseColor(werewolf.colors.perkPartial)!;
    const selected = parseColor(werewolf.colors.perkSelected)!;

    expect(partial.g).toBeGreaterThan(partial.r);
    expect(partial.g).toBeGreaterThan(partial.b);
    expect(selected.r).toBeGreaterThan(selected.b);
    expect(colorChroma(werewolf.colors.perkPartial)).toBeGreaterThan(0.2);
  });
});
