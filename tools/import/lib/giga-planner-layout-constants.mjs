/** Reference grid used to convert legacy GigaPlanner percent coords to cell positions. */
export const GIGA_LAYOUT_GRID = { width: 20, height: 45 };

export function gigaPercentToGrid(xPos, yPos, grid = GIGA_LAYOUT_GRID) {
  return {
    x: Math.round((xPos / 100) * (grid.width - 1)),
    y: Math.round((yPos / 100) * (grid.height - 1)),
  };
}
