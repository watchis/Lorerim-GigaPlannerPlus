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
      background: "#0e0d11",
      surface: "#16141c",
      surfaceElevated: "#211e28",
      border: "#332a3a",
      foreground: "#ebe6ef",
      muted: "#a89aad",
      accent: "#b81c3a",
      accentMuted: "#7a1830",
      health: "#a02040",
      perkAvailable: "#645a72",
      perkSelected: "#d42a4a",
      perkPartial: "#b890c8",
      perkLocked: "#221e28",
      perkPrereq: "#524860",
    },
    shadows: {
      glow: "0 0 24px rgba(184, 28, 58, 0.12)",
      panel: "0 4px 28px rgba(40, 8, 24, 0.35)",
    },
  },
  werewolf: {
    colors: {
      background: "#0f0e0c",
      surface: "#161514",
      surfaceElevated: "#201e1b",
      border: "#35302a",
      foreground: "#eceae6",
      muted: "#9a9488",
      accent: "#c9922e",
      accentMuted: "#7a5c18",
      stamina: "#6b5a38",
      perkAvailable: "#6a6458",
      perkSelected: "#c9922e",
      perkPartial: "#b89850",
      perkLocked: "#1e1c19",
      perkPrereq: "#524c44",
    },
    shadows: {
      glow: "0 0 24px rgba(201, 146, 46, 0.12)",
      panel: "0 4px 28px rgba(24, 18, 10, 0.35)",
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
