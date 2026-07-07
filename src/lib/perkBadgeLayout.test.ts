// @vitest-environment jsdom

import { describe, expect, it } from "vitest";

import {
  estimateBadgeStackRectForPlacement,
  layoutPerkBadgePlacements,
  resolveBestPerkBadgePlacement,
  resolvePerkBadgeLayoutBounds,
  resolvePerkBadgeLayoutBoundsContainer,
} from "@/lib/perkBadgeLayout";
import { overlapArea } from "@/lib/perkTreeViewLayout";

const bounds = { top: 0, left: 0, right: 400, bottom: 400 };

describe("perkBadgeLayout", () => {
  it("prefers below when unobstructed", () => {
    const circle = { top: 100, bottom: 132, left: 100, right: 132 };
    expect(
      resolveBestPerkBadgePlacement(circle, 20, 60, bounds, []),
    ).toEqual({ side: "below", shiftX: 0 });
  });

  it("prefers below over side placement when both are unobstructed", () => {
    const circle = { top: 100, bottom: 132, left: 100, right: 132 };
    const distantNeighbor = { top: 300, bottom: 332, left: 300, right: 332 };

    expect(
      resolveBestPerkBadgePlacement(circle, 20, 60, bounds, [distantNeighbor]),
    ).toEqual({ side: "below", shiftX: 0 });
  });

  it("uses horizontal side placement when vertical sides overlap a column", () => {
    const circle = { top: 150, bottom: 182, left: 100, right: 132 };
    const belowNeighbor = { top: 188, bottom: 220, left: 100, right: 132 };
    const aboveNeighbor = { top: 112, bottom: 144, left: 100, right: 132 };

    const placement = resolveBestPerkBadgePlacement(circle, 20, 90, bounds, [
      belowNeighbor,
      aboveNeighbor,
    ]);

    expect(["left", "right"]).toContain(placement.side);
  });

  it("resolves layout bounds from the perk tree view window", () => {
    const viewport = document.createElement("div");
    viewport.setAttribute("data-perk-tree-viewport", "");
    Object.defineProperty(viewport, "getBoundingClientRect", {
      value: () =>
        ({
          top: 0,
          left: 0,
          right: 500,
          bottom: 500,
          x: 0,
          y: 0,
          width: 500,
          height: 500,
          toJSON: () => ({}),
        }) as DOMRect,
    });

    const tree = document.createElement("div");
    Object.defineProperty(tree, "getBoundingClientRect", {
      value: () =>
        ({
          top: 100,
          left: 100,
          right: 300,
          bottom: 300,
          x: 100,
          y: 100,
          width: 200,
          height: 200,
          toJSON: () => ({}),
        }) as DOMRect,
    });
    viewport.appendChild(tree);

    expect(resolvePerkBadgeLayoutBoundsContainer(tree)).toBe(viewport);
    expect(resolvePerkBadgeLayoutBounds(tree)).toEqual({
      top: 0,
      left: 0,
      right: 500,
      bottom: 500,
    });
  });

  it("lays out dense vertical chains without badge-on-circle overlap", () => {
    const nodes = [0, 1, 2, 3].map((index) => ({
      id: `node-${index}`,
      circleRect: {
        top: 80 + index * 44,
        bottom: 112 + index * 44,
        left: 100,
        right: 132,
      },
      stackHeight: 18,
      stackWidth: 96,
    }));

    const placements = layoutPerkBadgePlacements({ nodes, bounds });
    const placedRects = nodes.map((node) =>
      estimateBadgeStackRectForPlacement(
        node.circleRect,
        node.stackHeight,
        node.stackWidth,
        placements.get(node.id)!,
      ),
    );

    for (const node of nodes) {
      const placement = placements.get(node.id)!;
      const badgeRect = estimateBadgeStackRectForPlacement(
        node.circleRect,
        node.stackHeight,
        node.stackWidth,
        placement,
      );

      for (const other of nodes) {
        if (other.id === node.id) continue;
        expect(overlapArea(badgeRect, other.circleRect)).toBe(0);
      }
    }

    expect(placedRects.length).toBe(4);
  });
});
