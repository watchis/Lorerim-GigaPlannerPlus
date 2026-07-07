import { describe, expect, it } from "vitest";
import {
  getBuildIssuesBannerState,
  shouldShowEasyModeLevelWarning,
  shrinkFontSizeToFit,
} from "@/lib/levelBarDisplay";

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
  const mobileSummary = "Your build has issues. Tap to see more.";
  const desktopSummary = "Your build has issues. Hover to see more.";
  const issueA = "Perk points are over budget.";
  const issueB = "Skill points are over budget.";

  it("uses the mobile summary and tooltip for any issue count on mobile", () => {
    expect(
      getBuildIssuesBannerState({
        isMobile: true,
        messages: [issueA],
        mobileSummary,
        desktopSummary,
      }),
    ).toEqual({
      displaySummary: mobileSummary,
      showTooltip: true,
    });

    expect(
      getBuildIssuesBannerState({
        isMobile: true,
        messages: [issueA, issueB],
        mobileSummary,
        desktopSummary,
      }),
    ).toEqual({
      displaySummary: mobileSummary,
      showTooltip: true,
    });
  });

  it("shows the single issue directly on desktop without a tooltip", () => {
    expect(
      getBuildIssuesBannerState({
        isMobile: false,
        messages: [issueA],
        mobileSummary,
        desktopSummary,
      }),
    ).toEqual({
      displaySummary: issueA,
      showTooltip: false,
    });
  });

  it("uses the desktop hover summary when multiple issues exist", () => {
    expect(
      getBuildIssuesBannerState({
        isMobile: false,
        messages: [issueA, issueB],
        mobileSummary,
        desktopSummary,
      }),
    ).toEqual({
      displaySummary: desktopSummary,
      showTooltip: true,
    });
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
