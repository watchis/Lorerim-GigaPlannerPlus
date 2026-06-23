import { formatFieldLabel } from "@/components/editorStyles";

export function normalizeTreeSearchQuery(query: string): string {
  return query.trim().toLowerCase();
}

export function matchesTreeSearch(
  value: unknown,
  query: string,
  options?: { key?: string },
): boolean {
  const normalized = normalizeTreeSearchQuery(query);
  if (!normalized) return true;

  if (options?.key) {
    const key = options.key;
    if (key.toLowerCase().includes(normalized)) return true;
    if (formatFieldLabel(key).toLowerCase().includes(normalized)) return true;
  }

  return searchJsonValue(value, normalized);
}

function searchJsonValue(value: unknown, query: string): boolean {
  if (value === null || value === undefined) return false;

  if (typeof value === "string") {
    return value.toLowerCase().includes(query);
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value).toLowerCase().includes(query);
  }

  if (Array.isArray(value)) {
    return value.some((item) => searchJsonValue(item, query));
  }

  if (typeof value === "object") {
    return Object.entries(value as Record<string, unknown>).some(
      ([key, child]) =>
        key.toLowerCase().includes(query) ||
        formatFieldLabel(key).toLowerCase().includes(query) ||
        searchJsonValue(child, query),
    );
  }

  return false;
}
