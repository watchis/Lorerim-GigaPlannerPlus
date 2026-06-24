import { describe, expect, it } from "vitest";
import type { Perk, PerkTree } from "@/data/schemas";
import {
  computePerkTreeEdges,
  getFrontPerkIdAtPosition,
  getNextRankInStack,
  getPerkStackRank,
  getPerkTreeGridBounds,
  parseSvgViewBox,
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
    expect(getFrontPerkIdAtPosition(stack, ["rank-25", "rank-50"])).toBe("rank-50");
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
});
