import type { Theme } from "@/data/schemas";
import type { BuildState } from "@/engine/buildEngine";
import {
  isLichChoiceActive,
  isVampireStageId,
  LICH_OPTION_ID,
  SUPERNATURAL_CLAIMED_CHOICE,
  VAMPIRE_OPTION_ID,
  WEREWOLF_OPTION_ID,
} from "@/lib/supernatural";

export type SupernaturalThemeVariant = "vampire" | "werewolf" | "lich";

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
      perkAvailable: "#c0bac6",
      perkMiniUnselected: "#75717c",
      perkSelected: "#dc6680",
      perkPartial: "#b371ff",
      perkLocked: "#524e58",
      perkPrereq: "#9d97a6",
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
      perkAvailable: "#b8a48c",
      perkSelected: "#d89448",
      perkPartial: "#58d868",
      perkLocked: "#4a433c",
      perkPrereq: "#9a8b7a",
    },
    shadows: {
      glow: "0 0 24px rgba(200, 132, 56, 0.11)",
      panel: "0 4px 24px rgba(0, 0, 0, 0.38)",
    },
  },
  lich: {
    colors: {
      background: "#0e1214",
      surface: "#161b1e",
      surfaceElevated: "#1e2529",
      border: "#2a3338",
      foreground: "#e8eef0",
      muted: "#7f8d92",
      accent: "#4db8a8",
      accentMuted: "#2f7a70",
      perkAvailable: "#a8b8bc",
      perkMiniUnselected: "#6a787c",
      perkSelected: "#5cc4b4",
      perkPartial: "#d46a88",
      perkLocked: "#455055",
      perkPrereq: "#8a989c",
    },
    shadows: {
      glow: "0 0 24px rgba(77, 184, 168, 0.12)",
      panel: "0 4px 24px rgba(0, 0, 0, 0.42)",
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
  const lichChoice = characterOptionChoices[LICH_OPTION_ID] ?? "none";
  if (isVampireStageId(vampireChoice)) return "vampire";
  if (werewolfChoice === SUPERNATURAL_CLAIMED_CHOICE) return "werewolf";
  if (isLichChoiceActive(lichChoice)) return "lich";
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
