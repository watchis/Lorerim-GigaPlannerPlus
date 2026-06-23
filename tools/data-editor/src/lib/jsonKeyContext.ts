export type JsonKeyContext = {
  start: number;
  end: number;
  prefix: string;
};

function isWhitespace(char: string): boolean {
  return char === " " || char === "\t" || char === "\n" || char === "\r";
}

export function getJsonKeyContext(text: string, cursor: number): JsonKeyContext | null {
  if (cursor < 0 || cursor > text.length) return null;

  let quoteStart = -1;
  let escaped = false;

  for (let index = cursor - 1; index >= 0; index -= 1) {
    const char = text[index];
    if (escaped) {
      escaped = false;
      continue;
    }
    if (char === "\\") {
      escaped = true;
      continue;
    }
    if (char === '"') {
      quoteStart = index;
      break;
    }
  }

  if (quoteStart < 0) return null;

  let before = quoteStart - 1;
  while (before >= 0 && isWhitespace(text[before])) before -= 1;
  if (before >= 0) {
    const char = text[before];
    if (char !== "{" && char !== ",") return null;
  } else if (quoteStart !== 0) {
    return null;
  }

  escaped = false;
  for (let index = quoteStart + 1; index < cursor; index += 1) {
    const char = text[index];
    if (escaped) {
      escaped = false;
      continue;
    }
    if (char === "\\") {
      escaped = true;
      continue;
    }
    if (char === '"') return null;
  }

  return {
    start: quoteStart + 1,
    end: cursor,
    prefix: text.slice(quoteStart + 1, cursor),
  };
}
