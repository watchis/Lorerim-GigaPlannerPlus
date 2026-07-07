/**
 * Markdown toolbar overflow priority.
 *
 * When the toolbar is narrower than its contents, items are removed in
 * `MARKDOWN_TOOLBAR_REMOVAL_ORDER` (first = lowest priority). The most-used
 * formats stay visible the longest.
 *
 * Removal order (first hidden → last hidden):
 * 1. Blockquote
 * 2. Code block
 * 3. Numbered list
 * 4. Strikethrough
 * 5. Link
 * 6. Inline code
 * 7. Heading
 * 8. Bullet list
 * 9. Horizontal rule
 * 10. Image
 * 11. Italic
 * 12. Bold (kept until everything else is gone)
 */
export type MarkdownToolbarItemId =
  | "heading"
  | "bold"
  | "italic"
  | "strikethrough"
  | "code"
  | "codeBlock"
  | "link"
  | "image"
  | "list"
  | "orderedList"
  | "blockquote"
  | "horizontalRule";

export const MARKDOWN_TOOLBAR_REMOVAL_ORDER: readonly MarkdownToolbarItemId[] = [
  "blockquote",
  "codeBlock",
  "orderedList",
  "strikethrough",
  "link",
  "code",
  "heading",
  "list",
  "horizontalRule",
  "image",
  "italic",
  "bold",
] as const;

export const MARKDOWN_TOOLBAR_DISPLAY_ORDER: readonly MarkdownToolbarItemId[] = [
  "heading",
  "bold",
  "italic",
  "strikethrough",
  "code",
  "codeBlock",
  "link",
  "image",
  "list",
  "orderedList",
  "blockquote",
  "horizontalRule",
] as const;

export const MARKDOWN_TOOLBAR_GROUPS: readonly (readonly MarkdownToolbarItemId[])[] = [
  ["heading", "bold", "italic", "strikethrough"],
  ["code", "codeBlock", "link", "image"],
  ["list", "orderedList", "blockquote", "horizontalRule"],
] as const;

export interface MarkdownToolbarLayoutMetrics {
  containerWidth: number;
  buttonWidth: number;
  gapWidth: number;
  framePaddingX: number;
  dividerWidth: number;
}

function visibleItemsFromHidden(hidden: ReadonlySet<MarkdownToolbarItemId>): MarkdownToolbarItemId[] {
  return MARKDOWN_TOOLBAR_DISPLAY_ORDER.filter((itemId) => !hidden.has(itemId));
}

export function countMarkdownToolbarDividers(visible: readonly MarkdownToolbarItemId[]): number {
  let dividers = 0;

  for (let groupIndex = 1; groupIndex < MARKDOWN_TOOLBAR_GROUPS.length; groupIndex += 1) {
    const previousGroup = MARKDOWN_TOOLBAR_GROUPS[groupIndex - 1];
    const currentGroup = MARKDOWN_TOOLBAR_GROUPS[groupIndex];
    const previousVisible = previousGroup.some((itemId) => visible.includes(itemId));
    const currentVisible = currentGroup.some((itemId) => visible.includes(itemId));
    if (previousVisible && currentVisible) dividers += 1;
  }

  return dividers;
}

export function measureMarkdownToolbarWidth(
  metrics: MarkdownToolbarLayoutMetrics,
  hidden: ReadonlySet<MarkdownToolbarItemId>,
): number {
  const visible = visibleItemsFromHidden(hidden);
  if (visible.length === 0) return 0;

  const { buttonWidth, gapWidth, framePaddingX, dividerWidth } = metrics;
  const dividers = countMarkdownToolbarDividers(visible);
  const gaps = Math.max(0, visible.length + dividers - 1);

  return framePaddingX + visible.length * buttonWidth + dividers * dividerWidth + gaps * gapWidth;
}

export function computeHiddenMarkdownToolbarItems(
  metrics: MarkdownToolbarLayoutMetrics,
): ReadonlySet<MarkdownToolbarItemId> {
  const hidden = new Set<MarkdownToolbarItemId>();

  if (metrics.containerWidth <= 0) {
    return hidden;
  }

  if (measureMarkdownToolbarWidth(metrics, hidden) <= metrics.containerWidth) {
    return hidden;
  }

  for (const itemId of MARKDOWN_TOOLBAR_REMOVAL_ORDER) {
    hidden.add(itemId);
    if (measureMarkdownToolbarWidth(metrics, hidden) <= metrics.containerWidth) {
      break;
    }
  }

  return hidden;
}

export function shouldShowMarkdownToolbarDivider(
  afterGroupIndex: number,
  hidden: ReadonlySet<MarkdownToolbarItemId>,
): boolean {
  const previousGroup = MARKDOWN_TOOLBAR_GROUPS[afterGroupIndex];
  const nextGroup = MARKDOWN_TOOLBAR_GROUPS[afterGroupIndex + 1];
  if (!previousGroup || !nextGroup) return false;

  const previousVisible = previousGroup.some((itemId) => !hidden.has(itemId));
  const nextVisible = nextGroup.some((itemId) => !hidden.has(itemId));
  return previousVisible && nextVisible;
}

export function isMarkdownToolbarItemVisible(
  itemId: MarkdownToolbarItemId,
  hidden: ReadonlySet<MarkdownToolbarItemId>,
): boolean {
  return !hidden.has(itemId);
}

export function readMarkdownToolbarLayoutMetrics(container: HTMLElement): MarkdownToolbarLayoutMetrics {
  const style = getComputedStyle(container);
  const gapWidth = parseFloat(style.columnGap || style.gap) || 0;
  const framePaddingX = parseFloat(style.paddingLeft) + parseFloat(style.paddingRight);
  const probe = container.querySelector<HTMLElement>("[data-toolbar-probe]");
  const buttonWidth = probe?.offsetWidth ?? 28;
  const dividerWidth = 1 + gapWidth;

  return {
    containerWidth: container.clientWidth,
    buttonWidth,
    gapWidth,
    framePaddingX,
    dividerWidth,
  };
}
