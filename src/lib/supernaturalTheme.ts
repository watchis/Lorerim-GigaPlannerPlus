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

/** Skyrim-inspired palettes: cold steel-gray with crimson accents (vampire), warm beige with amber/rust text (werewolf). */
export const SUPERNATURAL_THEME_OVERRIDES: Record<
  SupernaturalThemeVariant,
  SupernaturalThemeOverrides
> = {
  vampire: {
    colors: {
      background: "#1b1e24",
      surface: "#242830",
      surfaceElevated: "#2d333c",
      border: "#3c4450",
      foreground: "#e6eaef",
      muted: "#9099a6",
      accent: "#b81c3a",
      accentMuted: "#8a2440",
      health: "#a02040",
      perkAvailable: "#6e7888",
      perkSelected: "#d42a4a",
      perkPartial: "#8fa3b8",
      perkLocked: "#2a3038",
      perkPrereq: "#56606e",
    },
    shadows: {
      glow: "0 0 24px rgba(184, 28, 58, 0.14)",
      panel: "0 4px 24px rgba(24, 28, 36, 0.28)",
    },
  },
  werewolf: {
    colors: {
      background: "#25221d",
      surface: "#2f2b26",
      surfaceElevated: "#3a3530",
      border: "#48433c",
      foreground: "#e8c9a8",
      muted: "#b89572",
      accent: "#c97a2e",
      accentMuted: "#9a5c22",
      stamina: "#8a6a3a",
      perkAvailable: "#8a7d6a",
      perkSelected: "#c97a2e",
      perkPartial: "#d4a05a",
      perkLocked: "#35302a",
      perkPrereq: "#6e6458",
    },
    shadows: {
      glow: "0 0 24px rgba(201, 122, 46, 0.14)",
      panel: "0 4px 24px rgba(36, 28, 20, 0.28)",
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
