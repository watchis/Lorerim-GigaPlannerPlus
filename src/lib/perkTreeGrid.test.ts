import { describe, expect, it } from "vitest";
import type { Perk, PerkTree } from "@/data/schemas";
import {
  computePerkTreeEdges,
  getFrontPerkIdAtPosition,
  getMinDistinctPerkCenterDistanceGrid,
  getPerkAllocationRank,
  getNextRankInStack,
  getPerkStackRank,
  formatPerkStackRank,
  canUpgradePerkStackRank,
  isPerkPartiallyAllocated,
  getPerkTreeGridBounds,
  parseSvgViewBox,
  resolvePerkNodeDiameterPx,
  resolvePerkTakeTarget,
  sortPerkStack,
} from "@/lib/perkTreeGrid";

function makePerk(id: string, skillReq: number): Perk {
  return {
    id,
    name: id,
    skillReq,
    position: { x: 1, y: 1 },
    prerequisites: [],
    description: "",
    effects: [],
    costsPerkPoint: true,
  };
}

describe("perkTreeGrid", () => {
  it("computes bounds from perk positions", () => {
    const tree: Pick<PerkTree, "perks"> = {
      perks: [
        makePerk("a", 0),
        { ...makePerk("b", 10), position: { x: 3, y: 5 } },
      ],
    };

    expect(getPerkTreeGridBounds(tree)).toEqual({
      origin: { x: 1, y: 1 },
      width: 3,
      height: 5,
    });
  });

  it("orders stacked perks by skill requirement", () => {
    const stack = [makePerk("rank-50", 50), makePerk("rank-25", 25), makePerk("rank-75", 75)];
    const sorted = sortPerkStack(stack);

    expect(sorted.map((perk) => perk.id)).toEqual(["rank-25", "rank-50", "rank-75"]);
  });

  it("reports stack rank from selected perks", () => {
    const stack = [makePerk("rank-25", 25), makePerk("rank-50", 50)];
    expect(getPerkStackRank(stack, [])).toEqual({ current: 0, total: 2 });
    expect(getPerkStackRank(stack, ["rank-25"])).toEqual({ current: 1, total: 2 });
    expect(getPerkStackRank(stack, ["rank-25", "rank-50"])).toEqual({ current: 2, total: 2 });
  });

  it("reports allocation rank for stackable perk points budgets", () => {
    const perk: Perk = {
      ...makePerk("stackable", 0),
      allocation: { kind: "perkPointsBudget" },
    };

    expect(getPerkAllocationRank(perk, [])).toEqual({ current: 0, unbounded: "X" });
    expect(getPerkAllocationRank(perk, ["stackable"])).toEqual({ current: 1, unbounded: "X" });
    expect(getPerkAllocationRank(perk, ["stackable", "stackable"])).toEqual({
      current: 2,
      unbounded: "X",
    });
  });

  it("formats stackable rank with X or infinity denominators", () => {
    expect(formatPerkStackRank({ current: 0, unbounded: "X" })).toBe("0/X");
    expect(formatPerkStackRank({ current: 3, unbounded: "infinity" })).toBe("3/∞");
    expect(formatPerkStackRank({ current: 1, total: 2 })).toBe("1/2");
  });

  it("detects upgrade availability for bounded and unbounded ranks", () => {
    expect(canUpgradePerkStackRank({ current: 1, total: 2 }, false)).toBe(true);
    expect(canUpgradePerkStackRank({ current: 2, total: 2 }, true)).toBe(false);
    expect(canUpgradePerkStackRank({ current: 2, unbounded: "X" }, true)).toBe(true);
    expect(canUpgradePerkStackRank({ current: 2, unbounded: "X" }, false)).toBe(false);
  });

  it("treats infinity allocations as always partial when selected", () => {
    const infinityRank = { current: 2, unbounded: "infinity" as const };

    expect(isPerkPartiallyAllocated(infinityRank, true, true)).toBe(true);
    expect(isPerkPartiallyAllocated(infinityRank, true, false)).toBe(true);
    expect(isPerkPartiallyAllocated(infinityRank, false, true)).toBe(false);
    expect(isPerkPartiallyAllocated({ current: 0, unbounded: "infinity" }, true, true)).toBe(
      false,
    );
  });

  it("uses upgrade availability for bounded and X unbounded partial styling", () => {
    expect(isPerkPartiallyAllocated({ current: 1, total: 2 }, true, false)).toBe(true);
    expect(isPerkPartiallyAllocated({ current: 2, total: 2 }, true, true)).toBe(false);
    expect(isPerkPartiallyAllocated({ current: 2, unbounded: "X" }, true, true)).toBe(true);
    expect(isPerkPartiallyAllocated({ current: 2, unbounded: "X" }, true, false)).toBe(false);
  });

  it("returns the next rank after the highest selected tier", () => {
    const stack = [makePerk("rank-25", 25), makePerk("rank-50", 50), makePerk("rank-75", 75)];
    expect(getNextRankInStack(stack, [])).toBeUndefined();
    expect(getNextRankInStack(stack, ["rank-25"])?.id).toBe("rank-50");
    expect(getNextRankInStack(stack, ["rank-25", "rank-50"])?.id).toBe("rank-75");
    expect(getNextRankInStack(stack, ["rank-25", "rank-50", "rank-75"])).toBeUndefined();
  });

  it("picks the front perk as the next unselected tier", () => {
    const stack = [makePerk("rank-50", 50), makePerk("rank-25", 25)];
    expect(getFrontPerkIdAtPosition(stack, [])).toBe("rank-25");
    expect(getFrontPerkIdAtPosition(stack, ["rank-25"])).toBe("rank-50");
    expect(getFrontPerkIdAtPosition(stack, ["rank-25", "rank-50"])).toBe("rank-50");
  });

  it("orders level-gated stacks by player level then rank suffix", () => {
    const stack = [
      { ...makePerk("alchemy-herbalist-r2", 0), playerLevelReq: 20 },
      { ...makePerk("alchemy-herbalist", 0), playerLevelReq: 10 },
    ];

    expect(sortPerkStack(stack).map((perk) => perk.id)).toEqual([
      "alchemy-herbalist",
      "alchemy-herbalist-r2",
    ]);
    expect(getFrontPerkIdAtPosition(stack, [])).toBe("alchemy-herbalist");
    expect(getFrontPerkIdAtPosition(stack, ["alchemy-herbalist"])).toBe("alchemy-herbalist-r2");
    expect(getNextRankInStack(stack, ["alchemy-herbalist"])?.id).toBe("alchemy-herbalist-r2");
  });

  it("parses SVG view boxes", () => {
    expect(parseSvgViewBox("0 0 100 50")).toEqual({ x: 0, y: 0, width: 100, height: 50 });
  });

  it("marks OR prerequisite edges separately from AND edges", () => {
    const tree: Pick<PerkTree, "perks"> = {
      perks: [
        { ...makePerk("root", 0), position: { x: 0, y: 0 } },
        {
          ...makePerk("and-child", 10),
          position: { x: 2, y: 0 },
          prerequisites: ["root"],
        },
        {
          ...makePerk("or-child", 10),
          position: { x: 0, y: 2 },
          prerequisites: [],
          prerequisitesAny: ["root"],
        },
      ],
    };

    const edges = computePerkTreeEdges(tree as PerkTree, []);
    expect(edges).toHaveLength(2);
    expect(edges.find((edge) => edge.kind === "all")).toBeDefined();
    expect(edges.find((edge) => edge.kind === "any")).toBeDefined();
  });

  it("measures the shortest distance between distinct perk positions", () => {
    const perks = [
      makePerk("a", 0),
      { ...makePerk("b", 0), position: { x: 2, y: 1 } },
      { ...makePerk("c", 0), position: { x: 2, y: 2 } },
    ];

    expect(getMinDistinctPerkCenterDistanceGrid(perks)).toBe(1);
  });

  it("shrinks node diameter only when adjacent perks would overlap", () => {
    const adjacentPerks = [makePerk("a", 0), { ...makePerk("b", 0), position: { x: 2, y: 1 } }];

    expect(resolvePerkNodeDiameterPx(30, getMinDistinctPerkCenterDistanceGrid(adjacentPerks))).toBe(
      30,
    );
    expect(resolvePerkNodeDiameterPx(30, Number.POSITIVE_INFINITY)).toBe(32);
  });

  it("resolves click target to the next rank when the visible tier is owned", () => {
    const stack = [makePerk("rank-25", 25), makePerk("rank-50", 50), makePerk("rank-75", 75)];

    expect(resolvePerkTakeTarget(stack, [])).toBe("rank-25");
    expect(resolvePerkTakeTarget(stack, ["rank-25"])).toBe("rank-50");
    expect(resolvePerkTakeTarget(stack, ["rank-25", "rank-50"])).toBe("rank-75");
    expect(resolvePerkTakeTarget(stack, ["rank-25", "rank-50", "rank-75"])).toBe("rank-75");
  });

  it("resolves click target to the front perk for single-rank nodes", () => {
    const stack = [makePerk("solo", 0)];
    expect(resolvePerkTakeTarget(stack, [])).toBe("solo");
    expect(resolvePerkTakeTarget(stack, ["solo"])).toBe("solo");
  });
});
