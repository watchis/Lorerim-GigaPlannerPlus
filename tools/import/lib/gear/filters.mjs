/**
 * Gear catalog filters and display-name helpers.
 */

const DUMMY_EDID_PATTERNS = [
  /^REQ_NULL_/i,
  /^Null/i,
  /^DELETE/i,
  /^zzz/i,
  /^xxx/i,
  /^_Skyrim/i,
];

const JUNK_NAME_PATTERNS = [
  /^test\b/i,
  /testing/i,
  /^temp\b/i,
  /^do\s*not\s*use\b/i,
  /^\d+$/,
];

/**
 * Localized FULL fields decode as 4-byte string-table ids (garbage / non-text).
 * Accept names that contain at least one letter or digit in a readable script.
 */
export function isReadableDisplayName(name) {
  const text = String(name ?? "").trim();
  if (!text) return false;
  if (text.length <= 2 && /[^\x20-\x7E\u00A0-\u024F]/.test(text)) return false;
  return /[\p{L}\p{N}]/u.test(text);
}

export function isJunkDisplayName(name) {
  const text = String(name ?? "").trim();
  if (!text) return true;
  if (text.length < 2) return true;
  return JUNK_NAME_PATTERNS.some((pattern) => pattern.test(text));
}

export function humanizeEdid(edid) {
  return String(edid ?? "")
    .replace(/^Armor/, "")
    .replace(/^Weapon/, "")
    .replace(/^Ench/, "Enchanted ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function resolveItemDisplayName(name, edid) {
  if (isReadableDisplayName(name)) return String(name).trim();
  const fromEdid = humanizeEdid(edid);
  return fromEdid || String(edid ?? "Unknown");
}

export function isStubGearEdid(edid) {
  const value = String(edid ?? "");
  if (!value) return true;
  return DUMMY_EDID_PATTERNS.some((pattern) => pattern.test(value));
}

export function shouldKeepGearRecord({ edid, name }) {
  if (isStubGearEdid(edid)) return false;
  if (!edid) return false;
  const displayName = resolveItemDisplayName(name, edid);
  if (isJunkDisplayName(displayName)) return false;
  return true;
}

/** Unique / artifact keywords that mark static loot (beyond pre-enchanted EITM). */
const STATIC_KEYWORD_HINTS = [
  /^.*Unique.*$/i,
  /^DaedricArtifact$/i,
  /^VendorItemDaedricArtifact$/i,
];

export function isStaticKeyword(edid) {
  return STATIC_KEYWORD_HINTS.some((pattern) => pattern.test(String(edid ?? "")));
}
