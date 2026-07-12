import { describe, expect, it } from "vitest";
import themeJson from "../../data/ui/theme.json";
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
});
