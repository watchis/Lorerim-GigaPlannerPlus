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

export function meaningfulEffectMagnitude(value) {
  if (value == null || !Number.isFinite(value) || value <= 0) return null;
  const rounded = Math.round(value);
  if (rounded <= 0) return null;
  return value;
}

export function cleanWintersunEffectText(text, magnitude = null) {
  let cleaned = String(text ?? "");
  const usableMagnitude = meaningfulEffectMagnitude(magnitude);

  if (usableMagnitude != null) {
    const formatted = formatEffectMagnitude(usableMagnitude);
    cleaned = cleaned.replace(/<mag>/gi, formatted);
  } else {
    cleaned = cleaned.replace(/<mag>/gi, "");
  }

  cleaned = cleaned.replace(/<([^<>]+)>/g, "$1");

  cleaned = cleanDescription(cleaned)
    .replace(/\s*\(based on favor with [^)]+\)/gi, "")
    .replace(/\s*Costs\s+\d+%\s+favor\.?/gi, "")
    .replace(/(\d)%%+/g, "$1%")
    .replace(/\s{2,}/g, " ")
    .trim();

  if (/\bby\s+points\b/i.test(cleaned) || /\bmag\s+points\b/i.test(cleaned)) {
    return "";
  }

  return cleaned;
}

function formatEffectMagnitude(magnitude) {
  const value = Number(magnitude);
  if (!Number.isFinite(value)) return String(magnitude);
  const rounded = Math.round(value);
  if (Math.abs(value - rounded) < 0.001) return String(rounded);
  return String(value);
}

export function loadJsonIfExists(filePath) {
  try {
    return JSON.parse(readFileSync(filePath, "utf8"));
  } catch {
    return {};
  }
}
