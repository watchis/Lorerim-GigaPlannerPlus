export interface TextSelection {
  start: number;
  end: number;
}

export interface TextEditResult {
  value: string;
  selectionStart: number;
  selectionEnd: number;
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

function lineBounds(text: string, index: number): { lineStart: number; lineEnd: number } {
  const lineStart = text.lastIndexOf("\n", index - 1) + 1;
  const nextBreak = text.indexOf("\n", index);
  const lineEnd = nextBreak === -1 ? text.length : nextBreak;
  return { lineStart, lineEnd };
}

export function applyMarkdownLinePrefix(
  text: string,
  selection: TextSelection,
  prefix: string,
): TextEditResult {
  const { start, end } = selection;
  const rangeStart = lineBounds(text, start).lineStart;
  const rangeEnd = end === start ? lineBounds(text, start).lineEnd : lineBounds(text, Math.max(0, end - 1)).lineEnd;
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
