import { gzipSync } from "fflate";
import { describe, expect, it } from "vitest";
import {
  decodeBuild,
  decodeBuildPackage,
  encodeBuild,
  encodeSavedBuild,
} from "@/engine/buildCodec";
import { createBuildCodecRegistry, lookupIndex } from "@/engine/buildCodecRegistry";
import { createTestBuildState, getTestGameData } from "@/test/helpers";
import { createMilestone, createSavedBuild } from "@/store/savedBuilds";

function toBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

describe("buildCodec", () => {
  const game = getTestGameData();

  it("round-trips a minimal build through v3 codec", () => {
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

    expect(code.startsWith("3.")).toBe(true);
    expect(decoded.raceId).toBe("nord");
    expect(decoded.majorSkillIds).toEqual(["block"]);
    expect(decoded.minorSkillIds).toEqual(["one-handed"]);
    expect(decoded.playerLevel).toBe(5);
    expect(decoded.skillLevels.block).toBe(30);
    expect(decoded.selectedPerkIds).toEqual(["block-improved-blocking"]);
    expect(decoded.attributeBonus).toEqual({ health: 2, magicka: 1, stamina: 0 });
    expect(decoded.description).toBe("Test build");
  });

  it("round-trips character option choices and migrates legacy Oghma paths", () => {
    const state = createTestBuildState({
      characterOptionChoices: {
        "oghma-infinium": "warrior",
        "alduin-bonus-trait": "claimed",
      },
    });

    const decoded = decodeBuild(encodeBuild(state, game), game);

    expect(decoded.characterOptionChoices).toEqual({
      "oghma-infinium": "claimed",
      "alduin-bonus-trait": "claimed",
      "au-naturel-gear": "4",
    });
    expect(decoded.oghmaSkillIds).toEqual([
      "one-handed",
      "two-handed",
      "block",
      "heavy-armor",
      "smithing",
      "enchanting",
    ]);
  });

  it("round-trips Oghma skill selections", () => {
    const state = createTestBuildState({
      characterOptionChoices: { "oghma-infinium": "claimed" },
      oghmaSkillIds: ["block", "smithing"],
    });

    const decoded = decodeBuild(encodeBuild(state, game), game);
    expect(decoded.oghmaSkillIds).toEqual(["block", "smithing"]);
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

  it("decodes builds from a different modpack version and preserves the source version", () => {
    const state = createTestBuildState({
      raceId: "nord",
      playerLevel: 10,
      description: "Cross-version build",
    });
    const code = encodeBuild(state, game);

    const otherGame = {
      ...game,
      manifest: { ...game.manifest, version: "4.9.0.1" },
    };

    const decoded = decodeBuildPackage(code, otherGame);
    expect(decoded.build.description).toBe("Cross-version build");
    expect(decoded.sourceModpackVersion).toBe(game.manifest.version);
  });

  it("decodes builds from a different patch version within the same major", () => {
    const state = createTestBuildState({
      raceId: "nord",
      playerLevel: 10,
      description: "Cross-patch build",
    });
    const code = encodeBuild(state, game);

    const otherGame = {
      ...game,
      manifest: { ...game.manifest, version: "5.0.3.6" },
    };

    const decoded = decodeBuildPackage(code, otherGame);
    expect(decoded.build.description).toBe("Cross-patch build");
    expect(decoded.sourceModpackVersion).toBe(game.manifest.version);
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

  it("ignores out-of-range compact indices during decode", () => {
    const registry = createBuildCodecRegistry(game);
    const payload = {
      v: 2 as const,
      mv: "9.9.9.9",
      r: 999,
      M: [999, lookupIndex(registry.skillIndex, "block", "skill")!],
      p: [999, lookupIndex(registry.perkIndex, "block-improved-blocking", "perk")!],
      lv: 10,
    };
    const compressed = gzipSync(new TextEncoder().encode(JSON.stringify(payload)));
    const code = `2.${toBase64Url(compressed)}`;

    const decoded = decodeBuildPackage(code, game);
    expect(decoded.build.raceId).toBe("none");
    expect(decoded.build.majorSkillIds).toEqual(["block"]);
    expect(decoded.build.selectedPerkIds).toEqual(["block-improved-blocking"]);
    expect(decoded.sourceModpackVersion).toBe("9.9.9.9");
  });
});
