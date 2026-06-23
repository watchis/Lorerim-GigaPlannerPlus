import { readFileSync } from "node:fs";

export function cleanName(name) {
  return String(name ?? "")
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function slugify(name) {
  return cleanName(name)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function cleanDescription(description) {
  return String(description ?? "")
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<([^<>]+)>/g, "$1")
    .replace(/\s*[[(]\s*Requires Level \d+\s*[\])]\s*/gi, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
}

export function cleanWintersunEffectText(text, magnitude = null) {
  let cleaned = String(text ?? "");

  if (magnitude != null) {
    cleaned = cleaned.replace(/<mag>/gi, String(magnitude));
  }

  cleaned = cleaned.replace(/<([^<>]+)>/g, "$1");

  cleaned = cleanDescription(cleaned)
    .replace(/\s*\(based on favor with [^)]+\)/gi, "")
    .replace(/\s*Costs\s+\d+%\s+favor\.?/gi, "")
    .replace(/(\d)%%+/g, "$1%")
    .replace(/\s{2,}/g, " ")
    .trim();

  return cleaned;
}

export function loadJsonIfExists(filePath) {
  try {
    return JSON.parse(readFileSync(filePath, "utf8"));
  } catch {
    return {};
  }
}
