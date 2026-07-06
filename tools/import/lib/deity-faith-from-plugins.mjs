import { normalizeAltarKey } from "./deity-eligibility.mjs";
import { cleanDescription, cleanWintersunEffectText } from "./transform-utils.mjs";

const BOON1_PATTERN = /^WSN(?:_AltarBlessing)?_(.+)_Boon1_Effect(?:_Ab)?$/i;
const BOON2_PATTERN = /^WSN(?:_AltarBlessing)?_(.+)_Boon2_Effect(?:_Ab)?$/i;
const SHRINE_PATTERN = /^WSN_AltarBlessing_(.+)_Effect$/i;

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

function effectText(record, magnitude = null) {
  if (!record) return "";
  const resolvedMagnitude = magnitude ?? record.effectMagnitude ?? null;
  return cleanWintersunEffectText(record.effectDescription || record.description, resolvedMagnitude);
}

export function indexDeityFaithMgef(mgefRecords) {
  const shrineByAltar = new Map();
  const followerByAltar = new Map();
  const devoteeByAltar = new Map();

  for (const record of mgefRecords) {
    const edid = record.edid;
    if (!edid?.startsWith("WSN_") || /_old/i.test(edid)) continue;

    const shrineMatch = edid.match(SHRINE_PATTERN);
    if (shrineMatch) {
      shrineByAltar.set(normalizeAltarKey(shrineMatch[1]), record);
      continue;
    }

    const followerMatch = edid.match(BOON1_PATTERN);
    if (followerMatch) {
      followerByAltar.set(normalizeAltarKey(followerMatch[1]), record);
      continue;
    }

    const devoteeMatch = edid.match(BOON2_PATTERN);
    if (devoteeMatch) {
      devoteeByAltar.set(normalizeAltarKey(devoteeMatch[1]), record);
    }
  }

  return { shrineByAltar, followerByAltar, devoteeByAltar };
}

export function extractFaithEffectsFromPlugins({
  altarKey,
  mgefIndex,
  worshipDescription = "",
  altarMagnitude = null,
}) {
  const key = normalizeAltarKey(altarKey);
  const worship = parseWorshipMessage(worshipDescription);

  const shrineRecord = mgefIndex.shrineByAltar.get(key);
  const shrineMagnitude = altarMagnitude ?? shrineRecord?.effectMagnitude ?? null;
  const shrine = effectText(shrineRecord, shrineMagnitude);
  const follower = effectText(mgefIndex.followerByAltar.get(key)) || worship.follower;
  const devotee = effectText(mgefIndex.devoteeByAltar.get(key)) || worship.devotee;

  return {
    shrine: shrine || "-",
    follower: follower || "-",
    devotee: devotee || "-",
    tenets: worship.tenets || "-",
  };
}
