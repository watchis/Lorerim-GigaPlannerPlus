import { describe, expect, it } from "vitest";
import {
  clampAxis,
  resolveCursorTooltipPosition,
  TOOLTIP_OFFSET,
  VIEWPORT_PADDING,
} from "@/lib/tooltipPosition";

const BOUNDS = { left: 0, top: 0, width: 400, height: 300 };

describe("tooltipPosition", () => {
  describe("clampAxis", () => {
    it("centers oversized content within bounds", () => {
      expect(clampAxis(0, 10, 20, 380, 0, 400)).toBe(10);
    });

    it("clamps preferred position between min and max", () => {
      expect(clampAxis(5, 10, 20, 50, 0, 400)).toBe(10);
      expect(clampAxis(25, 10, 20, 50, 0, 400)).toBe(20);
      expect(clampAxis(15, 10, 20, 50, 0, 400)).toBe(15);
    });

    it("centers when min exceeds max", () => {
      expect(clampAxis(100, 200, 50, 50, 0, 400)).toBe(175);
    });
  });

  describe("resolveCursorTooltipPosition", () => {
    it("places tooltip below-right of anchor when space allows", () => {
      const position = resolveCursorTooltipPosition(100, 100, 120, 60, BOUNDS);
      expect(position).toEqual({
        x: 100 + TOOLTIP_OFFSET,
        y: 100 + TOOLTIP_OFFSET,
      });
    });

    it("flips left when right side is cramped", () => {
      const position = resolveCursorTooltipPosition(350, 100, 120, 60, BOUNDS);
      expect(position.x).toBe(350 - 120 - TOOLTIP_OFFSET);
      expect(position.y).toBe(100 + TOOLTIP_OFFSET);
    });

    it("flips above when below is cramped", () => {
      const position = resolveCursorTooltipPosition(100, 250, 120, 60, BOUNDS);
      expect(position.x).toBe(100 + TOOLTIP_OFFSET);
      expect(position.y).toBe(250 - 60 - TOOLTIP_OFFSET);
    });

    it("clamps when no placement fits cleanly", () => {
      const position = resolveCursorTooltipPosition(10, 10, 380, 280, BOUNDS);
      expect(position.x).toBeGreaterThanOrEqual(VIEWPORT_PADDING);
      expect(position.y).toBeGreaterThanOrEqual(VIEWPORT_PADDING);
      expect(position.x + 380).toBeLessThanOrEqual(BOUNDS.width - VIEWPORT_PADDING);
      expect(position.y + 280).toBeLessThanOrEqual(BOUNDS.height - VIEWPORT_PADDING);
    });

    it("respects viewport offset in bounds", () => {
      const offsetBounds = { left: 50, top: 40, width: 300, height: 200 };
      const position = resolveCursorTooltipPosition(100, 100, 80, 40, offsetBounds);
      expect(position.x).toBeGreaterThanOrEqual(50 + VIEWPORT_PADDING);
      expect(position.y).toBeGreaterThanOrEqual(40 + VIEWPORT_PADDING);
    });
  });
});
