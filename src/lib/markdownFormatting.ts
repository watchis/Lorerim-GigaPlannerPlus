export interface TextSelection {
  start: number;
  end: number;
}

export interface TextEditResult {
  value: string;
  selectionStart: number;
  selectionEnd: number;
}

const HEADING_PREFIX_PATTERN = /^#{1,6}\s+/;

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

export function applyMarkdownWrap(
  text: string,
  selection: TextSelection,
  before: string,
  after: string,
  placeholder = "text",
): TextEditResult {
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
  const selected = text.slice(start, end);
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
  const selected = text.slice(start, end);
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
  const prefixed = lines
    .map((line) => (line.startsWith(prefix) ? line : `${prefix}${line}`))
    .join("\n");
  const value = `${text.slice(0, rangeStart)}${prefixed}${text.slice(rangeEnd)}`;
  const selectionStart = rangeStart;
  const selectionEnd = rangeStart + prefixed.length;

  return { value, selectionStart, selectionEnd };
}

export function applyMarkdownOrderedList(
  text: string,
  selection: TextSelection,
): TextEditResult {
  const { rangeStart, rangeEnd } = selectedLineBounds(text, selection);
  const block = text.slice(rangeStart, rangeEnd);
  const lines = block.split("\n");
  let itemNumber = 1;
  const prefixed = lines
    .map((line) => {
      const stripped = line.replace(/^\d+\.\s+/, "");
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
      const stripped = line.replace(HEADING_PREFIX_PATTERN, "");
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

export function applyMarkdownCodeBlock(
  text: string,
  selection: TextSelection,
  placeholder = "code",
): TextEditResult {
  const { start, end } = selection;
  const selected = text.slice(start, end);
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
