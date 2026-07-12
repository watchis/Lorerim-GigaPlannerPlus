import type { GameData } from "@/data/schemas";
import type { SourcedSkillLevelGrant } from "@/extension-api";
import type { BuildState } from "@/engine/buildEngine";
import {
  collectBuildChanges,
  sumCollectedBudgetEffects,
  type CollectedBuildChanges,
} from "@/lib/buildModifications";

export interface BuildEvaluation {
  collected: CollectedBuildChanges;
  grantsBySkillId: ReadonlyMap<string, readonly SourcedSkillLevelGrant[]>;
  budgetEffects: ReturnType<typeof sumCollectedBudgetEffects>;
}

function indexGrantsBySkillId(
  grants: readonly SourcedSkillLevelGrant[],
): Map<string, SourcedSkillLevelGrant[]> {
  const grantsBySkillId = new Map<string, SourcedSkillLevelGrant[]>();

  for (const grant of grants) {
    const existing = grantsBySkillId.get(grant.skillId);
    if (existing) {
      existing.push(grant);
    } else {
      grantsBySkillId.set(grant.skillId, [grant]);
    }
  }

  return grantsBySkillId;
}

/** Collect race/perk/option modifications once for a build evaluation pass. */
export function createBuildEvaluation(game: GameData, state: BuildState): BuildEvaluation {
  const collected = collectBuildChanges(game, state);

  return {
    collected,
    grantsBySkillId: indexGrantsBySkillId(collected.skillLevelGrants),
    budgetEffects: sumCollectedBudgetEffects(collected),
  };
}

export function getSkillLevelGrantsForSkill(
  evaluation: BuildEvaluation | undefined,
  game: GameData,
  state: BuildState,
  skillId: string,
): readonly SourcedSkillLevelGrant[] {
  if (evaluation) {
    return evaluation.grantsBySkillId.get(skillId) ?? [];
  }

  return collectBuildChanges(game, state).skillLevelGrants.filter((grant) => grant.skillId === skillId);
}
