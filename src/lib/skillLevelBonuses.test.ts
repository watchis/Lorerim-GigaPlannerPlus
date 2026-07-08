import { describe, expect, it } from "vitest";
import { getSkillLevelBonusLines } from "@/lib/skillLevelBonuses";
import { createTestBuildState, getTestGameData } from "@/test/helpers";

describe("getSkillLevelBonusLines", () => {
  const game = getTestGameData();
  const labels = {
    skillBonusEffectFloorMinimum: "+{count} level minimum",
    skillBonusEffectFreeLevels: "+{count} free levels",
    skillBonusSourceMajor: "Major Skill",
    skillBonusSourceMinor: "Minor Skill",
    skillBonusSourceTraining: "Training",
    oghmaInfinium: "Oghma Infinium",
  };

  it("returns no lines when the skill has no bonuses", () => {
    expect(getSkillLevelBonusLines(game, createTestBuildState(), "block", labels)).toEqual([]);
  });

  it("lists race, major, minor, training, and Oghma bonuses with effect and source", () => {
    const state = createTestBuildState({
      raceId: "nord",
      majorSkillIds: ["block"],
      minorSkillIds: ["alchemy"],
      characterOptionChoices: { "oghma-infinium": "claimed" },
      oghmaSkillIds: ["block"],
      skillTrainingRanges: { block: [5, 0, 0, 0] },
    });

    const blockLines = getSkillLevelBonusLines(game, state, "block", labels);
    expect(blockLines).toEqual([
      { key: "major-skill", effect: "+10 level minimum", source: "Major Skill" },
      { key: "race-starting", effect: "+10 level minimum", source: "Nord" },
      { key: "oghma-free-top", effect: "+5 free levels", source: "Oghma Infinium" },
      { key: "oghma-floor", effect: "+5 level minimum", source: "Oghma Infinium" },
      { key: "training", effect: "+5 free levels", source: "Training" },
    ]);

    const alchemyLines = getSkillLevelBonusLines(game, state, "alchemy", labels);
    expect(alchemyLines).toEqual([
      { key: "minor-skill", effect: "+5 level minimum", source: "Minor Skill" },
    ]);
  });
});
