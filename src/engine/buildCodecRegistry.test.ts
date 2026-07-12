import { describe, expect, it } from "vitest";
import {
  createBuildCodecRegistry,
  lookupId,
  lookupIndex,
} from "@/engine/buildCodecRegistry";
import { getTestGameData } from "@/test/helpers";

describe("buildCodecRegistry", () => {
  const game = getTestGameData();
  const registry = createBuildCodecRegistry(game);

  it("indexes races, skills, and perks", () => {
    expect(registry.races).toContain("nord");
    expect(registry.skills).toContain("block");
    expect(registry.perks.length).toBeGreaterThan(100);
  });

  it("indexes supernatural character option choices for codec round-trip", () => {
    const vampireIndex = lookupIndex(registry.characterOptionIndex, "vampire", "character option");
    const werewolfIndex = lookupIndex(registry.characterOptionIndex, "werewolf", "character option");
    expect(vampireIndex).toBeTypeOf("number");
    expect(werewolfIndex).toBeTypeOf("number");

    const vampireChoices = registry.characterOptionChoices[vampireIndex!];
    const werewolfChoices = registry.characterOptionChoices[werewolfIndex!];

    expect(vampireChoices).toEqual(["none", "stage-1", "stage-2", "stage-3", "stage-4"]);
    expect(werewolfChoices).toEqual(["none", "claimed"]);
  });

  it("looks up ids by index and back", () => {
    const raceIndex = lookupIndex(registry.raceIndex, "nord", "race");
    expect(raceIndex).toBeTypeOf("number");
    expect(lookupId(registry.races, raceIndex, "race")).toBe("nord");
  });

  it("throws for unknown ids", () => {
    expect(() => lookupIndex(registry.raceIndex, "not-a-race", "race")).toThrow(/Unknown race/);
  });
});
