import { describe, expect, it } from "vitest";
import { arePrerequisitesMet } from "@/engine/buildEngine";
import { groupPerksByPosition } from "@/lib/perkTreeGrid";
import { createTestBuildState, getTestGameData } from "@/test/helpers";

/** Expected LoreRim 5.0.4 werewolf tree graph (name → prerequisite names, rank count). */
const WEREWOLF_TREE_SPEC: ReadonlyArray<{
  name: string;
  prerequisites: readonly string[];
  ranks: number;
}> = [
  { name: "Bestial Strength", prerequisites: [], ranks: 4 },
  { name: "Bury the Beast", prerequisites: ["Bestial Strength"], ranks: 1 },
  { name: "Wolf Among Men", prerequisites: ["Bury the Beast"], ranks: 1 },
  { name: "Lycanthropic Speed", prerequisites: ["Bestial Strength"], ranks: 1 },
  { name: "Lycanthropic Regen", prerequisites: ["Lycanthropic Speed"], ranks: 2 },
  { name: "Spread the Beastblood", prerequisites: ["Lycanthropic Regen"], ranks: 1 },
  { name: "Animal Vigor", prerequisites: ["Bestial Strength"], ranks: 1 },
  { name: "Infinite Duress", prerequisites: ["Animal Vigor"], ranks: 1 },
  { name: "Supernatural Strength", prerequisites: ["Animal Vigor"], ranks: 1 },
  { name: "Roadkill", prerequisites: ["Animal Vigor"], ranks: 1 },
  {
    name: "Rampage",
    prerequisites: ["Infinite Duress", "Supernatural Strength", "Roadkill"],
    ranks: 1,
  },
  { name: "Totem of Ice Brothers", prerequisites: ["Rampage"], ranks: 2 },
  { name: "Totem of the Hunt", prerequisites: ["Rampage"], ranks: 2 },
  { name: "Totem of Terror", prerequisites: ["Rampage"], ranks: 2 },
  { name: "Night Eye", prerequisites: ["Bestial Strength"], ranks: 1 },
  { name: "Feral Instincts", prerequisites: ["Bestial Strength"], ranks: 1 },
  { name: "Improved Bloodthirst", prerequisites: ["Feral Instincts"], ranks: 2 },
  { name: "Swipe", prerequisites: ["Improved Bloodthirst"], ranks: 1 },
  { name: "Gorging", prerequisites: ["Bestial Strength"], ranks: 1 },
  { name: "Savage Feeding", prerequisites: ["Gorging"], ranks: 1 },
];

describe("werewolf perk tree", () => {
  const game = getTestGameData();
  const tree = game.perkTrees.werewolf;

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
      [...WEREWOLF_TREE_SPEC.map((entry) => entry.name)].sort(),
    );

    for (const spec of WEREWOLF_TREE_SPEC) {
      const ranks = byName.get(spec.name)!;
      expect(ranks.length, spec.name).toBe(spec.ranks);

      const positions = new Set(ranks.map((perk) => `${perk.position.x},${perk.position.y}`));
      expect(positions.size, `${spec.name} should stack in one cell`).toBe(1);

      const expectedPrereqIds = spec.prerequisites.map((name) => basePerkByName(name).id);
      for (const rank of ranks) {
        expect([...rank.prerequisites].sort(), rank.id).toEqual([...expectedPrereqIds].sort());
        expect(rank.prerequisitesAny ?? []).toEqual([]);
      }
    }
  });

  it("requires all three Animal Vigor branches before Rampage", () => {
    const rampage = basePerkByName("Rampage");
    const bestial = basePerkByName("Bestial Strength");
    const vigor = basePerkByName("Animal Vigor");
    const infinite = basePerkByName("Infinite Duress");
    const supernatural = basePerkByName("Supernatural Strength");
    const roadkill = basePerkByName("Roadkill");

    const withoutRoadkill = createTestBuildState({
      selectedPerkIds: [bestial.id, vigor.id, infinite.id, supernatural.id],
    });
    expect(arePrerequisitesMet(game, withoutRoadkill, rampage)).toBe(false);

    const withAllThree = createTestBuildState({
      selectedPerkIds: [bestial.id, vigor.id, infinite.id, supernatural.id, roadkill.id],
    });
    expect(arePrerequisitesMet(game, withAllThree, rampage)).toBe(true);
  });

  it("stacks multi-rank werewolf perks in a single grid cell", () => {
    const stacks = [...groupPerksByPosition(tree).values()].filter((stack) => stack.length > 1);
    const stackedNames = stacks.map((stack) => stack[0].name).sort();
    expect(stackedNames).toEqual([
      "Bestial Strength",
      "Improved Bloodthirst",
      "Lycanthropic Regen",
      "Totem of Ice Brothers",
      "Totem of Terror",
      "Totem of the Hunt",
    ]);
  });
});
