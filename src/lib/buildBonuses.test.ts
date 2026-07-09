import { describe, expect, it } from "vitest";
import { collectBuildBonuses } from "@/lib/buildBonuses";
import { createTestBuildState, getTestGameData } from "@/test/helpers";

describe("collectBuildBonuses", () => {
  const game = getTestGameData();

  it("returns an empty list for a default build", () => {
    expect(collectBuildBonuses(game, createTestBuildState())).toEqual([]);
  });

  it("includes race, birthsign, deity, trait, and perk bonus text", () => {
    const state = createTestBuildState({
      raceId: "bosmer",
      birthsignId: "lord",
      deityId: "arkay",
      traitIds: ["acoustic-arcanist"],
      selectedPerkIds: ["wayfarer-lone-wolf"],
    });

    const entries = collectBuildBonuses(game, state);
    const sources = entries.map((entry) => entry.source);

    expect(sources).toContain("Bosmer");
    expect(sources).toContain("Lord");
    expect(sources).toContain("Arkay (Shrine)");
    expect(sources).toContain("Acoustic Arcanist");
    expect(sources).toContain("Lone Wolf");
    expect(entries.some((entry) => entry.source === "Bosmer" && entry.text.includes("Eye of the Hunt"))).toBe(
      true,
    );
    expect(entries.some((entry) => entry.source === "Lone Wolf" && entry.text.includes("fighting alone"))).toBe(
      true,
    );
  });

  it("skips empty, dash, and none selections", () => {
    expect(
      collectBuildBonuses(
        game,
        createTestBuildState({
          raceId: "none",
          birthsignId: "none",
          deityId: "none",
          traitIds: [],
          selectedPerkIds: [],
        }),
      ),
    ).toEqual([]);
  });
});
