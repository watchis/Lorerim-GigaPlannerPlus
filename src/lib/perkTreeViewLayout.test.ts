// @vitest-environment jsdom

import { describe, expect, it } from "vitest";
import type { Perk } from "@/data/schemas";
import {
  clampTreeViewTransform,
  clampTreeZoom,
  computeFitContainSize,
  DEFAULT_TREE_VIEW_TRANSFORM,
  estimatePerkBadgeStackHeight,
  getFitLayoutTuning,
  getTouchDistance,
  getViewportPointFromCenter,
  isPerkTreeInteractiveTarget,
  perkAbbreviation,
  resolvePerkBadgePlacement,
  resolvePerkTooltipScale,
  resolveTreeEdgePaddingPx,
  zoomTreeViewAtPoint,
} from "@/lib/perkTreeViewLayout";

function makePerk(id: string): Perk {
  return {
    id,
    name: id,
    skillReq: 0,
    position: { x: 0, y: 0 },
    prerequisites: [],
    description: "",
    effects: [],
    costsPerkPoint: true,
  };
}

describe("perkTreeViewLayout", () => {
  describe("clampTreeZoom", () => {
    it("clamps zoom between min and max", () => {
      expect(clampTreeZoom(0.5)).toBe(1);
      expect(clampTreeZoom(1)).toBe(1);
      expect(clampTreeZoom(2)).toBe(2);
      expect(clampTreeZoom(5)).toBe(2.5);
    });
  });

  describe("zoomTreeViewAtPoint", () => {
    it("resets to default when zooming back to minimum", () => {
      const transform = { zoom: 2, panX: 40, panY: -20 };
      expect(zoomTreeViewAtPoint(transform, 1, 0, 0)).toEqual(DEFAULT_TREE_VIEW_TRANSFORM);
    });

    it("keeps the pivot point stable while zooming in", () => {
      const transform = { zoom: 1, panX: 0, panY: 0 };
      const next = zoomTreeViewAtPoint(transform, 2, 50, 25);
      expect(next.zoom).toBe(2);
      expect(next.panX).toBe(-50);
      expect(next.panY).toBe(-25);
    });
  });

  describe("clampTreeViewTransform", () => {
    it("keeps at least a minimum visible region when panned far away", () => {
      const context = {
        viewport: { width: 400, height: 300 },
        fitSize: { width: 320, height: 240 },
        nodeDiameterPx: 32,
      };
      const clamped = clampTreeViewTransform(
        { zoom: 2, panX: 10_000, panY: -10_000 },
        context,
      );

      expect(clamped.zoom).toBe(2);
      expect(clamped.panX).toBeLessThan(10_000);
      expect(clamped.panY).toBeGreaterThan(-10_000);
      expect(Math.abs(clamped.panX)).toBeLessThan(500);
      expect(Math.abs(clamped.panY)).toBeLessThan(500);
    });
  });

  describe("getFitLayoutTuning", () => {
    it("uses tighter insets on very small viewports", () => {
      const small = getFitLayoutTuning(320, 568);
      const medium = getFitLayoutTuning(400, 700);
      const large = getFitLayoutTuning(1200, 800);

      expect(small.regionInsetRatio).toBeGreaterThan(large.regionInsetRatio);
      expect(small.nodeBaseDiameterPx).toBeGreaterThan(large.nodeBaseDiameterPx);
      expect(medium.edgePaddingPx).toBeLessThan(large.edgePaddingPx);
    });
  });

  describe("resolvePerkTooltipScale", () => {
    it("scales down on small nodes and narrow viewports", () => {
      expect(resolvePerkTooltipScale(32, 500)).toBeCloseTo(1, 2);
      expect(resolvePerkTooltipScale(14, 320)).toBeLessThan(1);
      expect(resolvePerkTooltipScale(14, 320)).toBeGreaterThanOrEqual(0.8);
    });
  });

  describe("computeFitContainSize", () => {
    it("fits a wide aspect inside a portrait container by width", () => {
      const size = computeFitContainSize(300, 500, 2, 1);
      expect(size.width).toBe(300);
      expect(size.height).toBe(150);
    });

    it("fits a tall aspect inside a landscape container by height", () => {
      const size = computeFitContainSize(500, 300, 0.5, 1);
      expect(size.height).toBe(300);
      expect(size.width).toBe(150);
    });

    it("applies region inset ratio", () => {
      const full = computeFitContainSize(400, 400, 1, 1);
      const inset = computeFitContainSize(400, 400, 1, 0.9);
      expect(inset.width).toBeCloseTo(full.width * 0.9);
      expect(inset.height).toBeCloseTo(full.height * 0.9);
    });
  });

  describe("resolveTreeEdgePaddingPx", () => {
    it("includes half the node diameter plus edge padding", () => {
      expect(resolveTreeEdgePaddingPx(32, 6)).toBe(22);
      expect(resolveTreeEdgePaddingPx(33, 6)).toBe(23);
    });
  });

  describe("perkAbbreviation", () => {
    it("uses first letters of the first two words", () => {
      expect(perkAbbreviation("Stealth Archer")).toBe("SA");
    });

    it("falls back to the first two letters for single-word names", () => {
      expect(perkAbbreviation("Smithing")).toBe("SM");
    });

    it("returns ? when no letters are present", () => {
      expect(perkAbbreviation("123")).toBe("?");
    });
  });

  describe("estimatePerkBadgeStackHeight", () => {
    it("returns zero for no badges", () => {
      expect(estimatePerkBadgeStackHeight(0)).toBe(0);
    });

    it("grows with badge count", () => {
      expect(estimatePerkBadgeStackHeight(1)).toBe(20);
      expect(estimatePerkBadgeStackHeight(2)).toBeGreaterThan(estimatePerkBadgeStackHeight(1));
    });
  });

  describe("resolvePerkBadgePlacement", () => {
    it("prefers below when there is room", () => {
      expect(resolvePerkBadgePlacement(100, 132, 20, { top: 0, bottom: 300 })).toBe(false);
    });

    it("flips above when below is cramped and above has more room", () => {
      expect(resolvePerkBadgePlacement(280, 312, 20, { top: 0, bottom: 320 })).toBe(true);
    });
  });

  describe("getTouchDistance", () => {
    it("returns zero for fewer than two touches", () => {
      expect(getTouchDistance({ length: 1, 0: { clientX: 0, clientY: 0 } as Touch })).toBe(0);
    });

    it("measures distance between two touch points", () => {
      const touches = {
        length: 2,
        0: { clientX: 0, clientY: 0 } as Touch,
        1: { clientX: 3, clientY: 4 } as Touch,
      };
      expect(getTouchDistance(touches)).toBe(5);
    });
  });

  describe("isPerkTreeInteractiveTarget", () => {
    it("detects perk nodes and buttons", () => {
      const perkNode = document.createElement("button");
      perkNode.setAttribute("data-perk-node", "");
      expect(isPerkTreeInteractiveTarget(perkNode)).toBe(true);

      const button = document.createElement("button");
      expect(isPerkTreeInteractiveTarget(button)).toBe(true);

      const div = document.createElement("div");
      expect(isPerkTreeInteractiveTarget(div)).toBe(false);
    });
  });

  describe("getViewportPointFromCenter", () => {
    it("converts client coordinates to viewport-centered points", () => {
      const viewport = document.createElement("div");
      viewport.getBoundingClientRect = () =>
        ({
          left: 100,
          top: 50,
          width: 200,
          height: 100,
          right: 300,
          bottom: 150,
          x: 100,
          y: 50,
          toJSON: () => ({}),
        }) as DOMRect;

      expect(getViewportPointFromCenter(viewport, 200, 100)).toEqual({ x: 0, y: 0 });
      expect(getViewportPointFromCenter(viewport, 300, 150)).toEqual({ x: 100, y: 50 });
    });
  });

  describe("resolveTreeLayoutMetrics integration", () => {
    it("returns stable non-fit metrics", async () => {
      const { resolveTreeLayoutMetrics } = await import("@/lib/perkTreeViewLayout");
      const perks = [makePerk("a"), { ...makePerk("b"), position: { x: 2, y: 1 } }];
      const tuning = getFitLayoutTuning(1200, 800);
      const metrics = resolveTreeLayoutMetrics(
        { width: 4, height: 3 },
        false,
        null,
        perks,
        tuning,
      );

      expect(metrics.gridUnitPx).toBe(26);
      expect(metrics.nodeDiameterPx).toBeGreaterThan(0);
      expect(metrics.treeEdgePaddingPx).toBeGreaterThan(metrics.nodeDiameterPx / 2);
    });
  });
});
