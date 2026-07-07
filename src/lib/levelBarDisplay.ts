export function shouldShowEasyModeLevelWarning(
  playerLevel: number,
  standardMaxPlayerLevel: number,
): boolean {
  return playerLevel > standardMaxPlayerLevel;
}

export interface BuildIssuesBannerState {
  displaySummary: string;
  showTooltip: boolean;
}

export function formatBuildIssuesSummary(template: string, count: number): string {
  const issues = count === 1 ? "issue" : "issues";
  return template.replace("{count}", String(count)).replace("{issues}", issues);
}

export function getBuildIssuesBannerState({
  isMobile,
  messages,
  mobileSummaryTemplate,
  desktopSummaryTemplate,
}: {
  isMobile: boolean;
  messages: string[];
  mobileSummaryTemplate: string;
  desktopSummaryTemplate: string;
}): BuildIssuesBannerState {
  const count = messages.length;
  const displaySummary = isMobile
    ? formatBuildIssuesSummary(mobileSummaryTemplate, count)
    : count > 1
      ? formatBuildIssuesSummary(desktopSummaryTemplate, count)
      : (messages[0] ?? "");

  return {
    displaySummary,
    showTooltip: isMobile || messages.length > 1,
  };
}

export const BUILD_ISSUES_TOOLTIP_MAX_HEIGHT_RATIO = 0.75;
export const BUILD_ISSUES_TOOLTIP_ITEM_GAP_PX = 6;

export function getBuildIssuesTooltipMaxHeight(
  viewportHeight: number,
  ratio = BUILD_ISSUES_TOOLTIP_MAX_HEIGHT_RATIO,
): number {
  return viewportHeight * ratio;
}

export function computeVisibleBuildIssueCount(
  itemHeights: number[],
  andMoreHeight: number,
  gap: number,
  maxHeight: number,
): number {
  const total = itemHeights.length;
  if (total === 0) return 0;
  if (total === 1) return 1;

  const stackHeight = (count: number, includeAndMore: boolean) => {
    const itemsHeight = itemHeights.slice(0, count).reduce((sum, height) => sum + height, 0);
    const gaps = gap * Math.max(0, count - 1);
    const overflowRow = includeAndMore ? gap + andMoreHeight : 0;
    return itemsHeight + gaps + overflowRow;
  };

  for (let count = total; count >= 1; count--) {
    if (stackHeight(count, count < total) <= maxHeight) {
      return count;
    }
  }

  return 1;
}

/** Shrinks font size assuming text width scales linearly with font size. */
export function shrinkFontSizeToFit(
  maxFontSize: number,
  minFontSize: number,
  textWidthAtMaxFontSize: number,
  containerWidth: number,
  step = 0.5,
): number {
  if (containerWidth <= 0 || textWidthAtMaxFontSize <= containerWidth) {
    return maxFontSize;
  }

  const stepUnits = Math.max(1, Math.round(step * 2));
  const minUnits = Math.round(minFontSize * 2);
  const maxUnits = Math.round(maxFontSize * 2);

  for (let units = maxUnits; units >= minUnits; units -= stepUnits) {
    const size = units / 2;
    const scaledWidth = textWidthAtMaxFontSize * (size / maxFontSize);
    if (scaledWidth <= containerWidth) {
      return size;
    }
  }

  return minFontSize;
}
