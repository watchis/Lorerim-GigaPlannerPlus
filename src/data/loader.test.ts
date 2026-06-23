import { describe, expect, it } from "vitest";
import { loadAppData } from "@/data/loader";

describe("loadAppData", () => {
  it("loads and validates bundled game and UI data", () => {
    const data = loadAppData();

    expect(data.game.manifest.version.length).toBeGreaterThan(0);
    expect(data.game.skills.length).toBeGreaterThan(0);
    expect(Object.keys(data.game.perkTrees).length).toBeGreaterThan(0);
    expect(data.ui.labels.app.title.length).toBeGreaterThan(0);
  });

  it("merges perk player level requirements onto perk nodes", () => {
    const data = loadAppData();
    const speechTree = data.game.perkTrees.speech;
    const shoutFocus = speechTree?.perks.find((perk) => perk.id === "speech-shout-focus");

    expect(shoutFocus?.playerLevelReq).toBe(10);
  });

  it("indexes every manifest skill with a perk tree except non-allocatable skills", () => {
    const data = loadAppData();
    const { manifest, perkTrees } = data.game;

    for (const skillId of manifest.skills) {
      if (manifest.nonAllocatableSkills.includes(skillId)) continue;
      expect(perkTrees[skillId], `missing perk tree for ${skillId}`).toBeDefined();
    }
  });
});
