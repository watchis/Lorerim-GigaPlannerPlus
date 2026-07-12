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
      accent: "#dc2626",
      accentMuted: "#991b1b",
      health: "#e11d48",
      perkAvailable: "#71717a",
      perkSelected: "#ef4444",
      perkPartial: "#f87171",
      perkLocked: "#18181b",
      perkPrereq: "#52525b",
    },
    shadows: {
      glow: "0 0 20px rgba(220, 38, 38, 0.18)",
      panel: "0 4px 24px rgba(0, 0, 0, 0.35)",
    },
  },
  werewolf: {
    colors: {
      background: "#1c1814",
      surface: "#272219",
      surfaceElevated: "#322c24",
      border: "#433c33",
      foreground: "#f0e6d8",
      muted: "#a89078",
      accent: "#c45c26",
      accentMuted: "#9a4518",
      stamina: "#a16207",
      perkAvailable: "#8a7a68",
      perkSelected: "#d97706",
      perkPartial: "#e8a04a",
      perkLocked: "#211d18",
      perkPrereq: "#6b5f52",
    },
    shadows: {
      glow: "0 0 20px rgba(196, 92, 38, 0.16)",
      panel: "0 4px 24px rgba(28, 20, 12, 0.32)",
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
