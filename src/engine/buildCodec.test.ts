import { describe, expect, it } from "vitest";
import { decodeBuild, encodeBuild } from "@/engine/buildCodec";
import { createTestBuildState, getTestGameData } from "@/test/helpers";

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

  it("rejects builds from a different modpack version", () => {
    const state = createTestBuildState();
    const code = encodeBuild(state, game);

    const otherGame = {
      ...game,
      manifest: { ...game.manifest, version: "0.0.0-test" },
    };

    expect(() => decodeBuild(code, otherGame)).toThrow(/modpack/);
  });
});
