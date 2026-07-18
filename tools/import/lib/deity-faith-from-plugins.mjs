import { normalizeAltarKey } from "./deity-eligibility.mjs";
import { cleanDescription, cleanWintersunEffectText } from "./transform-utils.mjs";

const BOON1_PATTERN = /^WSN(?:_AltarBlessing)?_(.+)_Boon1_Effect(?:_Ab)?$/i;
const BOON2_PATTERN = /^WSN(?:_AltarBlessing)?_(.+)_Boon2_Effect(?:_Ab)?$/i;
const FAITH_MGEF_VARIANT_PATTERN = /Gift|Cloak|BuffOnly|NoAutocast/i;

/**
 * Wintersun faith MGEF after load-order merge. Use EDID (not owning plugin): later patches
 * can override shrine templates while living in non-Wintersun plugins.
 *
 * @param {Array<{ edid?: string }>} mgefRecords
 */
export function filterFaithMgefRecords(mgefRecords) {
  return mgefRecords.filter(
    (record) => record.edid?.startsWith("WSN_") && !/_old/i.test(record.edid),
  );
}

/**
 * Wintersun faith MESG after load-order merge. Same EDID rule as MGEF: LoreRim
 * Synthesis/xEdit output can win the record while `plugin` is no longer a Wintersun name.
 *
 * @param {Array<{ edid?: string }>} mesgRecords
 */
export function filterFaithMesgRecords(mesgRecords) {
  return mesgRecords.filter(
    (record) => record.edid?.startsWith("WSN_") && !/_old/i.test(record.edid),
  );
}

export function isVariantFaithMgefEdid(edid) {
  return FAITH_MGEF_VARIANT_PATTERN.test(String(edid ?? ""));
}

export function collectShrineMgefFormIds(mgefFormIdsByEdid, altarKey, { includeVariants = false } = {}) {
  const normalizedKey = normalizeAltarKey(altarKey);
  const formIds = new Set();

  for (const [edid, formId] of mgefFormIdsByEdid) {
    if (parseShrineMgefAltarKey(edid) !== normalizedKey) continue;
    if (!includeVariants && isVariantFaithMgefEdid(edid)) continue;
    formIds.add(formId);
  }

  if (formIds.size === 0 && !includeVariants) {
    return collectShrineMgefFormIds(mgefFormIdsByEdid, altarKey, { includeVariants: true });
  }

  return formIds;
}

export function collectBoonMgefFormIds(
  mgefFormIdsByEdid,
  altarKey,
  boonNumber,
  { includeVariants = false } = {},
) {
  const normalizedKey = normalizeAltarKey(altarKey);
  const pattern = boonNumber === 1 ? BOON1_PATTERN : BOON2_PATTERN;
  const formIds = new Set();

  for (const [edid, formId] of mgefFormIdsByEdid) {
    const match = edid.match(pattern);
    if (!match || normalizeAltarKey(match[1]) !== normalizedKey) continue;
    if (!includeVariants && isVariantFaithMgefEdid(edid)) continue;
    formIds.add(formId);
  }

  if (formIds.size === 0 && !includeVariants) {
    return collectBoonMgefFormIds(mgefFormIdsByEdid, altarKey, boonNumber, { includeVariants: true });
  }

  return formIds;
}

function shouldReplaceFaithMgefRecord(existing, incoming) {
  if (!existing) return true;
  if (isVariantFaithMgefEdid(existing.edid) && !isVariantFaithMgefEdid(incoming.edid)) return true;
  if (!isVariantFaithMgefEdid(existing.edid) && isVariantFaithMgefEdid(incoming.edid)) return false;
  return true;
}

export function parseShrineMgefAltarKey(edid) {
  if (!edid?.startsWith("WSN_") || /_old/i.test(edid)) return null;

  const altarBlessingMatch = edid.match(/^WSN_AltarBlessing_(.+?)_Effect(?:_Ab)?$/i);
  if (altarBlessingMatch) {
    const rawKey = altarBlessingMatch[1];
    if (/Boon[12]/i.test(rawKey)) return null;
    return normalizeAltarKey(rawKey.replace(/_Unrestricted$/i, ""));
  }

  const altarBlessingBareMatch = edid.match(/^WSN_AltarBlessing_(.+)$/i);
  if (altarBlessingBareMatch) {
    const rawKey = altarBlessingBareMatch[1];
    if (/Boon[12]|_Spell/i.test(rawKey)) return null;
    return normalizeAltarKey(rawKey.replace(/_Unrestricted$/i, ""));
  }

  const tribunalMatch = edid.match(/^WSN_Tribunal_(Almalexia|SothaSil|Vivec)_Effect(?:_Ab)?$/i);
  if (tribunalMatch) {
    return normalizeAltarKey(`Tribunal_${tribunalMatch[1]}`);
  }

  return null;
}

export function isAltarBlessingMgefEdid(edid) {
  if (!edid?.startsWith("WSN_AltarBlessing_") || /_old/i.test(edid)) return false;
  if (/Boon[12]/i.test(edid)) return false;
  return parseShrineMgefAltarKey(edid) != null;
}

export function parseWorshipMessage(description) {
  const text = String(description ?? "");
  const sections = text.split(/\r?\n\r?\n/);
  const intro = cleanDescription(sections[0] ?? "");
  let follower = "";
  let devotee = "";
  let tenets = "";

  for (const section of sections.slice(1)) {
    if (/^Follower:/i.test(section)) {
      follower = cleanDescription(section.replace(/^Follower:\s*/i, ""));
    } else if (/^Devotee:/i.test(section)) {
      devotee = cleanDescription(section.replace(/^Devotee:\s*/i, ""));
    } else if (/^Tenets:/i.test(section)) {
      tenets = cleanDescription(section.replace(/^Tenets:\s*/i, ""));
    }
  }

  return { intro, follower, devotee, tenets };
}

function isBrokenShrinePlaceholder(text) {
  const cleaned = String(text ?? "").trim();
  if (!cleaned) return true;
  return /\bby\s+points\b/i.test(cleaned) || /\bmag\s+points\b/i.test(cleaned) || /(?<!\d)\s*%/.test(cleaned);
}

function effectText(record, magnitudes = null) {
  if (!record) return "";
  const template = record.effectDescription || record.description;
  if (!/<mag>/i.test(template)) {
    return cleanWintersunEffectText(template);
  }

  const resolvedMagnitudes = Array.isArray(magnitudes)
    ? magnitudes
    : magnitudes != null
      ? [magnitudes]
      : record.effectMagnitude != null
        ? [record.effectMagnitude]
        : null;

  return cleanWintersunEffectText(template, resolvedMagnitudes);
}

export function indexDeityFaithMgef(mgefRecords) {
  const shrineByAltar = new Map();
  const followerByAltar = new Map();
  const devoteeByAltar = new Map();
  const byEdid = new Map();

  for (const record of mgefRecords) {
    const edid = record.edid;
    if (!edid?.startsWith("WSN_") || /_old/i.test(edid)) continue;

    byEdid.set(edid, record);

    const shrineKey = parseShrineMgefAltarKey(edid);
    if (shrineKey) {
      const existing = shrineByAltar.get(shrineKey);
      if (shouldReplaceFaithMgefRecord(existing, record)) {
        shrineByAltar.set(shrineKey, record);
      }
      continue;
    }

    const followerMatch = edid.match(BOON1_PATTERN);
    if (followerMatch) {
      const key = normalizeAltarKey(followerMatch[1]);
      const existing = followerByAltar.get(key);
      if (shouldReplaceFaithMgefRecord(existing, record)) {
        followerByAltar.set(key, record);
      }
      continue;
    }

    const devoteeMatch = edid.match(BOON2_PATTERN);
    if (devoteeMatch) {
      const key = normalizeAltarKey(devoteeMatch[1]);
      const existing = devoteeByAltar.get(key);
      if (shouldReplaceFaithMgefRecord(existing, record)) {
        devoteeByAltar.set(key, record);
      }
    }
  }

  return { shrineByAltar, followerByAltar, devoteeByAltar, byEdid };
}

export function extractFaithEffectsFromPlugins({
  altarKey,
  mgefIndex,
  worshipDescription = "",
  altarMagnitude = null,
  altarMagnitudes = null,
  shrineMgefEdid = null,
  followerMagnitudes = null,
  devoteeMagnitudes = null,
}) {
  const key = normalizeAltarKey(altarKey);
  const worship = parseWorshipMessage(worshipDescription);

  const shrineRecord =
    (shrineMgefEdid ? mgefIndex.byEdid?.get(shrineMgefEdid) : null) ??
    mgefIndex.shrineByAltar.get(key);
  const resolvedMagnitudes = Array.isArray(altarMagnitudes)
    ? altarMagnitudes
    : Array.isArray(altarMagnitude)
      ? altarMagnitude
      : altarMagnitude != null
        ? [altarMagnitude]
        : shrineRecord?.effectMagnitude != null
          ? [shrineRecord.effectMagnitude]
          : null;

  let shrine = effectText(shrineRecord, resolvedMagnitudes);
  if (isBrokenShrinePlaceholder(shrine)) shrine = "";
  const follower =
    effectText(mgefIndex.followerByAltar.get(key), followerMagnitudes) || worship.follower;
  const devotee =
    effectText(mgefIndex.devoteeByAltar.get(key), devoteeMagnitudes) || worship.devotee;

  return {
    shrine: shrine || "-",
    follower: follower || "-",
    devotee: devotee || "-",
    tenets: worship.tenets || "-",
  };
}
