import type { Perk } from "@/data/schemas";

export interface PerkNodeRequirements {
  skillReq: number | null;
  playerLevelReq: number | null;
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

export function formatPerkNodeRequirementLabel(requirements: PerkNodeRequirements): string | null {
  const parts: string[] = [];

  if (requirements.playerLevelReq !== null) {
    parts.push(`Lv ${requirements.playerLevelReq}`);
  }
  if (requirements.skillReq !== null) {
    parts.push(String(requirements.skillReq));
  }

  return parts.length > 0 ? parts.join(" · ") : null;
}
