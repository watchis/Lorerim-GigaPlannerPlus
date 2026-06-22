import type { Perk } from "@/data/schemas";

export interface PerkNodeRequirements {
  skillReq: number | null;
  playerLevelReq: number | null;
}

export function getPerkNodeRequirements(perk: Perk): PerkNodeRequirements {
  return {
    skillReq: perk.skillReq > 0 ? perk.skillReq : null,
    playerLevelReq: perk.playerLevelReq ?? null,
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
