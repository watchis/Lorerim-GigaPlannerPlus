export interface TextSelection {
  start: number;
  end: number;
}

export interface TextEditResult {
  value: string;
  selectionStart: number;
  selectionEnd: number;
}

export type MarkdownFormat =
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
  | "horizontalRule"
  | "normalText"
  | `heading-${1 | 2 | 3 | 4 | 5 | 6}`;

const HEADING_PREFIX_PATTERN = /^#{1,6}\s+/;
const ORDERED_LIST_PREFIX_PATTERN = /^\d+\.\s+/;
const LINK_PATTERN = /^\[([^\]]*)\]\(([^)]*)\)$/;
const IMAGE_PATTERN = /^!\[([^\]]*)\]\(([^)]*)\)$/;
const FENCED_CODE_BLOCK_PATTERN = /^```(?:\r?\n([\s\S]*?)\r?\n```|([\s\S]*?)```)$/;

export function lineBounds(text: string, index: number): { lineStart: number; lineEnd: number } {
  const lineStart = text.lastIndexOf("\n", index - 1) + 1;
  const nextBreak = text.indexOf("\n", index);
  const lineEnd = nextBreak === -1 ? text.length : nextBreak;
  return { lineStart, lineEnd };
}

function selectedLineBounds(text: string, selection: TextSelection): { rangeStart: number; rangeEnd: number } {
  const { start, end } = selection;
  const rangeStart = lineBounds(text, start).lineStart;
  const rangeEnd =
    end === start ? lineBounds(text, start).lineEnd : lineBounds(text, Math.max(0, end - 1)).lineEnd;
  return { rangeStart, rangeEnd };
}

function findMarkdownLinkAt(
  text: string,
  index: number,
): { start: number; end: number; label: string; url: string } | null {
  const pattern = /\[([^\]]*)\]\(([^)]*)\)/g;
  let match = pattern.exec(text);
  while (match) {
    const matchStart = match.index;
    const matchEnd = match.index + match[0].length;
    if (index >= matchStart && index <= matchEnd) {
      return { start: matchStart, end: matchEnd, label: match[1] ?? "", url: match[2] ?? "" };
    }
    match = pattern.exec(text);
  }
  return null;
}

function findMarkdownImageAt(
  text: string,
  index: number,
): { start: number; end: number; alt: string; url: string } | null {
  const pattern = /!\[([^\]]*)\]\(([^)]*)\)/g;
  let match = pattern.exec(text);
  while (match) {
    const matchStart = match.index;
    const matchEnd = match.index + match[0].length;
    if (index >= matchStart && index <= matchEnd) {
      return { start: matchStart, end: matchEnd, alt: match[1] ?? "", url: match[2] ?? "" };
    }
    match = pattern.exec(text);
  }
  return null;
}

function findFencedCodeBlockAt(
  text: string,
  index: number,
): { start: number; end: number; content: string } | null {
  const pattern = /```(?:\r?\n([\s\S]*?)\r?\n```|([\s\S]*?)```)/g;
  let match = pattern.exec(text);
  while (match) {
    const matchStart = match.index;
    const matchEnd = match.index + match[0].length;
    if (index >= matchStart && index <= matchEnd) {
      return {
        start: matchStart,
        end: matchEnd,
        content: match[1] ?? match[2] ?? "",
      };
    }
    match = pattern.exec(text);
  }
  return null;
}

type EmphasisKind = "italic" | "bold" | "boldItalic";

interface EmphasisContext {
  kind: EmphasisKind;
  wrapStart: number;
  wrapEnd: number;
  contentStart: number;
  contentEnd: number;
}

function isValidSingleAsteriskDelimiter(text: string, index: number): boolean {
  const before = index > 0 ? text[index - 1] : "";
  const after = index + 1 < text.length ? text[index + 1] : "";
  return before !== "*" && after !== "*";
}

function isValidDoubleAsteriskDelimiter(text: string, index: number): boolean {
  const before = index > 0 ? text[index - 1] : "";
  const after = index + 2 < text.length ? text[index + 2] : "";
  return before !== "*" && after !== "*";
}

function findEmphasisDelimiter(
  text: string,
  fromIndex: number,
  delimiter: string,
  direction: "before" | "after",
  maxIndex: number,
): number {
  const step = delimiter.length;
  if (direction === "before") {
    let index = text.lastIndexOf(delimiter, fromIndex);
    while (index !== -1) {
      if (delimiter === "*" && !isValidSingleAsteriskDelimiter(text, index)) {
        index = text.lastIndexOf(delimiter, index - 1);
        continue;
      }
      if (delimiter === "**" && !isValidDoubleAsteriskDelimiter(text, index)) {
        index = text.lastIndexOf(delimiter, index - 1);
        continue;
      }
      return index;
    }
    return -1;
  }

  let index = text.indexOf(delimiter, fromIndex);
  while (index !== -1 && index <= maxIndex) {
    if (delimiter === "*" && !isValidSingleAsteriskDelimiter(text, index)) {
      index = text.indexOf(delimiter, index + step);
      continue;
    }
    if (delimiter === "**" && !isValidDoubleAsteriskDelimiter(text, index)) {
      index = text.indexOf(delimiter, index + step);
      continue;
    }
    return index;
  }
  return -1;
}

function findEmphasisContext(text: string, selection: TextSelection): EmphasisContext | null {
  const { start, end } = selection;
  const probe = start === end ? start : Math.floor((start + end) / 2);

  const patterns: Array<{ kind: EmphasisKind; open: string; close: string }> = [
    { kind: "boldItalic", open: "***", close: "***" },
    { kind: "bold", open: "**", close: "**" },
    { kind: "italic", open: "*", close: "*" },
    { kind: "italic", open: "_", close: "_" },
  ];

  for (const pattern of patterns) {
    const openIndex = findEmphasisDelimiter(text, probe, pattern.open, "before", probe);
    if (openIndex === -1) continue;

    const contentStart = openIndex + pattern.open.length;
    const closeIndex = findEmphasisDelimiter(text, Math.max(contentStart, probe), pattern.close, "after", text.length);
    if (closeIndex === -1 || closeIndex < contentStart) continue;

    if (probe < contentStart || probe > closeIndex) continue;

    return {
      kind: pattern.kind,
      wrapStart: openIndex,
      wrapEnd: closeIndex + pattern.close.length,
      contentStart,
      contentEnd: closeIndex,
    };
  }

  return null;
}

function replaceEmphasisWrap(
  text: string,
  context: EmphasisContext,
  replacement: string,
): TextEditResult {
  const value = `${text.slice(0, context.wrapStart)}${replacement}${text.slice(context.wrapEnd)}`;
  const leadingMarkers =
    replacement.startsWith("***") ? 3 : replacement.startsWith("**") ? 2 : replacement.startsWith("*") ? 1 : 0;
  const trailingMarkers =
    replacement.endsWith("***") ? 3 : replacement.endsWith("**") ? 2 : replacement.endsWith("*") ? 1 : 0;
  const contentLength = replacement.length - leadingMarkers - trailingMarkers;
  const selectionStart = context.wrapStart + leadingMarkers;
  const selectionEnd = selectionStart + contentLength;

  return { value, selectionStart, selectionEnd };
}

export function applyMarkdownItalic(
  text: string,
  selection: TextSelection,
  placeholder = "italic",
): TextEditResult {
  const context = findEmphasisContext(text, selection);
  if (context) {
    const content = text.slice(context.contentStart, context.contentEnd);
    switch (context.kind) {
      case "boldItalic":
        return replaceEmphasisWrap(text, context, `**${content}**`);
      case "bold":
        return replaceEmphasisWrap(text, context, `***${content}***`);
      case "italic":
        return replaceEmphasisWrap(text, context, content);
    }
  }

  return applyMarkdownWrap(text, selection, "*", "*", placeholder);
}

function tryUnwrapWrappedSelection(
  text: string,
  selection: TextSelection,
  before: string,
  after: string,
): TextEditResult | null {
  const { start, end } = selection;

  if (start !== end) {
    const selected = text.slice(start, end);
    if (
      selected.startsWith(before) &&
      selected.endsWith(after) &&
      selected.length >= before.length + after.length
    ) {
      const inner = selected.slice(before.length, selected.length - after.length);
      const value = `${text.slice(0, start)}${inner}${text.slice(end)}`;
      return { value, selectionStart: start, selectionEnd: start + inner.length };
    }
  }

  if (
    start >= before.length &&
    text.slice(start - before.length, start) === before &&
    text.slice(end, end + after.length) === after
  ) {
    const inner = text.slice(start, end);
    const value = `${text.slice(0, start - before.length)}${inner}${text.slice(end + after.length)}`;
    const selectionStart = start - before.length;
    return {
      value,
      selectionStart,
      selectionEnd: selectionStart + inner.length,
    };
  }

  if (start === end) {
    const beforeIndex = text.lastIndexOf(before, start - before.length);
    if (beforeIndex === -1) return null;
    const afterIndex = text.indexOf(after, beforeIndex + before.length);
    if (afterIndex === -1) return null;

    const innerStart = beforeIndex + before.length;
    const innerEnd = afterIndex;
    if (start < innerStart || start > innerEnd) return null;

    const inner = text.slice(innerStart, innerEnd);
    const value = `${text.slice(0, beforeIndex)}${inner}${text.slice(afterIndex + after.length)}`;
    return {
      value,
      selectionStart: beforeIndex,
      selectionEnd: beforeIndex + inner.length,
    };
  }

  return null;
}

export function applyMarkdownWrap(
  text: string,
  selection: TextSelection,
  before: string,
  after: string,
  placeholder = "text",
): TextEditResult {
  const unwrapped = tryUnwrapWrappedSelection(text, selection, before, after);
  if (unwrapped) return unwrapped;

  const { start, end } = selection;
  const selected = text.slice(start, end);
  const content = selected || placeholder;
  const wrapped = `${before}${content}${after}`;
  const value = `${text.slice(0, start)}${wrapped}${text.slice(end)}`;
  const selectionStart = start + before.length;
  const selectionEnd = selectionStart + content.length;

  return { value, selectionStart, selectionEnd };
}

export function applyMarkdownLink(
  text: string,
  selection: TextSelection,
  placeholderLabel = "link text",
  placeholderUrl = "https://",
): TextEditResult {
  const { start, end } = selection;
  const index = start === end ? start : Math.floor((start + end) / 2);
  const existing = findMarkdownLinkAt(text, index);
  if (existing) {
    const value = `${text.slice(0, existing.start)}${existing.label}${text.slice(existing.end)}`;
    return {
      value,
      selectionStart: existing.start,
      selectionEnd: existing.start + existing.label.length,
    };
  }

  const selected = text.slice(start, end);
  const linkMatch = selected.match(LINK_PATTERN);
  if (linkMatch) {
    const label = linkMatch[1] ?? "";
    const value = `${text.slice(0, start)}${label}${text.slice(end)}`;
    return { value, selectionStart: start, selectionEnd: start + label.length };
  }

  const label = selected || placeholderLabel;
  const wrapped = `[${label}](${placeholderUrl})`;
  const value = `${text.slice(0, start)}${wrapped}${text.slice(end)}`;
  const urlStart = start + label.length + 3;
  const urlEnd = urlStart + placeholderUrl.length;

  return {
    value,
    selectionStart: urlStart,
    selectionEnd: urlEnd,
  };
}

export function applyMarkdownImage(
  text: string,
  selection: TextSelection,
  placeholderAlt = "image description",
  placeholderUrl = "https://",
): TextEditResult {
  const { start, end } = selection;
  const index = start === end ? start : Math.floor((start + end) / 2);
  const existing = findMarkdownImageAt(text, index);
  if (existing) {
    const value = `${text.slice(0, existing.start)}${existing.alt}${text.slice(existing.end)}`;
    return {
      value,
      selectionStart: existing.start,
      selectionEnd: existing.start + existing.alt.length,
    };
  }

  const selected = text.slice(start, end);
  const imageMatch = selected.match(IMAGE_PATTERN);
  if (imageMatch) {
    const alt = imageMatch[1] ?? "";
    const value = `${text.slice(0, start)}${alt}${text.slice(end)}`;
    return { value, selectionStart: start, selectionEnd: start + alt.length };
  }

  const alt = selected || placeholderAlt;
  const wrapped = `![${alt}](${placeholderUrl})`;
  const value = `${text.slice(0, start)}${wrapped}${text.slice(end)}`;
  const urlStart = start + alt.length + 4;
  const urlEnd = urlStart + placeholderUrl.length;

  return {
    value,
    selectionStart: urlStart,
    selectionEnd: urlEnd,
  };
}

export function applyMarkdownLinePrefix(
  text: string,
  selection: TextSelection,
  prefix: string,
): TextEditResult {
  const { rangeStart, rangeEnd } = selectedLineBounds(text, selection);
  const block = text.slice(rangeStart, rangeEnd);
  const lines = block.split("\n");
  const nonEmptyLines = lines.filter((line) => line.trim() !== "");
  const allPrefixed =
    nonEmptyLines.length > 0 && nonEmptyLines.every((line) => line.startsWith(prefix));
  const updated = lines
    .map((line) => {
      if (line.trim() === "") return line;
      return allPrefixed ? line.slice(prefix.length) : line.startsWith(prefix) ? line : `${prefix}${line}`;
    })
    .join("\n");
  const value = `${text.slice(0, rangeStart)}${updated}${text.slice(rangeEnd)}`;

  return {
    value,
    selectionStart: rangeStart,
    selectionEnd: rangeStart + updated.length,
  };
}

export function applyMarkdownOrderedList(
  text: string,
  selection: TextSelection,
): TextEditResult {
  const { rangeStart, rangeEnd } = selectedLineBounds(text, selection);
  const block = text.slice(rangeStart, rangeEnd);
  const lines = block.split("\n");
  const nonEmptyLines = lines.filter((line) => line.trim() !== "");
  const allNumbered =
    nonEmptyLines.length > 0 && nonEmptyLines.every((line) => ORDERED_LIST_PREFIX_PATTERN.test(line));

  if (allNumbered) {
    const stripped = lines
      .map((line) => (line.trim() === "" ? line : line.replace(ORDERED_LIST_PREFIX_PATTERN, "")))
      .join("\n");
    const value = `${text.slice(0, rangeStart)}${stripped}${text.slice(rangeEnd)}`;
    return {
      value,
      selectionStart: rangeStart,
      selectionEnd: rangeStart + stripped.length,
    };
  }

  let itemNumber = 1;
  const prefixed = lines
    .map((line) => {
      const stripped = line.replace(ORDERED_LIST_PREFIX_PATTERN, "");
      if (stripped.trim() === "") return line;
      const next = `${itemNumber}. ${stripped}`;
      itemNumber += 1;
      return next;
    })
    .join("\n");
  const value = `${text.slice(0, rangeStart)}${prefixed}${text.slice(rangeEnd)}`;

  return {
    value,
    selectionStart: rangeStart,
    selectionEnd: rangeStart + prefixed.length,
  };
}

export function applyMarkdownHeading(
  text: string,
  selection: TextSelection,
  level: number,
): TextEditResult {
  const clampedLevel = Math.min(6, Math.max(1, Math.round(level)));
  const prefix = `${"#".repeat(clampedLevel)} `;
  const { rangeStart, rangeEnd } = selectedLineBounds(text, selection);
  const block = text.slice(rangeStart, rangeEnd);
  const lines = block.split("\n");
  const updated = lines
    .map((line) => {
      if (line.trim() === "") return line;
      const currentLevel = line.match(/^(#{1,6})\s+/)?.[1]?.length ?? 0;
      const stripped = line.replace(HEADING_PREFIX_PATTERN, "");
      if (currentLevel === clampedLevel) return stripped;
      return `${prefix}${stripped}`;
    })
    .join("\n");
  const value = `${text.slice(0, rangeStart)}${updated}${text.slice(rangeEnd)}`;

  return {
    value,
    selectionStart: rangeStart,
    selectionEnd: rangeStart + updated.length,
  };
}

export function applyMarkdownNormalText(
  text: string,
  selection: TextSelection,
): TextEditResult {
  const { rangeStart, rangeEnd } = selectedLineBounds(text, selection);
  const block = text.slice(rangeStart, rangeEnd);
  const lines = block.split("\n");
  const updated = lines
    .map((line) => (line.trim() === "" ? line : line.replace(HEADING_PREFIX_PATTERN, "")))
    .join("\n");
  const value = `${text.slice(0, rangeStart)}${updated}${text.slice(rangeEnd)}`;

  return {
    value,
    selectionStart: rangeStart,
    selectionEnd: rangeStart + updated.length,
  };
}

export function applyMarkdownCodeBlock(
  text: string,
  selection: TextSelection,
  placeholder = "code",
): TextEditResult {
  const { start, end } = selection;
  const index = start === end ? start : Math.floor((start + end) / 2);
  const existing = findFencedCodeBlockAt(text, index);
  if (existing) {
    const value = `${text.slice(0, existing.start)}${existing.content}${text.slice(existing.end)}`;
    return {
      value,
      selectionStart: existing.start,
      selectionEnd: existing.start + existing.content.length,
    };
  }

  const selected = text.slice(start, end);
  const fencedMatch = selected.match(FENCED_CODE_BLOCK_PATTERN);
  if (fencedMatch) {
    const content = fencedMatch[1] ?? fencedMatch[2] ?? "";
    const value = `${text.slice(0, start)}${content}${text.slice(end)}`;
    return { value, selectionStart: start, selectionEnd: start + content.length };
  }

  const content = selected || placeholder;
  const wrapped = `\`\`\`\n${content}\n\`\`\``;
  const value = `${text.slice(0, start)}${wrapped}${text.slice(end)}`;
  const selectionStart = start + 4;
  const selectionEnd = selectionStart + content.length;

  return { value, selectionStart, selectionEnd };
}

export function applyMarkdownHorizontalRule(
  text: string,
  selection: TextSelection,
): TextEditResult {
  const { start } = selection;
  const lineStart = lineBounds(text, start).lineStart;
  const before = text.slice(0, lineStart);
  const after = text.slice(lineStart);

  let prefix = "";
  if (before.length > 0) {
    prefix = before.endsWith("\n\n") ? "" : before.endsWith("\n") ? "\n" : "\n\n";
  }

  let suffix = "";
  if (after.length > 0) {
    suffix = after.startsWith("\n\n") ? "\n" : "\n\n";
  }

  const insertion = `${prefix}---${suffix}`;
  const insertAt = lineStart;
  const value = `${before}${insertion}${after}`;
  const selectionStart = insertAt + prefix.length;
  const selectionEnd = selectionStart + 3;

  return { value, selectionStart, selectionEnd };
}

export function applyVariantNotesFormat(
  format: MarkdownFormat,
  text: string,
  selection: TextSelection,
): TextEditResult {
  switch (format) {
    case "bold":
      return applyMarkdownWrap(text, selection, "**", "**", "bold");
    case "italic":
      return applyMarkdownItalic(text, selection);
    case "strikethrough":
      return applyMarkdownWrap(text, selection, "~~", "~~", "strike");
    case "code":
      return applyMarkdownWrap(text, selection, "`", "`", "code");
    case "codeBlock":
      return applyMarkdownCodeBlock(text, selection);
    case "link":
      return applyMarkdownLink(text, selection);
    case "image":
      return applyMarkdownImage(text, selection);
    case "list":
      return applyMarkdownLinePrefix(text, selection, "- ");
    case "orderedList":
      return applyMarkdownOrderedList(text, selection);
    case "blockquote":
      return applyMarkdownLinePrefix(text, selection, "> ");
    case "horizontalRule":
      return applyMarkdownHorizontalRule(text, selection);
    case "normalText":
      return applyMarkdownNormalText(text, selection);
    case "heading-1":
      return applyMarkdownHeading(text, selection, 1);
    case "heading-2":
      return applyMarkdownHeading(text, selection, 2);
    case "heading-3":
      return applyMarkdownHeading(text, selection, 3);
    case "heading-4":
      return applyMarkdownHeading(text, selection, 4);
    case "heading-5":
      return applyMarkdownHeading(text, selection, 5);
    case "heading-6":
      return applyMarkdownHeading(text, selection, 6);
  }
}
