import { describe, expect, it } from "vitest";
import { codecRegistryVersions, getCodecRegistrySnapshot } from "@/data/codecRegistrySnapshots";
import { createBuildCodecRegistryForVersion } from "@/engine/buildCodecRegistry";
import { getTestGameData } from "@/test/helpers";

describe("codec registry snapshots", () => {
  const game = getTestGameData();

  it("includes snapshots for recent modpack versions", () => {
    expect(codecRegistryVersions).toContain("5.0.3.6");
    expect(codecRegistryVersions).toContain(game.manifest.version);
  });

  it("builds a version-specific registry from a snapshot", () => {
    const snapshot = getCodecRegistrySnapshot("5.0.3.6");
    expect(snapshot?.perks.length).toBe(460);

    const registry = createBuildCodecRegistryForVersion(game, "5.0.3.6");
    expect(registry.modpackVersion).toBe("5.0.3.6");
    expect(registry.perks.length).toBe(460);
    expect(registry.perks).not.toEqual(createBuildCodecRegistryForVersion(game, game.manifest.version).perks);
  });
});
