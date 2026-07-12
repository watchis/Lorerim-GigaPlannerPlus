import type { GameData, Perk } from "@/data/schemas";
import { getPerkSkillId } from "@/engine/buildEngine";
import { meaningfulPlayerLevelReq } from "@/lib/perkRequirements";
import { isSupernaturalPerkTreeSkillId } from "@/lib/supernatural";

const DESTINY_SKILL_ID = "destiny";

export function treeUsesGlobalPerkPointBudget(skillId: string): boolean {
  return skillId !== DESTINY_SKILL_ID && !isSupernaturalPerkTreeSkillId(skillId);
}

/** Whether a perk can be shown as available (prereqs met, requirements satisfied). */
export function meetsPerkTakeRequirements(options: {
  treeSkillId: string;
  takeTargetPerk: Pick<Perk, "id" | "skillReq" | "costsPerkPoint" | "playerLevelReq">;
  game: GameData;
  playerLevel: number;
  skillLevels: Record<string, number>;
  perkPointsRemaining: number;
  destinyRemaining: number;
}): boolean {
  const {
    treeSkillId,
    takeTargetPerk,
    game,
    playerLevel,
    skillLevels,
    perkPointsRemaining,
    destinyRemaining,
  } = options;

  const playerLevelReq = meaningfulPlayerLevelReq(takeTargetPerk.playerLevelReq);
  if (playerLevelReq != null && playerLevel < playerLevelReq) {
    return false;
  }

  if (treeSkillId === DESTINY_SKILL_ID) {
    return !takeTargetPerk.costsPerkPoint || destinyRemaining >= 1;
  }

  const skillId = getPerkSkillId(game, takeTargetPerk.id);
  const skillLevel = skillId ? (skillLevels[skillId] ?? 0) : 0;
  if (skillLevel < takeTargetPerk.skillReq) {
    return false;
  }

  if (!treeUsesGlobalPerkPointBudget(treeSkillId)) {
    return true;
  }

  if (!takeTargetPerk.costsPerkPoint) {
    return true;
  }

  return perkPointsRemaining >= 1;
}
