export type JsonTokenType = "key" | "string" | "number" | "literal" | "punctuation" | "plain";

export type JsonToken = {
  type: JsonTokenType;
  text: string;
};

function isWhitespace(char: string): boolean {
  return char === " " || char === "\t" || char === "\n" || char === "\r";
}

function readString(source: string, start: number): number {
  let index = start + 1;
  while (index < source.length) {
    const char = source[index];
    if (char === "\\") {
      index += 2;
      continue;
    }
    if (char === '"') {
      return index + 1;
    }
    index += 1;
  }
  return source.length;
}

function readNumber(source: string, start: number): number {
  let index = start;
  if (source[index] === "-") index += 1;
  while (index < source.length && /[0-9]/.test(source[index])) index += 1;
  if (source[index] === ".") {
    index += 1;
    while (index < source.length && /[0-9]/.test(source[index])) index += 1;
  }
  if (source[index] === "e" || source[index] === "E") {
    index += 1;
    if (source[index] === "+" || source[index] === "-") index += 1;
    while (index < source.length && /[0-9]/.test(source[index])) index += 1;
  }
  return index;
}

function isJsonKey(source: string, end: number): boolean {
  let index = end;
  while (index < source.length && isWhitespace(source[index])) index += 1;
  return source[index] === ":";
}

export function tokenizeJson(source: string): JsonToken[] {
  const tokens: JsonToken[] = [];
  let index = 0;

  while (index < source.length) {
    const char = source[index];

    if (char === '"') {
      const end = readString(source, index);
      const text = source.slice(index, end);
      tokens.push({ type: isJsonKey(source, end) ? "key" : "string", text });
      index = end;
      continue;
    }

    if (char === "-" || (char >= "0" && char <= "9")) {
      const end = readNumber(source, index);
      tokens.push({ type: "number", text: source.slice(index, end) });
      index = end;
      continue;
    }

    if (source.startsWith("true", index)) {
      tokens.push({ type: "literal", text: "true" });
      index += 4;
      continue;
    }

    if (source.startsWith("false", index)) {
      tokens.push({ type: "literal", text: "false" });
      index += 5;
      continue;
    }

    if (source.startsWith("null", index)) {
      tokens.push({ type: "literal", text: "null" });
      index += 4;
      continue;
    }

    if ("{}[],:".includes(char)) {
      tokens.push({ type: "punctuation", text: char });
      index += 1;
      continue;
    }

    if (isWhitespace(char)) {
      let end = index + 1;
      while (end < source.length && isWhitespace(source[end])) end += 1;
      tokens.push({ type: "plain", text: source.slice(index, end) });
      index = end;
      continue;
    }

    tokens.push({ type: "plain", text: char });
    index += 1;
  }

  return tokens;
}
