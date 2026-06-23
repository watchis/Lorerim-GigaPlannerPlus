import { tokenizeJson } from "./highlightJson";

function sortKeys(counts: Map<string, number>): string[] {
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([key]) => key);
}

export function collectKeySuggestions(value: unknown): string[] {
  const counts = new Map<string, number>();

  const visit = (node: unknown) => {
    if (!node) return;
    if (Array.isArray(node)) {
      for (const item of node) visit(item);
      return;
    }
    if (typeof node !== "object") return;

    for (const [key, child] of Object.entries(node as Record<string, unknown>)) {
      counts.set(key, (counts.get(key) ?? 0) + 1);
      visit(child);
    }
  };

  visit(value);
  return sortKeys(counts);
}

function collectKeySuggestionsFromTokens(content: string): string[] {
  const counts = new Map<string, number>();

  for (const token of tokenizeJson(content)) {
    if (token.type !== "key") continue;
    try {
      const key = JSON.parse(token.text) as string;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    } catch {
      // Ignore partial or invalid key strings while editing.
    }
  }

  return sortKeys(counts);
}

export function collectKeySuggestionsFromContent(content: string): string[] {
  try {
    return collectKeySuggestions(JSON.parse(content));
  } catch {
    return collectKeySuggestionsFromTokens(content);
  }
}
