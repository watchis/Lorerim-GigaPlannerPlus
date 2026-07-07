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

    expect(hidden.has("blockquote")).toBe(true);
    expect(hidden.has("bold")).toBe(false);
    expect(hidden.has("italic")).toBe(false);
  });

  it("drops code block and blockquote before image and horizontal rule", () => {
    const blockquoteHidden = computeHiddenMarkdownToolbarItems({
      ...baseMetrics,
      containerWidth: measureMarkdownToolbarWidth(baseMetrics, new Set()) - 1,
    });
    expect(blockquoteHidden.has("codeBlock")).toBe(false);
    expect(blockquoteHidden.has("horizontalRule")).toBe(false);
    expect(blockquoteHidden.has("image")).toBe(false);

    const codeBlockHidden = computeHiddenMarkdownToolbarItems({
      ...baseMetrics,
      containerWidth: measureMarkdownToolbarWidth(baseMetrics, new Set(["blockquote"])) - 1,
    });
    expect(codeBlockHidden.has("codeBlock")).toBe(true);
    expect(codeBlockHidden.has("horizontalRule")).toBe(false);
    expect(codeBlockHidden.has("image")).toBe(false);

    let hidden = new Set<MarkdownToolbarItemId>();
    for (const itemId of ["blockquote", "codeBlock", "orderedList", "strikethrough", "link", "code", "heading", "list"] as const) {
      hidden = new Set(
        computeHiddenMarkdownToolbarItems({
          ...baseMetrics,
          containerWidth: measureMarkdownToolbarWidth(baseMetrics, hidden) - 1,
        }),
      );
      expect(hidden.has(itemId)).toBe(true);
    }

    const beforeStructural = computeHiddenMarkdownToolbarItems({
      ...baseMetrics,
      containerWidth: measureMarkdownToolbarWidth(baseMetrics, hidden) - 1,
    });
    expect(beforeStructural.has("horizontalRule")).toBe(true);
    expect(beforeStructural.has("image")).toBe(false);
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
    const hidden = new Set<MarkdownToolbarItemId>([
      "blockquote",
      "codeBlock",
      "orderedList",
      "horizontalRule",
      "image",
    ]);

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
    expect(shouldShowMarkdownToolbarDivider(0, new Set<MarkdownToolbarItemId>())).toBe(true);
    expect(
      shouldShowMarkdownToolbarDivider(
        0,
        new Set<MarkdownToolbarItemId>([
          "code",
          "codeBlock",
          "link",
          "image",
          "list",
          "orderedList",
          "blockquote",
          "horizontalRule",
        ]),
      ),
    ).toBe(false);
    expect(
      shouldShowMarkdownToolbarDivider(
        1,
        new Set<MarkdownToolbarItemId>(["code", "codeBlock", "link", "image"]),
      ),
    ).toBe(false);
  });
});
