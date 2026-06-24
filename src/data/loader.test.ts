import { describe, expect, it } from "vitest";
import raceEffectsJson from "../../data/game/race-effects.json";
import racesJson from "../../data/game/races.json";
import { loadAppData } from "@/data/loader";
import { raceEffectsSchema, racesSchema } from "@/data/schemas";
import { enrichRaceEffects } from "@/lib/enrichGameData";
import { mergeEffects } from "@/lib/resolveOptionEffects";

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

  it("loads smithing book perks with OR prerequisites", () => {
    const data = loadAppData();
    const smithing = data.game.perkTrees.smithing;
    expect(smithing).toBeDefined();

    const bookPerkIds = [
      "smithing-dwarven-smithing",
      "smithing-advanced-light-armors",
      "smithing-orcish-smithing",
      "smithing-elven-smithing",
      "smithing-glass-smithing",
      "smithing-ebony-smithing",
      "smithing-daedric-smithing",
      "smithing-draconic-blacksmithing",
    ];

    for (const perkId of bookPerkIds) {
      const perk = smithing!.perks.find((candidate) => candidate.id === perkId);
      expect(perk, perkId).toBeDefined();
      expect(perk!.prerequisites, perkId).toEqual([]);
      expect(perk!.prerequisitesAny?.length, perkId).toBeGreaterThan(0);
    }
  });

  it("merges race-effects sidecar onto parsed race bonuses", () => {
    const data = loadAppData();
    const { races: rawRaces } = racesSchema.parse(racesJson);
    const raceEffects = raceEffectsSchema.parse(raceEffectsJson);
    const bosmerRaw = rawRaces.find((race) => race.id === "bosmer");
    const bosmer = data.game.races.find((race) => race.id === "bosmer");

    expect(bosmerRaw).toBeDefined();
    expect(bosmer).toBeDefined();
    expect(bosmer?.effects).toEqual(
      mergeEffects(enrichRaceEffects(bosmerRaw!), raceEffects.bosmer ?? []),
    );
  });

  it("race-effects keys match playable race ids", () => {
    const data = loadAppData();
    const raceIds = new Set(data.game.races.map((race) => race.id));
    raceIds.delete("none");

    const raceEffects = raceEffectsJson as Record<string, unknown[]>;

    for (const raceId of Object.keys(raceEffects)) {
      expect(raceIds.has(raceId), `unknown race-effects key: ${raceId}`).toBe(true);
    }
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
