import type { Theme } from "@/data/schemas";
import type { BuildState } from "@/engine/buildEngine";
import { isVampireActive, isWerewolfActive } from "@/lib/supernatural";

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
      background: "#0b080d",
      surface: "#15101c",
      surfaceElevated: "#201828",
      border: "#3a2848",
      foreground: "#ede6f0",
      muted: "#a894b0",
      accent: "#b81c3a",
      accentMuted: "#7a1830",
      health: "#a02040",
      perkAvailable: "#6b4a72",
      perkSelected: "#d42a4a",
      perkPartial: "#c9a0d4",
      perkLocked: "#241a2c",
      perkPrereq: "#5a4868",
    },
    shadows: {
      glow: "0 0 24px rgba(184, 28, 58, 0.22)",
      panel: "0 4px 28px rgba(40, 8, 24, 0.55)",
    },
  },
  werewolf: {
    colors: {
      background: "#090d0a",
      surface: "#111812",
      surfaceElevated: "#1a2218",
      border: "#2d3d2a",
      foreground: "#e8ece4",
      muted: "#90a088",
      accent: "#d4a03a",
      accentMuted: "#8a6420",
      stamina: "#4a7a38",
      perkAvailable: "#5a7050",
      perkSelected: "#d4a03a",
      perkPartial: "#8ab86a",
      perkLocked: "#1a2218",
      perkPrereq: "#4a5c44",
    },
    shadows: {
      glow: "0 0 24px rgba(212, 160, 58, 0.2)",
      panel: "0 4px 28px rgba(20, 32, 16, 0.55)",
    },
  },
};

export function getSupernaturalThemeVariant(
  state: BuildState,
): SupernaturalThemeVariant | null {
  if (isVampireActive(state)) return "vampire";
  if (isWerewolfActive(state)) return "werewolf";
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
