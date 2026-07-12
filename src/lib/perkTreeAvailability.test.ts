import { describe, expect, it } from "vitest";
import { meetsPerkTakeRequirements, treeUsesGlobalPerkPointBudget } from "@/lib/perkTreeAvailability";
import { getTestGameData } from "@/test/helpers";

describe("perkTreeAvailability", () => {
  const game = getTestGameData();

  it("excludes destiny and supernatural trees from the global perk budget", () => {
    expect(treeUsesGlobalPerkPointBudget("smithing")).toBe(true);
    expect(treeUsesGlobalPerkPointBudget("destiny")).toBe(false);
    expect(treeUsesGlobalPerkPointBudget("vampire")).toBe(false);
    expect(treeUsesGlobalPerkPointBudget("werewolf")).toBe(false);
  });

  it("shows root vampire perks as available without global perk points", () => {
    const available = meetsPerkTakeRequirements({
      treeSkillId: "vampire",
      takeTargetPerk: {
        id: "vampire-scion",
        skillReq: 0,
        costsPerkPoint: true,
      },
      game,
      playerLevel: 1,
      skillLevels: {},
      perkPointsRemaining: 0,
      destinyRemaining: 0,
    });

    expect(available).toBe(true);
  });

  it("shows root werewolf perks as available without global perk points", () => {
    const available = meetsPerkTakeRequirements({
      treeSkillId: "werewolf",
      takeTargetPerk: {
        id: "werewolf-bestial-strength",
        skillReq: 0,
        costsPerkPoint: true,
      },
      game,
      playerLevel: 1,
      skillLevels: {},
      perkPointsRemaining: 0,
      destinyRemaining: 0,
    });

    expect(available).toBe(true);
  });

  it("still requires global perk points on standard skill trees", () => {
    const unavailable = meetsPerkTakeRequirements({
      treeSkillId: "block",
      takeTargetPerk: {
        id: "block-improved-blocking",
        skillReq: 0,
        costsPerkPoint: true,
      },
      game,
      playerLevel: 1,
      skillLevels: { block: 25 },
      perkPointsRemaining: 0,
      destinyRemaining: 0,
    });

    expect(unavailable).toBe(false);
  });
});
