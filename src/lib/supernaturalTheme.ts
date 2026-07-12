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

/** Skyrim-inspired palettes: Volkihar blood-moon crimson (vampire), wild hunt amber-forest (werewolf). */
export const SUPERNATURAL_THEME_OVERRIDES: Record<
  SupernaturalThemeVariant,
  SupernaturalThemeOverrides
> = {
  vampire: {
    colors: {
      background: "#181520",
      surface: "#221e2c",
      surfaceElevated: "#2c2838",
      border: "#3b3548",
      foreground: "#ebe6ef",
      muted: "#aea3b5",
      accent: "#b81c3a",
      accentMuted: "#8a2440",
      health: "#a02040",
      perkAvailable: "#726880",
      perkSelected: "#d42a4a",
      perkPartial: "#b890c8",
      perkLocked: "#2e2a38",
      perkPrereq: "#5c5468",
    },
    shadows: {
      glow: "0 0 24px rgba(184, 28, 58, 0.14)",
      panel: "0 4px 24px rgba(40, 8, 24, 0.28)",
    },
  },
  werewolf: {
    colors: {
      background: "#18160f",
      surface: "#221f18",
      surfaceElevated: "#2c2820",
      border: "#3b362c",
      foreground: "#eceae6",
      muted: "#a59d90",
      accent: "#c9922e",
      accentMuted: "#8a6820",
      stamina: "#6b5a38",
      perkAvailable: "#7a7366",
      perkSelected: "#c9922e",
      perkPartial: "#b89850",
      perkLocked: "#2e2b24",
      perkPrereq: "#5c5648",
    },
    shadows: {
      glow: "0 0 24px rgba(201, 146, 46, 0.14)",
      panel: "0 4px 24px rgba(24, 18, 10, 0.28)",
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
