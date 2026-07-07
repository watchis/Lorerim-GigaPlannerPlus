import { describe, expect, it } from "vitest";
import perkPlayerLevelReqsJson from "../../data/game/perk-player-level-reqs.json";
import raceEffectsJson from "../../data/game/race-effects.json";
import racesJson from "../../data/game/races.json";
import { loadAppData } from "@/data/loader";
import { raceEffectsSchema, racesSchema } from "@/data/schemas";
import { mergeEffects } from "@/lib/resolveOptionEffects";

describe("loadAppData", () => {
  it("loads and validates bundled game and UI data", () => {
    const data = loadAppData();

    expect(data.game.manifest.version.length).toBeGreaterThan(0);
    expect(data.game.skills.length).toBeGreaterThan(0);
    expect(Object.keys(data.game.perkTrees).length).toBeGreaterThan(0);
    expect(data.ui.labels.app.title.length).toBeGreaterThan(0);
  });

  it("loads level cap and build issue banner labels", () => {
    const data = loadAppData();
    const levelBar = data.ui.labels["level-bar"];

    expect(data.game.mechanics.leveling.maxPlayerLevel).toBe(201);
    expect(data.game.mechanics.leveling.standardMaxPlayerLevel).toBe(101);
    expect(levelBar.buildIssuesAlertMobile).toBe(
      "Your build has {count} {issues}. Tap to see more.",
    );
    expect(levelBar.buildIssuesAlertDesktop).toBe(
      "Your build has {count} {issues}. Hover to see more.",
    );
    expect(levelBar.buildIssuesAndMore).toBe("And more...");
    expect(levelBar.easyModeLevelWarning).toContain("{standardMax}");
  });

  it("merges perk player level requirements onto perk nodes", () => {
    const data = loadAppData();
    const speechTree = data.game.perkTrees.speech;
    const shoutFocus = speechTree?.perks.find((perk) => perk.id === "speech-shout-focus");
    const shoutFocusR2 = speechTree?.perks.find((perk) => perk.id === "speech-shout-focus-r2");
    const shoutFocusR3 = speechTree?.perks.find((perk) => perk.id === "speech-shout-focus-r3");

    expect(shoutFocus?.playerLevelReq).toBe(10);
    expect(shoutFocusR2?.playerLevelReq).toBe(20);
    expect(shoutFocusR3?.playerLevelReq).toBe(30);
  });

  it("maps every perk-player-level-reqs key to a real perk id", () => {
    const data = loadAppData();
    const perkIds = new Set(
      Object.values(data.game.perkTrees).flatMap((tree) => tree.perks.map((perk) => perk.id)),
    );
    const playerLevelReqs = perkPlayerLevelReqsJson as Record<string, number>;

    for (const perkId of Object.keys(playerLevelReqs)) {
      expect(perkIds.has(perkId), `unknown perk-player-level-reqs key: ${perkId}`).toBe(true);
    }
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

  it("merges race-effects sidecar onto race nodes", () => {
    const data = loadAppData();
    const { races: rawRaces } = racesSchema.parse(racesJson);
    const raceEffects = raceEffectsSchema.parse(raceEffectsJson);
    const bosmerRaw = rawRaces.find((race) => race.id === "bosmer");
    const bosmer = data.game.races.find((race) => race.id === "bosmer");

    expect(bosmerRaw).toBeDefined();
    expect(bosmer).toBeDefined();
    expect(bosmer?.effects).toEqual(
      mergeEffects(bosmerRaw!.effects, raceEffects.bosmer ?? []),
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
