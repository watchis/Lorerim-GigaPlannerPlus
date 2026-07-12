import { describe, expect, it } from "vitest";
import {
  reconcileImportedBuild,
  sanitizeImportedBuildReferences,
} from "@/engine/buildEngine";
import { createTestBuildState, getTestGameData } from "@/test/helpers";

describe("sanitizeImportedBuildReferences", () => {
  const game = getTestGameData();

  it("drops unknown perks, skills, and setup choices while keeping valid data", () => {
    const build = createTestBuildState({
      raceId: "nord",
      birthsignId: "apprentice",
      deityId: "none",
      traitIds: ["acoustic-arcanist", "not-a-trait"],
      majorSkillIds: ["block", "removed-skill"],
      minorSkillIds: ["one-handed", "block"],
      selectedPerkIds: ["block-improved-blocking", "removed-perk"],
      skillLevels: { block: 40, "removed-skill": 99 },
      skillTrainingRanges: { block: [1, 0, 0, 0], "removed-skill": [2, 0, 0, 0] },
      oghmaSkillIds: ["smithing", "removed-skill"],
      playerLevel: 10,
    });

    const sanitized = sanitizeImportedBuildReferences(game, build);

    expect(sanitized.raceId).toBe("nord");
    expect(sanitized.traitIds).toEqual(["acoustic-arcanist"]);
    expect(sanitized.majorSkillIds).toEqual(["block"]);
    expect(sanitized.minorSkillIds).toEqual(["one-handed"]);
    expect(sanitized.selectedPerkIds).toEqual(["block-improved-blocking"]);
    expect(sanitized.skillLevels).toEqual({ block: 40 });
    expect(sanitized.skillTrainingRanges).toEqual({ block: [1, 0, 0, 0] });
    expect(sanitized.oghmaSkillIds).toEqual(["smithing"]);
  });

  it("falls back to none for unknown race, birthsign, and deity", () => {
    const build = createTestBuildState({
      raceId: "removed-race",
      birthsignId: "removed-stone",
      deityId: "removed-deity",
    });

    const sanitized = sanitizeImportedBuildReferences(game, build);

    expect(sanitized.raceId).toBe("none");
    expect(sanitized.birthsignId).toBe("none");
    expect(sanitized.deityId).toBe("none");
  });
});

describe("reconcileImportedBuild", () => {
  const game = getTestGameData();

  it("sanitizes stale references and reconciles the result", () => {
    const build = createTestBuildState({
      selectedPerkIds: ["block-improved-blocking", "removed-perk"],
      playerLevel: 10,
    });

    const reconciled = reconcileImportedBuild(game, build);

    expect(reconciled.selectedPerkIds).toEqual(["block-improved-blocking"]);
    expect(reconciled.playerLevel).toBe(10);
  });
});
