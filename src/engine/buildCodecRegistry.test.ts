import { describe, expect, it } from "vitest";
import {
  createBuildCodecRegistry,
  lookupId,
  lookupIdSafe,
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

  it("looks up ids by index and back", () => {
    const raceIndex = lookupIndex(registry.raceIndex, "nord", "race");
    expect(raceIndex).toBeTypeOf("number");
    expect(lookupId(registry.races, raceIndex, "race")).toBe("nord");
  });

  it("throws for unknown ids", () => {
    expect(() => lookupIndex(registry.raceIndex, "not-a-race", "race")).toThrow(/Unknown race/);
  });

  it("returns null for out-of-range indices during best-effort decode", () => {
    expect(lookupIdSafe(registry.races, 999)).toBeNull();
    expect(lookupIdSafe(registry.races, undefined)).toBeNull();
  });
});
