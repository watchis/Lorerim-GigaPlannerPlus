import type { GameData } from "@/data/schemas";
import type { SourcedSkillLevelGrant } from "@/extension-api";
import type { BuildState } from "@/engine/buildEngine";
import { collectBuildChanges } from "@/lib/buildModifications";

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

function getCollectedGrants(game: GameData, state: BuildState): SourcedSkillLevelGrant[] {
  return collectBuildChanges(game, state).skillLevelGrants;
}

export function getSkillLevelGrantBreakdown(
  game: GameData,
  state: BuildState,
  skillId: string,
): SkillGrantBreakdownEntry[] {
  return getCollectedGrants(game, state)
    .filter((grant) => grant.skillId === skillId)
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
): number {
  return getCollectedGrants(game, state)
    .filter((grant) => grant.skillId === skillId)
    .reduce((total, grant) => total + grant.bonus, 0);
}

export function getBypassSkillLevelGrantBonus(
  game: GameData,
  state: BuildState,
  skillId: string,
): number {
  return getCollectedGrants(game, state)
    .filter((grant) => grant.skillId === skillId && grant.bypassPlayerLevelCap)
    .reduce((total, grant) => total + grant.bonus, 0);
}

export function getSkillLevelGrantFloorBonus(
  game: GameData,
  state: BuildState,
  skillId: string,
): number {
  return getCollectedGrants(game, state)
    .filter((grant) => grant.skillId === skillId && grant.raiseFloor)
    .reduce((total, grant) => total + grant.bonus, 0);
}

export function getBypassSkillIncreaseGrantBonus(
  game: GameData,
  state: BuildState,
  skillId: string,
): number {
  return getCollectedGrants(game, state)
    .filter((grant) => grant.skillId === skillId && grant.bypassSkillIncreaseLimit)
    .reduce((total, grant) => total + grant.bonus, 0);
}

export function getSkillLevelGrantFreeTopLevels(
  game: GameData,
  state: BuildState,
  skillId: string,
): number {
  return getCollectedGrants(game, state)
    .filter((grant) => grant.skillId === skillId && (grant.freeTopLevels ?? 0) > 0)
    .reduce((total, grant) => Math.max(total, grant.freeTopLevels ?? 0), 0);
}
