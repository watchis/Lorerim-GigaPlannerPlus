import { gzipSync } from "fflate";
import { describe, expect, it, vi } from "vitest";
import {
  decodeBuild,
  decodeBuildPackage,
  encodeBuild,
  encodeSavedBuild,
  tryEncodeSavedBuild,
} from "@/engine/buildCodec";
import { createBuildCodecRegistry, lookupIndex } from "@/engine/buildCodecRegistry";
import { reconcileImportedBuild, type BuildState } from "@/engine/buildEngine";
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

    const lichBuild = createTestBuildState({
      raceId: "breton",
      characterOptionChoices: { vampire: "none", werewolf: "none", lich: "25" },
      selectedPerkIds: ["vampire-scion"],
    });

    const decodedLich = decodeBuild(encodeBuild(lichBuild, game), game);

    expect(decodedLich.characterOptionChoices.lich).toBe("25");
    expect(decodedLich.characterOptionChoices.vampire).toBe("none");
    expect(decodedLich.characterOptionChoices.werewolf).toBe("none");
    expect(decodedLich.selectedPerkIds).toEqual(["vampire-scion"]);
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

  it("skips unknown supernatural choice ids during encode instead of throwing", () => {
    const state = createTestBuildState({
      characterOptionChoices: { vampire: "stage-99", werewolf: "none" },
    });

    expect(() => encodeBuild(state, game)).not.toThrow();
    const decoded = decodeBuild(encodeBuild(state, game), game);
    expect(decoded.characterOptionChoices.vampire ?? "none").toBe("none");
  });

  it("encodes legacy lich claimed milestones without crashing", () => {
    const defaultBuild = createTestBuildState({
      characterOptionChoices: { vampire: "none", werewolf: "none", lich: "none" },
    });
    const milestoneBuild = createTestBuildState({
      characterOptionChoices: { vampire: "none", werewolf: "none", lich: "claimed" },
      playerLevel: 25,
    });
    const milestone = createMilestone("Level 25", milestoneBuild);
    const entry = createSavedBuild("Legacy Lich", defaultBuild, [milestone]);
    entry.activeMilestoneId = milestone.id;

    expect(() => encodeSavedBuild(entry, game)).not.toThrow();
    const decoded = decodeBuildPackage(encodeSavedBuild(entry, game), game);
    expect(decoded.shared?.milestones[0]?.build.characterOptionChoices.lich).toBe("0");
  });

  it("encodes builds with missing optional fields without crashing", () => {
    const state = createTestBuildState();
    delete (state as { attributeBonus?: BuildState["attributeBonus"] }).attributeBonus;
    delete (state as { oghmaSkillIds?: string[] }).oghmaSkillIds;
    delete (state as { characterOptionChoices?: BuildState["characterOptionChoices"] })
      .characterOptionChoices;

    expect(() => encodeBuild(state, game)).not.toThrow();
  });

  it("tryEncodeSavedBuild returns empty string instead of throwing", () => {
    const entry = createSavedBuild("Broken", null as unknown as BuildState);
    // Even with a null build, migrate+reconcile should make this succeed.
    expect(tryEncodeSavedBuild(entry, game).length).toBeGreaterThan(0);

    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    // Force a throw inside encode by stubbing a broken game.characterOptions iteration.
    const brokenGame = {
      ...game,
      get characterOptions(): never {
        throw new Error("simulated encode failure");
      },
    } as typeof game;
    expect(tryEncodeSavedBuild(createSavedBuild("X", createTestBuildState()), brokenGame)).toBe("");
    spy.mockRestore();
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

    const imported = reconcileImportedBuild(game, legacy);

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
      lich: "none",
      "au-naturel-gear": "0",
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

  it("round-trips Au Naturel gear choices through v3 share codes", () => {
    for (const gearChoice of ["0", "1", "2", "3", "4"] as const) {
      const state = createTestBuildState({
        traitIds: ["au-naturel"],
        playerLevel: 10,
        characterOptionChoices: { "au-naturel-gear": gearChoice },
      });

      const decoded = decodeBuild(encodeBuild(state, game), game);

      expect(decoded.traitIds).toContain("au-naturel");
      expect(decoded.characterOptionChoices["au-naturel-gear"]).toBe(gearChoice);
    }
  });

  it("round-trips Au Naturel gear in saved build variants", () => {
    const defaultBuild = createTestBuildState({
      traitIds: ["au-naturel"],
      playerLevel: 10,
      characterOptionChoices: { "au-naturel-gear": "0" },
    });
    const milestoneBuild = createTestBuildState({
      traitIds: ["au-naturel"],
      playerLevel: 25,
      characterOptionChoices: { "au-naturel-gear": "3" },
    });
    const entry = createSavedBuild("Au Naturel", defaultBuild, [
      createMilestone("Level 25", milestoneBuild),
    ]);

    const decoded = decodeBuildPackage(encodeSavedBuild(entry, game), game);

    expect(decoded.build.characterOptionChoices["au-naturel-gear"]).toBe("0");
    expect(decoded.shared?.milestones[0]?.build.characterOptionChoices["au-naturel-gear"]).toBe(
      "3",
    );
  });

  it("keeps legacy v2 Alduin option indices stable via frozen tables", () => {
    const payload = {
      v: 2 as const,
      mv: "5.0.3.6",
      co: [[1, 1]] as [number, number][],
    };
    const compressed = gzipSync(new TextEncoder().encode(JSON.stringify(payload)));
    const code = `2.${toBase64Url(compressed)}`;

    const decoded = decodeBuildPackage(code, game);

    expect(decoded.build.characterOptionChoices["alduin-bonus-trait"]).toBe("claimed");
    expect(decoded.build.characterOptionChoices["au-naturel-gear"]).toBe("0");
  });

  it("round-trips id-based character options in v2 payloads", () => {
    const payload = {
      v: 2 as const,
      mv: game.manifest.version,
      co: [
        ["au-naturel-gear", "2"],
        ["alduin-bonus-trait", "claimed"],
      ] as [string, string][],
    };
    const compressed = gzipSync(new TextEncoder().encode(JSON.stringify(payload)));
    const code = `2.${toBase64Url(compressed)}`;

    const decoded = decodeBuildPackage(code, game);

    expect(decoded.build.characterOptionChoices).toEqual({
      "au-naturel-gear": "2",
      "alduin-bonus-trait": "claimed",
      "oghma-infinium": "none",
      vampire: "none",
      werewolf: "none",
      lich: "none",
    });
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
