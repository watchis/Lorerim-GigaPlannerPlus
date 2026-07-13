import { describe, expect, it } from "vitest";
import { arePrerequisitesMet } from "@/engine/buildEngine";
import { createTestBuildState, getTestGameData } from "@/test/helpers";

/** Expected LoreRim 5.0.4 vampire tree graph (name → prerequisite names, rank count). */
const VAMPIRE_TREE_SPEC: ReadonlyArray<{
  name: string;
  prerequisites: readonly string[];
  ranks: number;
}> = [
  { name: "Scion", prerequisites: [], ranks: 1 },
  { name: "Court's Chef", prerequisites: ["Scion"], ranks: 1 },
  { name: "Wings of the Strix", prerequisites: ["Scion"], ranks: 1 },
  { name: "Auspex", prerequisites: ["Scion"], ranks: 1 },
  { name: "Vampiric Seed", prerequisites: ["Scion"], ranks: 1 },
  { name: "Vampiric Orb", prerequisites: ["Vampiric Seed"], ranks: 1 },
  { name: "Vampiric Cloak", prerequisites: ["Vampiric Orb"], ranks: 1 },
  { name: "Hemomancer", prerequisites: ["Scion"], ranks: 1 },
  {
    name: "Blood from a Stone",
    prerequisites: ["Vampiric Seed", "Hemomancer"],
    ranks: 1,
  },
  { name: "Starving Artist", prerequisites: ["Blood from a Stone"], ranks: 1 },
  { name: "Make Them Beautiful", prerequisites: ["Starving Artist"], ranks: 1 },
  { name: "Mist Form", prerequisites: ["Scion"], ranks: 1 },
  { name: "Supernatural Reflexes", prerequisites: ["Mist Form"], ranks: 1 },
  { name: "Tremor", prerequisites: ["Supernatural Reflexes"], ranks: 1 },
  { name: "Fountain of Blood", prerequisites: ["Scion"], ranks: 1 },
  {
    name: "Gutwrench",
    prerequisites: ["Fountain of Blood", "Mist Form"],
    ranks: 1,
  },
  { name: "Vampiric Grip", prerequisites: ["Gutwrench"], ranks: 1 },
  { name: "Maelstrom", prerequisites: ["Vampiric Grip"], ranks: 1 },
  {
    name: "Unearthly Will",
    prerequisites: ["Fountain of Blood", "Hemomancer"],
    ranks: 1,
  },
  { name: "Blood Storm", prerequisites: ["Unearthly Will"], ranks: 1 },
  { name: "Veil of the Night", prerequisites: ["Unearthly Will"], ranks: 1 },
  { name: "Slasher", prerequisites: ["Unearthly Will"], ranks: 1 },
  {
    name: "Energy Vampire",
    prerequisites: ["Blood Storm", "Slasher"],
    ranks: 1,
  },
  { name: "Shapechanger", prerequisites: ["Energy Vampire"], ranks: 1 },
];

describe("vampire perk tree", () => {
  const game = getTestGameData();
  const tree = game.perkTrees.vampire;

  function basePerkByName(name: string) {
    const perk = tree.perks.find((entry) => entry.name === name && !/-r\d+$/.test(entry.id));
    expect(perk, `missing base perk ${name}`).toBeDefined();
    return perk!;
  }

  it("matches the LoreRim 5.0.4 prerequisite graph and rank counts", () => {
    const byName = new Map<string, typeof tree.perks>();
    for (const perk of tree.perks) {
      const group = byName.get(perk.name) ?? [];
      group.push(perk);
      byName.set(perk.name, group);
    }

    expect([...byName.keys()].sort()).toEqual(
      [...VAMPIRE_TREE_SPEC.map((entry) => entry.name)].sort(),
    );

    for (const spec of VAMPIRE_TREE_SPEC) {
      const ranks = byName.get(spec.name)!;
      expect(ranks.length, spec.name).toBe(spec.ranks);

      const expectedPrereqIds = spec.prerequisites.map((name) => basePerkByName(name).id);
      for (const rank of ranks) {
        expect([...rank.prerequisites].sort(), rank.id).toEqual([...expectedPrereqIds].sort());
        expect(rank.prerequisitesAny ?? []).toEqual([]);
      }
    }
  });

  it("requires both Blood Storm and Slasher before Energy Vampire", () => {
    const energy = basePerkByName("Energy Vampire");
    const scion = basePerkByName("Scion");
    const fountain = basePerkByName("Fountain of Blood");
    const hemomancer = basePerkByName("Hemomancer");
    const unearthly = basePerkByName("Unearthly Will");
    const bloodStorm = basePerkByName("Blood Storm");
    const slasher = basePerkByName("Slasher");

    const withoutSlasher = createTestBuildState({
      selectedPerkIds: [
        scion.id,
        fountain.id,
        hemomancer.id,
        unearthly.id,
        bloodStorm.id,
      ],
    });
    expect(arePrerequisitesMet(game, withoutSlasher, energy)).toBe(false);

    const withBoth = createTestBuildState({
      selectedPerkIds: [
        scion.id,
        fountain.id,
        hemomancer.id,
        unearthly.id,
        bloodStorm.id,
        slasher.id,
      ],
    });
    expect(arePrerequisitesMet(game, withBoth, energy)).toBe(true);
  });

  it("keeps Sacrilege-style descriptions from the Vampire Lord AVIF", () => {
    expect(basePerkByName("Scion").description).toMatch(/undeath|resistance|endurance/i);
    expect(basePerkByName("Auspex").description).toMatch(/150 feet|enemies approach/i);
    expect(basePerkByName("Energy Vampire").description).toMatch(/absorb Magicka|absorb Stamina/i);
  });
});
