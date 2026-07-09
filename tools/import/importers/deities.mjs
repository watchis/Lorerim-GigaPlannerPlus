import { readFileSync } from "node:fs";
import {
  buildDeityEligibilityIndex,
  collectWorshipAltarKeys,
  deityNameFromAltarKey,
  normalizeAltarKey,
  resolveDeityEligibility,
} from "../lib/deity-eligibility.mjs";
import { cleanDescription, cleanName, slugify } from "../lib/transform-utils.mjs";
import { parseBonusEffects } from "../lib/parse-bonus-effects.mjs";
import {
  extractFaithEffectsFromPlugins,
  filterFaithMgefRecords,
  indexDeityFaithMgef,
} from "../lib/deity-faith-from-plugins.mjs";

function blessingIdFromName(spellName, altarKey = "") {
  const match = cleanName(spellName).match(/^Blessing of (.+)$/i);
  if (match) return slugify(match[1]);
  if (altarKey) return slugify(deityNameFromAltarKey(altarKey));
  return slugify(spellName);
}

function blessingNameFromSpell(spellName, altarKey = "") {
  const match = cleanName(spellName).match(/^Blessing of (.+)$/i);
  if (match) return match[1];
  if (altarKey) return deityNameFromAltarKey(altarKey);
  return cleanName(spellName);
}

function parseBlessingRequirement(failMessage) {
  const text = cleanDescription(failMessage ?? "");
  if (!text) return { requirement: "None", race: "All" };

  if (/does not accept those who have not served/i.test(text)) {
    return { requirement: "Must have served this deity", race: "All" };
  }

  const raceMatch = text.match(/only accepts those of (.+?) blood/i);
  if (raceMatch) {
    return {
      requirement: "Race restricted",
      race: raceMatch[1].replace(/\s+or\s+/gi, " / ").replace(/\s+and\s+/gi, " / "),
    };
  }

  if (/does not accept those who are not of Human blood/i.test(text)) {
    return { requirement: "Human blood", race: "Human" };
  }

  return { requirement: text, race: "All" };
}

function isAltarBlessingSpell(record) {
  return (
    record.edid.startsWith("WSN_AltarBlessing_") &&
    record.edid.endsWith("_Spell") &&
    !record.edid.includes("Gift")
  );
}

function isVariantAltarBlessingSpell(record) {
  return /Gift|Cloak|BuffOnly|NoAutocast/i.test(record.edid);
}

function altarKeyFromSpellEdid(edid) {
  const rawKey = edid.slice("WSN_AltarBlessing_".length, -"_Spell".length);
  return normalizeAltarKey(rawKey);
}

function buildAltarBlessingSpellIndex(spellRecords) {
  const byAltarKey = new Map();

  for (const record of spellRecords.filter(isAltarBlessingSpell)) {
    const altarKey = altarKeyFromSpellEdid(record.edid);
    const existing = byAltarKey.get(altarKey);
    if (!existing || (isVariantAltarBlessingSpell(existing) && !isVariantAltarBlessingSpell(record))) {
      byAltarKey.set(altarKey, record);
    }
  }

  return byAltarKey;
}

function hasDeityFaithEffects({ shrine, follower, devotee }) {
  for (const value of [shrine, follower, devotee]) {
    const text = String(value ?? "").trim();
    if (text && text !== "-") return true;
  }
  return false;
}

export function transformDeityRecords(
  spellRecords,
  mgefRecords,
  mesgRecords,
  deitiesPath,
  altarMagnitudes = new Map(),
  deityEligibility = new Map(),
  boonMagnitudes = new Map(),
) {
  const existing = JSON.parse(readFileSync(deitiesPath, "utf8"));
  const existingEntries = existing.deities ?? existing.blessings ?? [];
  const existingById = new Map(existingEntries.map((deity) => [deity.id, deity]));
  const mgefIndex = indexDeityFaithMgef(mgefRecords);
  const mesgByEdid = new Map(mesgRecords.map((record) => [record.edid, record]));
  const spellByAltarKey = buildAltarBlessingSpellIndex(spellRecords);
  const altarKeys = new Set([...collectWorshipAltarKeys(mesgRecords), ...spellByAltarKey.keys()]);

  const deities = [];

  for (const altarKey of altarKeys) {
    const record = spellByAltarKey.get(altarKey);
    const name = blessingNameFromSpell(record?.name ?? "", altarKey);
    const id = blessingIdFromName(record?.name ?? "", altarKey);
    const prior = existingById.get(id);

    const worship = mesgByEdid.get(`WSN_WorshipRequest_Message_${altarKey}`);
    const fail = mesgByEdid.get(`WSN_WorshipRequest_Message_${altarKey}_Fail`);
    const { requirement } = parseBlessingRequirement(fail?.description);
    const altarBlessing = altarMagnitudes.get(altarKey);
    const shrineMagnitudes = altarBlessing?.magnitudes ?? null;
    const shrineMgefEdid = altarBlessing?.shrineMgefEdid ?? null;
    const followerBlessing = boonMagnitudes.get(`${altarKey}:1`);
    const devoteeBlessing = boonMagnitudes.get(`${altarKey}:2`);
    const faithEffects = extractFaithEffectsFromPlugins({
      altarKey,
      mgefIndex,
      worshipDescription: worship?.description,
      altarMagnitudes: shrineMagnitudes,
      shrineMgefEdid,
      followerMagnitudes: followerBlessing?.magnitudes ?? null,
      devoteeMagnitudes: devoteeBlessing?.magnitudes ?? null,
    });
    const eligibility = resolveDeityEligibility(id, name, deityEligibility);

    const shrine = faithEffects.shrine !== "-" ? faithEffects.shrine : "-";
    const follower = faithEffects.follower !== "-" ? faithEffects.follower : prior?.follower || "-";
    const devotee = faithEffects.devotee !== "-" ? faithEffects.devotee : prior?.devotee || "-";

    if (!hasDeityFaithEffects({ shrine, follower, devotee })) {
      continue;
    }

    deities.push({
      ...(prior ?? {
        id,
        name,
        shrine: "-",
        follower: "-",
        devotee: "-",
        tenets: "-",
        race: "All",
        starting: "",
        requirement: "None",
        shrineLocations: [],
        effects: [],
      }),
      id,
      name,
      shrine,
      follower,
      devotee,
      tenets: faithEffects.tenets !== "-" ? faithEffects.tenets : prior?.tenets || "-",
      race: eligibility.race || prior?.race || "All",
      starting: eligibility.starting || prior?.starting || "",
      requirement: eligibility.requirement || requirement || prior?.requirement || "None",
      shrineLocations: eligibility.shrineLocations ?? prior?.shrineLocations ?? [],
      effects: parseBonusEffects(shrine !== "-" ? shrine : "-"),
    });
  }

  deities.sort((left, right) => left.name.localeCompare(right.name));

  const none = existingEntries.find((deity) => deity.id === "none");
  return { deities: none ? [none, ...deities] : deities };
}

export async function importDeities(context) {
  const deityEligibility = await buildDeityEligibilityIndex({
    wintersunPlugins: context.plugins.filter((plugin) => /Wintersun/i.test(plugin.pluginName)),
    mesgRecords: context.scan.wintersunMesgRecords,
    questRecords: context.scan.questRecords,
    spellRecords: context.scan.spellRecords,
  });

  const deities = transformDeityRecords(
    context.scan.spellRecords,
    filterFaithMgefRecords(context.scan.mgefRecords ?? context.scan.wintersunMgefRecords ?? []),
    context.scan.wintersunMesgRecords,
    context.paths.deitiesPath,
    context.scan.altarMagnitudes,
    deityEligibility,
    context.scan.boonMagnitudes,
  );

  return {
    files: [["deities.json", deities]],
    summary: {
      deities: deities.deities.length,
    },
  };
}
