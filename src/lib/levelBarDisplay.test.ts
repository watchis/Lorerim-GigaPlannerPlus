import { describe, expect, it } from "vitest";
import {
  computeVisibleBuildIssueCount,
  formatBuildIssuesSummary,
  getBuildIssuesBannerState,
  getBuildIssuesTooltipContentMaxHeight,
  getBuildIssuesTooltipMaxHeight,
  shouldShowEasyModeLevelWarning,
  shrinkFontSizeToFit,
} from "@/lib/levelBarDisplay";

const mobileTemplate = "Your build has {count} {issues}. Tap to see more.";
const desktopTemplate = "Your build has {count} {issues}. Hover to see more.";

describe("formatBuildIssuesSummary", () => {
  it("uses singular issue for a count of 1", () => {
    expect(formatBuildIssuesSummary(mobileTemplate, 1)).toBe(
      "Your build has 1 issue. Tap to see more.",
    );
    expect(formatBuildIssuesSummary(desktopTemplate, 1)).toBe(
      "Your build has 1 issue. Hover to see more.",
    );
  });

  it("uses plural issues for counts greater than 1", () => {
    expect(formatBuildIssuesSummary(mobileTemplate, 3)).toBe(
      "Your build has 3 issues. Tap to see more.",
    );
    expect(formatBuildIssuesSummary(desktopTemplate, 2)).toBe(
      "Your build has 2 issues. Hover to see more.",
    );
  });
});

describe("shouldShowEasyModeLevelWarning", () => {
  it("is false at or below the standard max player level", () => {
    expect(shouldShowEasyModeLevelWarning(101, 101)).toBe(false);
    expect(shouldShowEasyModeLevelWarning(100, 101)).toBe(false);
    expect(shouldShowEasyModeLevelWarning(1, 101)).toBe(false);
  });

  it("is true above the standard max player level", () => {
    expect(shouldShowEasyModeLevelWarning(102, 101)).toBe(true);
    expect(shouldShowEasyModeLevelWarning(201, 101)).toBe(true);
  });
});

describe("getBuildIssuesBannerState", () => {
  const issueA = "Perk points are over budget.";
  const issueB = "Skill points are over budget.";
  const issueC = "Training is over budget.";

  it("uses the mobile summary with issue count and tooltip for any issue count", () => {
    expect(
      getBuildIssuesBannerState({
        isMobile: true,
        messages: [issueA],
        mobileSummaryTemplate: mobileTemplate,
        desktopSummaryTemplate: desktopTemplate,
      }),
    ).toEqual({
      displaySummary: "Your build has 1 issue. Tap to see more.",
      showTooltip: true,
    });

    expect(
      getBuildIssuesBannerState({
        isMobile: true,
        messages: [issueA, issueB, issueC],
        mobileSummaryTemplate: mobileTemplate,
        desktopSummaryTemplate: desktopTemplate,
      }),
    ).toEqual({
      displaySummary: "Your build has 3 issues. Tap to see more.",
      showTooltip: true,
    });
  });

  it("shows the single issue directly on desktop without a tooltip", () => {
    expect(
      getBuildIssuesBannerState({
        isMobile: false,
        messages: [issueA],
        mobileSummaryTemplate: mobileTemplate,
        desktopSummaryTemplate: desktopTemplate,
      }),
    ).toEqual({
      displaySummary: issueA,
      showTooltip: false,
    });
  });

  it("uses the desktop hover summary with issue count when multiple issues exist", () => {
    expect(
      getBuildIssuesBannerState({
        isMobile: false,
        messages: [issueA, issueB],
        mobileSummaryTemplate: mobileTemplate,
        desktopSummaryTemplate: desktopTemplate,
      }),
    ).toEqual({
      displaySummary: "Your build has 2 issues. Hover to see more.",
      showTooltip: true,
    });
  });
});

describe("computeVisibleBuildIssueCount", () => {
  const gap = 6;
  const andMoreHeight = 20;

  it("shows every issue when they all fit within the max height", () => {
    expect(computeVisibleBuildIssueCount([20, 20, 20], andMoreHeight, gap, 200)).toBe(3);
  });

  it("reduces visible issues and reserves space for the overflow row", () => {
    expect(computeVisibleBuildIssueCount([40, 40, 40], andMoreHeight, gap, 100)).toBe(1);
    expect(computeVisibleBuildIssueCount([30, 30, 30], andMoreHeight, gap, 100)).toBe(2);
  });

  it("always shows at least one issue", () => {
    expect(computeVisibleBuildIssueCount([80, 80], andMoreHeight, gap, 50)).toBe(1);
  });
});

describe("getBuildIssuesTooltipMaxHeight", () => {
  it("uses 75% of the viewport height by default", () => {
    expect(getBuildIssuesTooltipMaxHeight(800)).toBe(600);
  });
});

describe("getBuildIssuesTooltipContentMaxHeight", () => {
  it("subtracts tooltip vertical padding from the tooltip max height", () => {
    expect(getBuildIssuesTooltipContentMaxHeight(800)).toBe(584);
  });
});

describe("shrinkFontSizeToFit", () => {
  it("keeps the max font size when the text already fits", () => {
    expect(shrinkFontSizeToFit(14, 9, 120, 160)).toBe(14);
  });

  it("shrinks proportionally until the text fits above the configured minimum", () => {
    expect(shrinkFontSizeToFit(14, 6, 280, 140)).toBe(7);
  });

  it("never goes below the minimum font size even when text would still overflow", () => {
    expect(shrinkFontSizeToFit(14, 9, 280, 140)).toBe(9);
  });
});
