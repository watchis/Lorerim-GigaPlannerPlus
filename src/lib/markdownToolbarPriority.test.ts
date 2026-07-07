import { describe, expect, it } from "vitest";
import {
  MARKDOWN_TOOLBAR_REMOVAL_ORDER,
  computeHiddenMarkdownToolbarItems,
  countMarkdownToolbarDividers,
  measureMarkdownToolbarWidth,
  shouldShowMarkdownToolbarDivider,
  type MarkdownToolbarItemId,
} from "@/lib/markdownToolbarPriority";

const baseMetrics = {
  containerWidth: 400,
  buttonWidth: 28,
  gapWidth: 4,
  framePaddingX: 4,
  dividerWidth: 5,
} as const;

describe("markdownToolbarPriority", () => {
  it("keeps every item visible when the toolbar fits", () => {
    const hidden = computeHiddenMarkdownToolbarItems({
      ...baseMetrics,
      containerWidth: 600,
    });

    expect(hidden.size).toBe(0);
  });

  it("removes the lowest-priority item first when space is tight", () => {
    const fullWidth = measureMarkdownToolbarWidth(baseMetrics, new Set());
    const hidden = computeHiddenMarkdownToolbarItems({
      ...baseMetrics,
      containerWidth: fullWidth - 1,
    });

    expect(hidden.has("horizontalRule")).toBe(true);
    expect(hidden.has("bold")).toBe(false);
    expect(hidden.has("italic")).toBe(false);
  });

  it("removes items in priority order as the container shrinks", () => {
    let hidden = new Set<MarkdownToolbarItemId>();

    for (const itemId of MARKDOWN_TOOLBAR_REMOVAL_ORDER) {
      const nextHidden = computeHiddenMarkdownToolbarItems({
        ...baseMetrics,
        containerWidth: measureMarkdownToolbarWidth(baseMetrics, hidden) - 1,
      });
      expect(nextHidden.has(itemId)).toBe(true);
      hidden = new Set(nextHidden);
    }
  });

  it("keeps bold visible until every lower-priority item is hidden", () => {
    const hidden = computeHiddenMarkdownToolbarItems({
      ...baseMetrics,
      containerWidth: 40,
    });

    expect(hidden.has("bold")).toBe(false);
    expect(hidden.size).toBe(MARKDOWN_TOOLBAR_REMOVAL_ORDER.length - 1);
  });

  it("counts dividers only between groups that still have visible items", () => {
    const hidden = new Set(["horizontalRule", "image", "codeBlock", "blockquote", "orderedList"]);

    expect(
      countMarkdownToolbarDividers([
        "heading",
        "bold",
        "italic",
        "strikethrough",
        "code",
        "link",
        "list",
      ]),
    ).toBe(2);

    expect(shouldShowMarkdownToolbarDivider(0, hidden)).toBe(true);
    expect(shouldShowMarkdownToolbarDivider(1, hidden)).toBe(true);
    expect(shouldShowMarkdownToolbarDivider(0, new Set())).toBe(true);
    expect(
      shouldShowMarkdownToolbarDivider(
        0,
        new Set(["code", "codeBlock", "link", "image", "list", "orderedList", "blockquote", "horizontalRule"]),
      ),
    ).toBe(false);
    expect(shouldShowMarkdownToolbarDivider(1, new Set(["code", "codeBlock", "link", "image"]))).toBe(false);
  });
});
