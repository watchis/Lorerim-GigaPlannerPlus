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

  it("includes supernatural perk trees and character options in the current snapshot", () => {
    const snapshot = getCodecRegistrySnapshot(game.manifest.version);
    expect(snapshot).not.toBeNull();
    expect(snapshot?.skills).toContain("vampire");
    expect(snapshot?.skills).toContain("werewolf");
    expect(snapshot?.skills).toContain("lich");
    expect(snapshot?.characterOptions).toEqual(
      expect.arrayContaining([
        "vampire",
        "werewolf",
        "lich",
        "oghma-infinium",
        "alduin-bonus-trait",
        "au-naturel-gear",
      ]),
    );
    expect(snapshot?.characterOptionChoices).toEqual(
      expect.arrayContaining([
        ["none", "stage-1", "stage-2", "stage-3", "stage-4"],
        ["none", "claimed"],
      ]),
    );
    expect(snapshot?.perks).toContain("vampire-scion");
    expect(snapshot?.perks).toContain("werewolf-animal-vigor");
    expect(snapshot?.perks).toContain("lich-magicka-weave");
    expect(snapshot?.perks.length).toBe(523);

    const registry = createBuildCodecRegistryForVersion(game, game.manifest.version);
    expect(registry.perks).toEqual(snapshot?.perks);
    expect(registry.characterOptions).toEqual(snapshot?.characterOptions);
  });
});
