import { describe, expect, it } from "vitest";
import { loadAppData } from "@/data/loader";

describe("loadAppData perk indexes", () => {
  it("builds O(1) perk lookup maps at load time", () => {
    const { game } = loadAppData();
    const samplePerk = game.perkTrees.smithing?.perks[0];
    expect(samplePerk).toBeDefined();

    expect(game.perkById[samplePerk!.id]).toBe(samplePerk);
    expect(game.perkSkillIdByPerkId[samplePerk!.id]).toBe("smithing");
    expect(Object.keys(game.perkById).length).toBeGreaterThan(100);
  });
});
