import { describe, expect, it } from "vitest";
import { decodeBuild, decodeBuildPackage, encodeBuild, encodeSavedBuild } from "@/engine/buildCodec";
import { createTestBuildState, getTestGameData } from "@/test/helpers";
import { createMilestone, createSavedBuild } from "@/store/savedBuilds";

describe("buildCodec", () => {
  const game = getTestGameData();

  it("round-trips a minimal build through v2 codec", () => {
    const state = createTestBuildState({
      raceId: "nord",
      birthsignId: "none",
      deityId: "none",
      majorSkillIds: ["block"],
      minorSkillIds: ["one-handed"],
      playerLevel: 5,
      skillLevels: { block: 30 },
      selectedPerkIds: ["block-improved-blocking"],
      attributeBonus: { health: 2, magicka: 1, stamina: 0 },
      description: "Test build",
    });

    const code = encodeBuild(state, game);
    const decoded = decodeBuild(code, game);

    expect(code.startsWith("2.")).toBe(true);
    expect(decoded.raceId).toBe("nord");
    expect(decoded.majorSkillIds).toEqual(["block"]);
    expect(decoded.minorSkillIds).toEqual(["one-handed"]);
    expect(decoded.playerLevel).toBe(5);
    expect(decoded.skillLevels.block).toBe(30);
    expect(decoded.selectedPerkIds).toEqual(["block-improved-blocking"]);
    expect(decoded.attributeBonus).toEqual({ health: 2, magicka: 1, stamina: 0 });
    expect(decoded.description).toBe("Test build");
  });

  it("round-trips character option choices", () => {
    const state = createTestBuildState({
      characterOptionChoices: {
        "oghma-infinium": "health",
        "alduin-bonus-trait": "claimed",
        bittercup: "health-magicka",
      },
    });

    const decoded = decodeBuild(encodeBuild(state, game), game);

    expect(decoded.characterOptionChoices).toEqual({
      "oghma-infinium": "health",
      "alduin-bonus-trait": "claimed",
      bittercup: "health-magicka",
    });
  });

  it("round-trips skill training ranges", () => {
    const state = createTestBuildState({
      skillTrainingRanges: {
        block: [2, 1, 0, 0],
      },
    });

    const decoded = decodeBuild(encodeBuild(state, game), game);

    expect(decoded.skillTrainingRanges.block).toEqual([2, 1, 0, 0]);
  });

  it("rejects builds from a different modpack version", () => {
    const state = createTestBuildState();
    const code = encodeBuild(state, game);

    const otherGame = {
      ...game,
      manifest: { ...game.manifest, version: "0.0.0-test" },
    };

    expect(() => decodeBuild(code, otherGame)).toThrow(/modpack/);
  });

  it("round-trips saved build metadata and variants", () => {
    const defaultBuild = createTestBuildState({
      raceId: "nord",
      playerLevel: 10,
      selectedPerkIds: ["block-improved-blocking"],
    });
    const milestoneBuild = createTestBuildState({
      raceId: "nord",
      playerLevel: 25,
      selectedPerkIds: ["block-improved-blocking", "block-strong-grip"],
    });
    const entry = createSavedBuild(
      "Two-Handed Tank",
      defaultBuild,
      [createMilestone("Level 25", milestoneBuild)],
      "Baseline",
    );
    entry.defaultVariantNotes = "Default notes";
    entry.milestones[0]!.notes = "Milestone notes";
    entry.activeMilestoneId = entry.milestones[0]!.id;

    const decoded = decodeBuildPackage(encodeSavedBuild(entry, game), game);

    expect(decoded.shared?.name).toBe("Two-Handed Tank");
    expect(decoded.shared?.defaultVariantName).toBe("Baseline");
    expect(decoded.shared?.defaultVariantNotes).toBe("Default notes");
    expect(decoded.shared?.milestones).toHaveLength(1);
    expect(decoded.shared?.milestones[0]?.name).toBe("Level 25");
    expect(decoded.shared?.milestones[0]?.notes).toBe("Milestone notes");
    expect(decoded.shared?.milestones[0]?.build.playerLevel).toBe(25);
    expect(decoded.shared?.milestones[0]?.build.selectedPerkIds).toEqual([
      "block-improved-blocking",
      "block-strong-grip",
    ]);
    expect(decoded.shared?.activeVariantIndex).toBe(1);
    expect(decoded.build.playerLevel).toBe(10);
    expect(decoded.build.selectedPerkIds).toEqual(["block-improved-blocking"]);
  });
});
