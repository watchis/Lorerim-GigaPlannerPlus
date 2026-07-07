import { cleanDescription, cleanName, cleanWintersunEffectText, slugify } from "./transform-utils.mjs";
import { parseTraitBody } from "./parse-trait-body.mjs";
import { parseBonusEffects } from "./parse-bonus-effects.mjs";
import { parseRaceData } from "./race-data-parser.mjs";
import { mergeEffects } from "./parse-bonus-effects.mjs";
import { normalizeAltarKey, deityNameFromAltarKey } from "./deity-eligibility.mjs";
import { loadDestinyConfig } from "./destiny-config.mjs";

export const DESTINY_SKILL_ID = "destiny";
export const DESTINY_COORD_SCALE = 2;

export const PLAYABLE_RACE_EDIDS = new Set([
  "ArgonianRace",
  "BretonRace",
  "DarkElfRace",
  "HighElfRace",
  "ImperialRace",
  "KhajiitRace",
  "NordRace",
  "OrcRace",
  "RedguardRace",
  "WoodElfRace",
]);

export const RACE_ID_MAP = {
  ArgonianRace: "argonian",
  BretonRace: "breton",
  DarkElfRace: "dunmer",
  HighElfRace: "altmer",
  ImperialRace: "imperial",
  KhajiitRace: "khajiit",
  NordRace: "nord",
  OrcRace: "orsimer",
  RedguardRace: "redguard",
  WoodElfRace: "bosmer",
};

export const RACE_DISPLAY_NAMES = {
  DarkElfRace: "Dunmer",
  HighElfRace: "Altmer",
  OrcRace: "Orsimer",
  WoodElfRace: "Bosmer",
};

const RACE_ABILITY_SEGMENT = {
  ArgonianRace: "Argonian",
  BretonRace: "Breton",
  DarkElfRace: "Dunmer",
  HighElfRace: "Altmer",
  ImperialRace: "Imperial",
  KhajiitRace: "Khajiit",
  NordRace: "Nord",
  OrcRace: "Orsimer",
  RedguardRace: "Redguard",
  WoodElfRace: "Bosmer",
};

const SHARED_RACE_ABILITIES = {
  ArgonianRace: ["All_StrongStomach"],
  WoodElfRace: ["All_StrongStomach"],
  KhajiitRace: ["All_StrongStomach", "All_Claws"],
  OrcRace: ["All_StrongStomach"],
};

export const BIRTHSIGN_NAMES = [
  "Apprentice",
  "Atronach",
  "Lady",
  "Lord",
  "Lover",
  "Mage",
  "Ritual",
  "Serpent",
  "Shadow",
  "Steed",
  "Thief",
  "Tower",
  "Warrior",
];

const BIRTHSIGN_NAME_SET = new Set(BIRTHSIGN_NAMES);

export function darPerkSuffixName(edid) {
  const suffix = edid.replace(/^DAR_Perk\d+/, "");
  if (!suffix) return "";
  return suffix.replace(/([a-z])([A-Z])/g, "$1 $2");
}

export function darPerkDisplayName(record, usedNames) {
  const fullName = cleanName(record.name);
  if (fullName) {
    const key = fullName.toLowerCase();
    if (!usedNames.has(key)) {
      usedNames.add(key);
      return fullName;
    }
  }

  const fallback = cleanName(darPerkSuffixName(record.edid));
  if (fallback) {
    usedNames.add(fallback.toLowerCase());
    return fallback;
  }

  return fullName || record.edid;
}

export function buildDarDisplayNames(darPerks) {
  const usedNames = new Set();
  return darPerks.map((record) => darPerkDisplayName(record, usedNames));
}

export function darPerkSortKey(edid) {
  const match = edid.match(/^DAR_Perk(\d+)/i);
  return match ? Number.parseInt(match[1], 10) : Number.MAX_SAFE_INTEGER;
}

export function collectDarPerkRecords(perkRecords) {
  return perkRecords
    .filter((record) => record.edid.startsWith("DAR_Perk"))
    .sort((left, right) => darPerkSortKey(left.edid) - darPerkSortKey(right.edid));
}

export function destinyPerkId(sequence) {
  return `${DESTINY_SKILL_ID}-${String(sequence).padStart(2, "0")}`;
}

export function normalizeDestinyGrid(perks) {
  if (perks.length === 0) {
    return { perks, grid: { width: 1, height: 1 } };
  }

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const perk of perks) {
    minX = Math.min(minX, perk.position.x);
    minY = Math.min(minY, perk.position.y);
    maxX = Math.max(maxX, perk.position.x);
    maxY = Math.max(maxY, perk.position.y);
  }

  for (const perk of perks) {
    perk.position = {
      x: perk.position.x - minX,
      y: perk.position.y - minY,
    };
  }

  return {
    perks,
    grid: {
      width: maxX - minX + 1,
      height: maxY - minY + 1,
    },
  };
}

export function buildDestinyTreeFromConfig(darPerks, configNodes, existingTree) {
  const enabledNodes = configNodes
    .filter((node) => node.enabled && node.index > 0)
    .sort((left, right) => left.index - right.index);

  const existingById = new Map(existingTree.perks.map((perk) => [perk.id, perk]));
  const displayNames = buildDarDisplayNames(darPerks);
  const nodeIndexToPerkId = new Map();
  const perks = [];

  for (const [index, node] of enabledNodes.entries()) {
    const record = darPerks[index];
    if (!record) break;

    const sequence = index + 1;
    const fallbackId = destinyPerkId(sequence);
    const existing =
      existingById.get(fallbackId) ??
      existingTree.perks.find((perk) => perk.id.endsWith(`-${String(sequence).padStart(2, "0")}`));
    const id = existing?.id ?? fallbackId;
    const name = displayNames[index] ?? cleanName(record.name || record.edid);
    const description = cleanDescription(record.description ?? existing?.description ?? "");

    nodeIndexToPerkId.set(node.index, id);
    perks.push({
      id,
      name,
      skillReq: 0,
      ...(existing?.costsPerkPoint === false ? { costsPerkPoint: false } : {}),
      position: {
        x: Math.round(node.x * DESTINY_COORD_SCALE),
        y: Math.round(node.y * DESTINY_COORD_SCALE),
      },
      prerequisites: [],
      prerequisitesAny: [],
      description,
      effects: existing?.effects?.length ? existing.effects : parseBonusEffects(description),
    });
  }

  const perksById = new Map(perks.map((perk) => [perk.id, perk]));

  for (const node of enabledNodes) {
    const parentId = nodeIndexToPerkId.get(node.index);
    if (!parentId) continue;

    for (const childIndex of node.links) {
      const childId = nodeIndexToPerkId.get(childIndex);
      if (!childId || childId === parentId) continue;

      const childPerk = perksById.get(childId);
      if (childPerk && !childPerk.prerequisitesAny.includes(parentId)) {
        childPerk.prerequisitesAny.push(parentId);
      }
    }
  }

  const normalized = normalizeDestinyGrid(perks);
  return {
    skillId: DESTINY_SKILL_ID,
    skillName: "Destiny",
    ...normalized,
  };
}

export function buildFallbackDestinyTree(darPerks, existingTree) {
  const existingById = new Map(existingTree.perks.map((perk) => [perk.id, perk]));
  const displayNames = buildDarDisplayNames(darPerks);
  const columnWidth = 7;
  const perks = darPerks.map((record, index) => {
    const sequence = index + 1;
    const fallbackId = destinyPerkId(sequence);
    const existing = existingById.get(fallbackId);
    const name = displayNames[index] ?? cleanName(record.name || record.edid);

    return {
      id: existing?.id ?? fallbackId,
      name,
      skillReq: 0,
      ...(existing?.costsPerkPoint === false ? { costsPerkPoint: false } : {}),
      position: {
        x: index % columnWidth,
        y: Math.floor(index / columnWidth),
      },
      prerequisites: [],
      prerequisitesAny: [],
      description: cleanDescription(record.description ?? existing?.description ?? ""),
      effects: existing?.effects?.length
        ? existing.effects
        : parseBonusEffects(cleanDescription(record.description ?? existing?.description ?? "")),
    };
  });

  const normalized = normalizeDestinyGrid(perks);
  return {
    skillId: DESTINY_SKILL_ID,
    skillName: "Destiny",
    ...normalized,
  };
}

export function buildDestinyTree(perkRecords, installDir, existingTree) {
  const darPerks = collectDarPerkRecords(perkRecords);
  if (darPerks.length === 0) return existingTree;

  const configNodes = installDir ? loadDestinyConfig(installDir) : null;
  if (configNodes?.length) {
    return buildDestinyTreeFromConfig(darPerks, configNodes, existingTree);
  }

  return buildFallbackDestinyTree(darPerks, existingTree);
}

export function resolveTraitText(spellRecord) {
  const name = cleanName(spellRecord.name);
  const id = slugify(name);
  const rawText = cleanDescription(spellRecord.description || "");
  if (!rawText) {
    return { id, name, description: "", bonus: "" };
  }

  const parsed = parseTraitBody(rawText);
  return { id, name, ...parsed };
}

export function buildRaceAbilityLookup(spellRecords) {
  const byKey = new Map();
  const bySegmentPrefix = new Map();

  for (const record of spellRecords) {
    if (!record.edid.startsWith("REQ_Ability_Race_")) continue;

    const key = record.edid.slice("REQ_Ability_Race_".length);
    byKey.set(key, record);

    const segmentEnd = key.indexOf("_");
    const segment = segmentEnd === -1 ? key : key.slice(0, segmentEnd);
    if (!bySegmentPrefix.has(segment)) {
      bySegmentPrefix.set(segment, []);
    }
    bySegmentPrefix.get(segment).push({ key, record });
  }

  return { byKey, bySegmentPrefix };
}

export function raceBonusLabel(record) {
  const name = cleanName(record.name);
  const description = cleanWintersunEffectText(record.description);
  return description ? `${name}: ${description}` : name;
}

export function raceBonusName(bonus) {
  return bonus.split(":")[0]?.trim().toLowerCase() ?? "";
}

export function mergeRaceBonuses(imported, prior = []) {
  if (imported.length === 0) return prior;

  const importedNames = new Set(imported.map(raceBonusName));
  const preserved = prior.filter((bonus) => !importedNames.has(raceBonusName(bonus)));
  return [...imported, ...preserved];
}

export function collectRaceBonuses(raceEdid, abilityLookup) {
  const segment = RACE_ABILITY_SEGMENT[raceEdid];
  if (!segment) return [];

  const bonuses = [];
  const prefix = `${segment}_`;

  for (const { key, record } of abilityLookup.bySegmentPrefix.get(segment) ?? []) {
    if (!key.startsWith(prefix) || key.endsWith("_Buff")) continue;
    bonuses.push(raceBonusLabel(record));
  }

  for (const sharedKey of SHARED_RACE_ABILITIES[raceEdid] ?? []) {
    const record = abilityLookup.byKey.get(sharedKey);
    if (record) bonuses.push(raceBonusLabel(record));
  }

  return bonuses.sort((left, right) => raceBonusName(left).localeCompare(raceBonusName(right)));
}

export function cleanRaceDescription(description, raceEdid) {
  let cleaned = cleanDescription(description);
  if (raceEdid === "OrcRace") {
    cleaned = cleaned.replace(/\s*Berserk rage[^.]*\./gi, "").trim();
  }
  return cleaned;
}

export function findPriorRace(existingById, id, raceEdid) {
  return (
    existingById.get(id) ??
    (raceEdid === "OrcRace" ? existingById.get("orc") : undefined)
  );
}

export function mergeImportedRaceStats(prior, importedStats) {
  if (!importedStats) return {};

  return {
    startingAttributes: importedStats.startingAttributes,
    startingCarryWeight: importedStats.startingCarryWeight,
    unarmedDamage: importedStats.unarmedDamage,
    regen: importedStats.regen,
    startingSkills: {
      ...importedStats.startingSkills,
      destiny: prior?.startingSkills?.destiny ?? 1,
      traits: prior?.startingSkills?.traits ?? 0,
    },
  };
}

export function buildRaceEffectsFromRaces(races) {
  const raceEffects = {};

  for (const race of races) {
    if (race.id === "none") continue;
    raceEffects[race.id] = mergeEffects(
      ...race.bonuses.map((bonus) => parseBonusEffects(bonus)),
    );
  }

  return raceEffects;
}

export function birthsignIdFromName(name) {
  return slugify(name);
}

export function cleanBirthsignText(text) {
  return cleanDescription(String(text ?? ""))
    .replace(/<([^<>]+)>/g, "$1")
    .replace(/\s*Accept the sign of the [^.?]+\?\s*$/i, "")
    .trim();
}

export function parseBirthsignBody(text) {
  const cleaned = cleanBirthsignText(text);
  if (!cleaned) return { description: "", bonus: "" };

  const mechanicalStart = cleaned.search(
    /\.\s+(?:\d+%|Magicka|Magic|Health|Stamina|Movement|Sprinting?|Gain|Armor|Pickpocket|Lockpicking|Soul Gems|Daedric|Standing Stones|You are|Prices|Shouts|Spells|Reflect|Poison|Most|Improved|You receive|You do not|absorb|do not lose)/i,
  );

  if (mechanicalStart === -1) {
    return { description: cleaned, bonus: "" };
  }

  return {
    description: cleaned.slice(0, mechanicalStart + 1).trim(),
    bonus: cleaned.slice(mechanicalStart + 2).trim(),
  };
}

export function parseBirthsignMesg(description) {
  const sections = String(description ?? "")
    .split(/\r?\n\r?\n/)
    .map((section) => cleanBirthsignText(section))
    .filter(Boolean);

  const group = sections[0] ?? "";
  const body = sections.slice(1).join(" ");
  const { description: flavor, bonus } = parseBirthsignBody(body);

  return { group, description: flavor, bonus };
}

export function isBirthsignAbilitySpell(record) {
  if (!record.edid.startsWith("REQ_Ability_Birthsign_")) return false;
  const suffix = record.edid.slice("REQ_Ability_Birthsign_".length);
  return BIRTHSIGN_NAME_SET.has(suffix);
}

export function buildBirthsignMesgLookup(mesgRecords) {
  const byStone = new Map();

  for (const record of mesgRecords) {
    const match = record.edid.match(/^doom([A-Za-z]+)MSG$/);
    if (!match || match[1] === "AlreadyHave" || match[1].endsWith("Removed")) continue;
    if (!BIRTHSIGN_NAME_SET.has(match[1])) continue;
    byStone.set(match[1], record);
  }

  return byStone;
}

export function blessingIdFromName(spellName, altarKey = "") {
  const match = cleanName(spellName).match(/^Blessing of (.+)$/i);
  if (match) return slugify(match[1]);
  if (altarKey) return slugify(deityNameFromAltarKey(altarKey));
  return slugify(spellName);
}

export function blessingNameFromSpell(spellName, altarKey = "") {
  const match = cleanName(spellName).match(/^Blessing of (.+)$/i);
  if (match) return match[1];
  if (altarKey) return deityNameFromAltarKey(altarKey);
  return cleanName(spellName);
}

export function parseBlessingRequirement(failMessage) {
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

export function isAltarBlessingSpell(record) {
  return (
    record.edid.startsWith("WSN_AltarBlessing_") &&
    record.edid.endsWith("_Spell") &&
    !record.edid.includes("Gift")
  );
}

export function isVariantAltarBlessingSpell(record) {
  return /Gift|Cloak|BuffOnly|NoAutocast/i.test(record.edid);
}

export function altarKeyFromSpellEdid(edid) {
  const rawKey = edid.slice("WSN_AltarBlessing_".length, -"_Spell".length);
  return normalizeAltarKey(rawKey);
}

export function buildAltarBlessingSpellIndex(spellRecords) {
  const byAltarKey = new Map();

  for (const record of spellRecords) {
    if (!isAltarBlessingSpell(record)) continue;

    const altarKey = altarKeyFromSpellEdid(record.edid);
    const existing = byAltarKey.get(altarKey);
    if (!existing || (isVariantAltarBlessingSpell(existing) && !isVariantAltarBlessingSpell(record))) {
      byAltarKey.set(altarKey, record);
    }
  }

  return byAltarKey;
}

export function hasDeityFaithEffects({ shrine, follower, devotee }) {
  for (const value of [shrine, follower, devotee]) {
    const text = String(value ?? "").trim();
    if (text && text !== "-") return true;
  }
  return false;
}

export { parseRaceData };
