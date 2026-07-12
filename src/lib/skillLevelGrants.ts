import type { GameData } from "@/data/schemas";
import type { SourcedSkillLevelGrant } from "@/extension-api";
import type { BuildState } from "@/engine/buildEngine";
import type { BuildEvaluation } from "@/lib/buildEvaluation";
import { getSkillLevelGrantsForSkill } from "@/lib/buildEvaluation";

export interface SkillGrantBreakdownEntry {
  skillId: string;
  bonus: number;
  bypassPlayerLevelCap: boolean;
  bypassSkillIncreaseLimit: boolean;
  raiseFloor: boolean;
  freeTopLevels: number;
  sourceName: string;
  sourceLabelKey?: string;
}

function grantsForSkill(
  game: GameData,
  state: BuildState,
  skillId: string,
  evaluation?: BuildEvaluation,
): readonly SourcedSkillLevelGrant[] {
  return getSkillLevelGrantsForSkill(evaluation, game, state, skillId);
}

export function getSkillLevelGrantBreakdown(
  game: GameData,
  state: BuildState,
  skillId: string,
  evaluation?: BuildEvaluation,
): SkillGrantBreakdownEntry[] {
  return grantsForSkill(game, state, skillId, evaluation)
    .map((grant) => ({
      skillId: grant.skillId,
      bonus: grant.bonus,
      bypassPlayerLevelCap: grant.bypassPlayerLevelCap ?? false,
      bypassSkillIncreaseLimit: grant.bypassSkillIncreaseLimit ?? false,
      raiseFloor: grant.raiseFloor ?? false,
      freeTopLevels: grant.freeTopLevels ?? 0,
      sourceName: grant.source.name ?? grant.source.labelKey ?? "unknown",
      sourceLabelKey: grant.source.labelKey,
    }));
}

export function getSkillLevelGrantBonus(
  game: GameData,
  state: BuildState,
  skillId: string,
  evaluation?: BuildEvaluation,
): number {
  return grantsForSkill(game, state, skillId, evaluation).reduce(
    (total, grant) => total + grant.bonus,
    0,
  );
}

export function getBypassSkillLevelGrantBonus(
  game: GameData,
  state: BuildState,
  skillId: string,
  evaluation?: BuildEvaluation,
): number {
  return grantsForSkill(game, state, skillId, evaluation)
    .filter((grant) => grant.bypassPlayerLevelCap)
    .reduce((total, grant) => total + grant.bonus, 0);
}

export function getSkillLevelGrantFloorBonus(
  game: GameData,
  state: BuildState,
  skillId: string,
  evaluation?: BuildEvaluation,
): number {
  return grantsForSkill(game, state, skillId, evaluation)
    .filter((grant) => grant.raiseFloor)
    .reduce((total, grant) => total + grant.bonus, 0);
}

export function getBypassSkillIncreaseGrantBonus(
  game: GameData,
  state: BuildState,
  skillId: string,
  evaluation?: BuildEvaluation,
): number {
  return grantsForSkill(game, state, skillId, evaluation)
    .filter((grant) => grant.bypassSkillIncreaseLimit)
    .reduce((total, grant) => total + grant.bonus, 0);
}

export function getSkillLevelGrantFreeTopLevels(
  game: GameData,
  state: BuildState,
  skillId: string,
  evaluation?: BuildEvaluation,
): number {
  return grantsForSkill(game, state, skillId, evaluation)
    .filter((grant) => (grant.freeTopLevels ?? 0) > 0)
    .reduce((total, grant) => Math.max(total, grant.freeTopLevels ?? 0), 0);
}
