import { describe, expect, it } from "vitest";
import { decodeBuild, decodeBuildPackage, encodeBuild, encodeSavedBuild } from "@/engine/buildCodec";
import { prepareImportedBuild } from "@/engine/buildEngine";
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

  it("round-trips supernatural vampire stage, werewolf curse, and curse perks", () => {
    const vampireBuild = createTestBuildState({
      raceId: "nord",
      characterOptionChoices: { vampire: "stage-3", werewolf: "none" },
      selectedPerkIds: ["vampire-scion", "block-improved-blocking"],
      traitIds: ["angler"],
    });

    const decodedVampire = decodeBuild(encodeBuild(vampireBuild, game), game);

    expect(decodedVampire.characterOptionChoices.vampire).toBe("stage-3");
    expect(decodedVampire.characterOptionChoices.werewolf).toBe("none");
    expect(decodedVampire.selectedPerkIds).toEqual(
      expect.arrayContaining(["vampire-scion", "block-improved-blocking"]),
    );
    expect(decodedVampire.selectedPerkIds).toHaveLength(2);

    const werewolfBuild = createTestBuildState({
      raceId: "nord",
      characterOptionChoices: { vampire: "none", werewolf: "claimed" },
      selectedPerkIds: ["werewolf-animal-vigor"],
    });

    const decodedWerewolf = decodeBuild(encodeBuild(werewolfBuild, game), game);

    expect(decodedWerewolf.characterOptionChoices.werewolf).toBe("claimed");
    expect(decodedWerewolf.characterOptionChoices.vampire).toBe("none");
    expect(decodedWerewolf.selectedPerkIds).toEqual(["werewolf-animal-vigor"]);
  });

  it("round-trips supernatural choices in saved build variants", () => {
    const defaultBuild = createTestBuildState({
      characterOptionChoices: { vampire: "stage-1", werewolf: "none" },
      selectedPerkIds: ["vampire-scion"],
    });
    const milestoneBuild = createTestBuildState({
      characterOptionChoices: { vampire: "none", werewolf: "claimed" },
      selectedPerkIds: ["werewolf-animal-vigor"],
    });
    const entry = createSavedBuild(
      "Curse variants",
      defaultBuild,
      [createMilestone("Werewolf path", milestoneBuild)],
    );

    const decoded = decodeBuildPackage(encodeSavedBuild(entry, game), game);

    expect(decoded.build.characterOptionChoices.vampire).toBe("stage-1");
    expect(decoded.build.selectedPerkIds).toEqual(["vampire-scion"]);
    expect(decoded.shared?.milestones[0]?.build.characterOptionChoices.werewolf).toBe("claimed");
    expect(decoded.shared?.milestones[0]?.build.selectedPerkIds).toEqual(["werewolf-animal-vigor"]);
  });

  it("rejects unknown supernatural choice ids during encode", () => {
    const state = createTestBuildState({
      characterOptionChoices: { vampire: "stage-99", werewolf: "none" },
    });

    expect(() => encodeBuild(state, game)).toThrow(/Unknown character option choice/);
  });

  it("normalizes conflicting supernatural curses on decode", () => {
    const state = createTestBuildState({
      characterOptionChoices: { vampire: "stage-2", werewolf: "claimed" },
      selectedPerkIds: ["vampire-scion", "werewolf-animal-vigor", "block-improved-blocking"],
    });

    const decoded = decodeBuild(encodeBuild(state, game), game);

    expect(decoded.characterOptionChoices.vampire).toBe("stage-2");
    expect(decoded.characterOptionChoices.werewolf).toBe("none");
    expect(decoded.selectedPerkIds).toEqual(
      expect.arrayContaining(["vampire-scion", "block-improved-blocking"]),
    );
    expect(decoded.selectedPerkIds).not.toContain("werewolf-animal-vigor");
  });

  it("migrates legacy supernatural fields when preparing imported builds", () => {
    const legacy = createTestBuildState({
      selectedPerkIds: ["vampire-scion"],
    }) as ReturnType<typeof createTestBuildState> & {
      vampirismId: string;
      lycanthropyId: string;
    };
    legacy.vampirismId = "stage-3";
    legacy.lycanthropyId = "none";

    const imported = prepareImportedBuild(game, legacy);

    expect(imported.characterOptionChoices.vampire).toBe("stage-3");
    expect(imported.characterOptionChoices.werewolf).toBe("none");
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
      vampire: "none",
      werewolf: "none",
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
