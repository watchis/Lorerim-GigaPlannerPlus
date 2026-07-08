import { describe, expect, it } from "vitest";
import type { Perk, PerkTree } from "@/data/schemas";
import { getTestGameData } from "@/test/helpers";
import { getPerkPositionKey } from "@/lib/perkTreeGrid";
import {
  doesPerkMatchTokens,
  getPerkSearchPositionKeysForTree,
  getPerkSearchTokens,
} from "@/lib/perkSearch";

function findFirstPerk(gamePerkTrees: Record<string, PerkTree>, predicate: (perk: Perk) => boolean) {
  for (const tree of Object.values(gamePerkTrees)) {
    for (const perk of tree.perks) {
      if (predicate(perk)) return perk;
    }
  }
  throw new Error("No perk matched predicate in test data");
}

describe("perkSearch", () => {
  it("normalizes query tokens", () => {
    expect(getPerkSearchTokens("  smithing   60 ")).toEqual(["smithing", "60"]);
  });

  it("matches a perk on name tokens", () => {
    const game = getTestGameData();
    const perk = findFirstPerk(game.perkTrees, (p) => p.name.trim().length > 0);
    const token = perk.name.trim().split(/\s+/)[0].toLowerCase();

    expect(doesPerkMatchTokens(perk, [token])).toBe(true);
  });

  it("matches a perk on description/effects/prerequisites tokens", () => {
    const game = getTestGameData();
    const perk = findFirstPerk(game.perkTrees, (p) => p.description.trim().length > 0 && p.effects.length > 0);

    const descriptionToken =
      perk.description.trim().split(/\s+/).find((t) => t.length >= 4)?.toLowerCase() ??
      perk.description.trim().split(/\s+/)[0]?.toLowerCase();
    const effectToken = perk.effects[0]?.type?.toLowerCase();

    expect(descriptionToken).toBeTruthy();
    expect(effectToken).toBeTruthy();

    expect(doesPerkMatchTokens(perk, [descriptionToken!])).toBe(true);
    expect(doesPerkMatchTokens(perk, [effectToken!])).toBe(true);

    const prereqToken =
      perk.prerequisites[0]?.toLowerCase() ??
      (perk.prerequisitesAny?.[0]?.toLowerCase() ?? null);

    if (prereqToken) {
      expect(doesPerkMatchTokens(perk, [prereqToken])).toBe(true);
    }
  });

  it("returns matching position keys for a tree", () => {
    const game = getTestGameData();
    const firstTree = Object.values(game.perkTrees)[0];
    const perk = firstTree.perks[0];
    const token = perk.id.toLowerCase();

    const keys = getPerkSearchPositionKeysForTree(firstTree, [token]);
    expect(keys.has(getPerkPositionKey(perk.position))).toBe(true);
  });

  it("returns empty results for non-matching tokens", () => {
    const game = getTestGameData();
    const firstTree = Object.values(game.perkTrees)[0];
    const keys = getPerkSearchPositionKeysForTree(firstTree, ["zzzz_non_matching_token"]);
    expect(keys.size).toBe(0);
  });
});

