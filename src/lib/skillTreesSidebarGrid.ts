export interface SkillTreesSidebarGridColumnsParams {
  /** Width of the sidebar grid container in px. */
  containerWidthPx: number;
  /**
   * Pixel gap between columns (e.g. gap-1 = 4px, gap-1.5 = 6px).
   * Used to approximate available card width.
   */
  gapPx: number;
  /**
   * Card width we consider "original" when rendering 3 columns.
   * The switch to 2 columns happens when the hypothetical 3-col card width
   * reaches half of this value.
   */
  originalCardWidthPx: number;
}

/**
 * Returns the sidebar mini-tree grid columns (2 or 3).
 *
 * Switch-to-2 threshold:
 * - Compute hypothetical card width under a 3-column layout:
 *   (containerWidth - gapPx*(3-1)) / 3
 * - Use 3 columns only while that width >= originalCardWidth/2.
 */
export function getSkillTreesSidebarGridColumns({
  containerWidthPx,
  gapPx,
  originalCardWidthPx,
}: SkillTreesSidebarGridColumnsParams): 2 | 3 {
  if (!Number.isFinite(containerWidthPx) || containerWidthPx <= 0) return 2;

  const gapTotalForThree = gapPx * (3 - 1);
  const widthForThreeColumns = (containerWidthPx - gapTotalForThree) / 3;
  const halfOriginal = originalCardWidthPx / 2;

  return widthForThreeColumns >= halfOriginal ? 3 : 2;
}

