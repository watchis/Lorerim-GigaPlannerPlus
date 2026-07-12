import { describe, expect, it } from "vitest";

import { createTestBuildState, getTestGameData } from "@/test/helpers";
import { collectBuildChanges } from "@/lib/buildModifications";
import {
  createBuildEvaluation,
  getSkillLevelGrantsForSkill,
} from "@/lib/buildEvaluation";
import { getSkillLevelGrantBonus } from "@/lib/skillLevelGrants";

describe("buildEvaluation", () => {
  it("indexes skill grants by skill id", () => {
    const game = getTestGameData();
    const state = createTestBuildState({ raceId: "nord", playerLevel: 30 });
    const evaluation = createBuildEvaluation(game, state);
    const collected = collectBuildChanges(game, state);

    expect(evaluation.collected).toStrictEqual(collected);
    expect(evaluation.budgetEffects).toEqual({
      perkPoints: expect.any(Number),
      traitSlots: expect.any(Number),
    });

    for (const grant of collected.skillLevelGrants) {
      expect(evaluation.grantsBySkillId.get(grant.skillId)).toContainEqual(grant);
    }
  });

  it("returns the same grant bonus with or without a cached evaluation", () => {
    const game = getTestGameData();
    const state = createTestBuildState({ raceId: "imperial", playerLevel: 40 });
    const evaluation = createBuildEvaluation(game, state);
    const skillId = "onehanded";

    expect(getSkillLevelGrantBonus(game, state, skillId, evaluation)).toBe(
      getSkillLevelGrantBonus(game, state, skillId),
    );
    expect(getSkillLevelGrantsForSkill(evaluation, game, state, skillId).length).toBeGreaterThanOrEqual(
      0,
    );
  });
});
