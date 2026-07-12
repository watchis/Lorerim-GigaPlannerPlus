import type { Theme } from "@/data/schemas";
import type { BuildState } from "@/engine/buildEngine";
import {
  isVampireStageId,
  SUPERNATURAL_CLAIMED_CHOICE,
  VAMPIRE_OPTION_ID,
  WEREWOLF_OPTION_ID,
} from "@/lib/supernatural";

export type SupernaturalThemeVariant = "vampire" | "werewolf";

interface SupernaturalThemeOverrides {
  colors: Partial<Record<string, string>>;
  shadows?: Partial<Record<string, string>>;
}

/**
 * Curse theme palettes use a 60-30-10 split: desaturated tinted neutrals carry
 * layout (60%), muted secondary hues add depth (30%), and a single accent family
 * drives interactive emphasis (10%). Elevation steps increase lightness ~4–6% per
 * layer; accents stay below full saturation for comfortable long-session use.
 */
export const SUPERNATURAL_THEME_OVERRIDES: Record<
  SupernaturalThemeVariant,
  SupernaturalThemeOverrides
> = {
  vampire: {
    colors: {
      background: "#121115",
      surface: "#1c1b20",
      surfaceElevated: "#26252b",
      border: "#333238",
      foreground: "#f2f0f4",
      muted: "#9a969f",
      accent: "#d4566a",
      accentMuted: "#964052",
      perkAvailable: "#75717c",
      perkSelected: "#dc6680",
      perkPartial: "#c898ff",
      perkLocked: "#141318",
      perkPrereq: "#56525e",
    },
    shadows: {
      glow: "0 0 24px rgba(212, 86, 106, 0.12)",
      panel: "0 4px 24px rgba(0, 0, 0, 0.4)",
    },
  },
  werewolf: {
    colors: {
      background: "#100e0c",
      surface: "#181715",
      surfaceElevated: "#211e1a",
      border: "#2b2824",
      foreground: "#ebe3d6",
      muted: "#877b6e",
      accent: "#c88438",
      accentMuted: "#8a5824",
      perkAvailable: "#756b60",
      perkSelected: "#d89448",
      perkPartial: "#58d868",
      perkLocked: "#0e0c0a",
      perkPrereq: "#524a42",
    },
    shadows: {
      glow: "0 0 24px rgba(200, 132, 56, 0.11)",
      panel: "0 4px 24px rgba(0, 0, 0, 0.38)",
    },
  },
};

export function getSupernaturalThemeVariant(
  state: BuildState,
): SupernaturalThemeVariant | null {
  return getSupernaturalThemeVariantFromChoices(state.characterOptionChoices);
}

export function getSupernaturalThemeVariantFromChoices(
  characterOptionChoices: BuildState["characterOptionChoices"],
): SupernaturalThemeVariant | null {
  const vampireChoice = characterOptionChoices[VAMPIRE_OPTION_ID] ?? "none";
  const werewolfChoice = characterOptionChoices[WEREWOLF_OPTION_ID] ?? "none";
  if (isVampireStageId(vampireChoice)) return "vampire";
  if (werewolfChoice === SUPERNATURAL_CLAIMED_CHOICE) return "werewolf";
  return null;
}

export function applySupernaturalThemeVariant(
  theme: Theme,
  variant: SupernaturalThemeVariant | null,
): Theme {
  if (!variant) return theme;

  const overrides = SUPERNATURAL_THEME_OVERRIDES[variant];
  const colors = { ...theme.colors };
  for (const [key, value] of Object.entries(overrides.colors)) {
    if (value !== undefined) colors[key] = value;
  }

  const shadows = { ...theme.shadows };
  if (overrides.shadows) {
    for (const [key, value] of Object.entries(overrides.shadows)) {
      if (value !== undefined) shadows[key] = value;
    }
  }

  return {
    ...theme,
    colors,
    shadows,
  };
}
