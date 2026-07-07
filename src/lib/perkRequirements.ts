import type { Perk } from "@/data/schemas";
import type { PerkBadgeVisibility } from "@/store/uiStore";

export interface PerkNodeRequirements {
  skillReq: number | null;
  playerLevelReq: number | null;
}

export interface FormatPerkNodeRequirementLabelOptions {
  visibility: PerkBadgeVisibility;
  skillName?: string;
}

/** Level 1 is the default player level and is not shown or enforced as a perk gate. */
export function meaningfulPlayerLevelReq(level: number | null | undefined): number | null {
  return level != null && level > 1 ? level : null;
}

export function getPerkNodeRequirements(perk: Perk): PerkNodeRequirements {
  return {
    skillReq: perk.skillReq > 0 ? perk.skillReq : null,
    playerLevelReq: meaningfulPlayerLevelReq(perk.playerLevelReq),
  };
}

export function formatPerkNodeRequirementLabel(
  requirements: PerkNodeRequirements,
  options?: FormatPerkNodeRequirementLabelOptions,
): string | null {
  const visibility = options?.visibility ?? {
    playerLevelReq: true,
    skillLevelReq: true,
    skillName: false,
  };
  const parts: string[] = [];

  if (visibility.playerLevelReq && requirements.playerLevelReq !== null) {
    parts.push(`Lv ${requirements.playerLevelReq}`);
  }
  if (visibility.skillName && options?.skillName && requirements.skillReq !== null) {
    parts.push(options.skillName);
  }
  if (visibility.skillLevelReq && requirements.skillReq !== null) {
    parts.push(String(requirements.skillReq));
  }

  return parts.length > 0 ? parts.join(" · ") : null;
}
