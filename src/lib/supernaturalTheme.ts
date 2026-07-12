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
 * Curse theme palettes follow a simple hierarchy: background → surface → elevated,
 * with one saturated accent family per variant. Neutrals carry layout; accent hue
 * carries identity and interactive emphasis.
 */
export const SUPERNATURAL_THEME_OVERRIDES: Record<
  SupernaturalThemeVariant,
  SupernaturalThemeOverrides
> = {
  vampire: {
    colors: {
      background: "#111113",
      surface: "#1a1a1e",
      surfaceElevated: "#242428",
      border: "#333338",
      foreground: "#f4f4f5",
      muted: "#a1a1aa",
      accent: "#b84848",
      accentMuted: "#8f3838",
      health: "#b84058",
      perkAvailable: "#71717a",
      perkSelected: "#c85c5c",
      perkPartial: "#a86a6a",
      perkLocked: "#18181b",
      perkPrereq: "#52525b",
    },
    shadows: {
      glow: "0 0 20px rgba(184, 72, 72, 0.1)",
      panel: "0 4px 24px rgba(0, 0, 0, 0.35)",
    },
  },
  werewolf: {
    colors: {
      background: "#0f0e0d",
      surface: "#171615",
      surfaceElevated: "#1f1e1b",
      border: "#2a2825",
      foreground: "#dfd6ca",
      muted: "#867b70",
      accent: "#b85814",
      accentMuted: "#7c4212",
      stamina: "#8f5a24",
      perkAvailable: "#6e655c",
      perkSelected: "#c4682a",
      perkPartial: "#a87240",
      perkLocked: "#100f0e",
      perkPrereq: "#524c46",
    },
    shadows: {
      glow: "0 0 20px rgba(184, 88, 20, 0.09)",
      panel: "0 4px 24px rgba(0, 0, 0, 0.36)",
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
