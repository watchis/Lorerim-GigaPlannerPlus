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
      accent: "#a87070",
      accentMuted: "#7a5858",
      health: "#a86070",
      perkAvailable: "#71717a",
      perkSelected: "#b88080",
      perkPartial: "#948080",
      perkLocked: "#18181b",
      perkPrereq: "#52525b",
    },
    shadows: {
      glow: "0 0 20px rgba(168, 112, 112, 0.08)",
      panel: "0 4px 24px rgba(0, 0, 0, 0.35)",
    },
  },
  werewolf: {
    colors: {
      background: "#0c0b0a",
      surface: "#131211",
      surfaceElevated: "#1a1917",
      border: "#262422",
      foreground: "#ece3d6",
      muted: "#8f8478",
      accent: "#c45c12",
      accentMuted: "#8a4a10",
      stamina: "#9a5c28",
      perkAvailable: "#686460",
      perkSelected: "#d07030",
      perkPartial: "#a87848",
      perkLocked: "#0e0d0c",
      perkPrereq: "#524c46",
    },
    shadows: {
      glow: "0 0 20px rgba(196, 92, 18, 0.1)",
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
