export const TOOLTIP_OFFSET = 12;
export const VIEWPORT_PADDING = 8;

export interface ViewportBounds {
  left: number;
  top: number;
  width: number;
  height: number;
}

export function getVisualViewportBounds(): ViewportBounds {
  if (typeof window === "undefined") {
    return { left: 0, top: 0, width: 0, height: 0 };
  }

  const viewport = window.visualViewport;
  return {
    left: viewport?.offsetLeft ?? 0,
    top: viewport?.offsetTop ?? 0,
    width: viewport?.width ?? window.innerWidth,
    height: viewport?.height ?? window.innerHeight,
  };
}

export function clampAxis(
  preferred: number,
  min: number,
  max: number,
  size: number,
  boundsStart: number,
  boundsSize: number,
): number {
  if (size >= boundsSize - VIEWPORT_PADDING * 2) {
    return boundsStart + Math.max(VIEWPORT_PADDING, (boundsSize - size) / 2);
  }
  if (max < min) return boundsStart + (boundsSize - size) / 2;
  return Math.min(Math.max(preferred, min), max);
}

export function resolveCursorTooltipPosition(
  anchorX: number,
  anchorY: number,
  width: number,
  height: number,
  bounds: ViewportBounds = getVisualViewportBounds(),
): { x: number; y: number } {
  const padding = VIEWPORT_PADDING;
  const offset = TOOLTIP_OFFSET;
  const minX = bounds.left + padding;
  const minY = bounds.top + padding;
  const maxX = bounds.left + bounds.width - width - padding;
  const maxY = bounds.top + bounds.height - height - padding;

  const fits = (x: number, y: number) => x >= minX && y >= minY && x <= maxX && y <= maxY;

  const placements = [
    { x: anchorX + offset, y: anchorY + offset },
    { x: anchorX - width - offset, y: anchorY + offset },
    { x: anchorX + offset, y: anchorY - height - offset },
    { x: anchorX - width - offset, y: anchorY - height - offset },
    { x: anchorX - width / 2, y: anchorY + offset },
    { x: anchorX - width / 2, y: anchorY - height - offset },
    { x: anchorX + offset, y: anchorY - height / 2 },
    { x: anchorX - width - offset, y: anchorY - height / 2 },
  ];

  for (const placement of placements) {
    if (fits(placement.x, placement.y)) return placement;
  }

  return {
    x: clampAxis(anchorX + offset, minX, maxX, width, bounds.left, bounds.width),
    y: clampAxis(anchorY + offset, minY, maxY, height, bounds.top, bounds.height),
  };
}
