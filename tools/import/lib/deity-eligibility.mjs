import * as tesData from "@fcrick/tes-data";
import { open } from "node:fs/promises";
import { cleanDescription, slugify } from "./transform-utils.mjs";

const GUIDE_URL = "https://www.lorerim.com/guides/character/divine";

const RACE_MAP_KEY_TO_DISPLAY = {
  Argonian: "Argonian",
  Breton: "Breton",
  DarkElf: "Dunmer",
  HighElf: "Altmer",
  Imperial: "Imperial",
  Khajiit: "Khajiit",
  Nord: "Nord",
  Orc: "Orsimer",
  Redguard: "Redguard",
  WoodElf: "Bosmer",
};

const RACE_FORM_ID_TO_DISPLAY = new Map([
  [0x0001_3740, "Argonian"],
  [0x0001_3741, "Breton"],
  [0x0001_3742, "Dunmer"],
  [0x0001_3743, "Altmer"],
  [0x0001_3745, "Imperial"],
  [0x0001_3746, "Khajiit"],
  [0x0001_3747, "Nord"],
  [0x0001_3749, "Redguard"],
  [0x0008_883a, "Bosmer"],
  [0x0008_883c, "Breton"],
  [0x0008_883d, "Dunmer"],
  [0x0008_8840, "Altmer"],
  [0x0008_8845, "Imperial"],
  [0x0008_8794, "Khajiit"],
  [0x0008_8484, "Redguard"],
  [0x000a_82b9, "Orsimer"],
]);

const BLOOD_NAME_TO_RACE = {
  argonian: "Argonian",
  breton: "Breton",
  "dark elven": "Dunmer",
  dunmer: "Dunmer",
  "high elven": "Altmer",
  altmer: "Altmer",
  imperial: "Imperial",
  khajiit: "Khajiit",
  nord: "Nord",
  nordic: "Nord",
  "orcish": "Orsimer",
  orsimer: "Orsimer",
  redguard: "Redguard",
  "wood elven": "Bosmer",
  bosmer: "Bosmer",
};

const DEITY_DA_QUEST_EDID = {
  azura: "DA01",
  boethiah: "DA02",
  "clavicus-vile": "DA03",
  "hermaeus-mora": "DA04",
  hircine: "DA05",
  malacath: "DA06",
  "mehrunes-dagon": "DA07",
  mephala: "DA08",
  meridia: "DA09",
  "molag-bal": "DA10",
  namira: "DA11",
  nocturnal: "DA13",
  peryite: "DA13",
  sanguine: "DA14",
  sheogorath: "DA15",
  vaermina: "DA16",
  sithis: "DB01",
};

const QUEST_DISPLAY_NAME_OVERRIDES = {
  DA01: "The Dark Star",
  DB01: "Innocence Lost",
};

const DIVINE_ALTAR_PREFIX = "Divine_";
const HUMAN_BLOOD_DIVINES_ALLOW_ALL = new Set([
  "akatosh",
  "arkay",
  "dibella",
  "julianos",
  "kynareth",
  "mara",
  "stendarr",
  "talos",
  "zenithar",
]);

function getSubrecord(record, type) {
  return record.subRecords?.find((sub) => sub.type === type)?.value;
}

async function visitPlugin(path) {
  const fh = await open(path, "r");
  const offsets = await new Promise((resolve, reject) => {
    const entries = [];
    tesData.visit(fh.fd, {
      visitOffset(offset, type) {
        entries.push([offset, type]);
      },
      done() {
        resolve(entries);
      },
      error: reject,
    });
  });
  return { fh, offsets };
}

function deityIdFromName(name) {
  return slugify(String(name ?? "").replace(/^the\s+/i, ""));
}

function normalizeRaceList(races) {
  const seen = new Set();
  const ordered = [];
  for (const race of races) {
    const trimmed = String(race ?? "").trim();
    if (!trimmed || seen.has(trimmed)) continue;
    seen.add(trimmed);
    ordered.push(trimmed);
  }
  return ordered;
}

function formatRaceList(races) {
  const normalized = normalizeRaceList(races);
  if (normalized.length === 0) return "";
  return normalized.join(" / ");
}

function formatCanFollow(parts) {
  const normalized = [];
  const seen = new Set();
  for (const part of parts) {
    const trimmed = String(part ?? "").trim();
    if (!trimmed) continue;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    normalized.push(trimmed);
  }
  if (normalized.length === 0) return "All";
  if (normalized.length === 1 && /^(all|everyone)$/i.test(normalized[0])) return "All";
  return normalized.join(" / ");
}

function parseBloodFragment(fragment) {
  const cleaned = cleanDescription(fragment).toLowerCase();
  if (!cleaned) return [];

  const races = [];
  const chunks = cleaned.split(/\s*(?:\/|,|\bor\b|\band\b)\s*/i);
  for (const chunk of chunks) {
    const match = chunk.match(
      /^(dark elven|high elven|wood elven|argonian|breton|imperial|khajiit|nord|orcish|orsimer|redguard|dunmer|altmer|bosmer|human)$/i,
    );
    if (!match) continue;
    const mapped = BLOOD_NAME_TO_RACE[match[1].toLowerCase()];
    if (mapped) races.push(mapped);
  }
  return races;
}

export function parseWorshipFailMessage(text) {
  const message = cleanDescription(text ?? "");
  if (!message) {
    return { kind: "none", races: [], requirement: "None" };
  }

  if (/does not accept those who have not served/i.test(message)) {
    return { kind: "served", races: [], requirement: "Must have served this deity" };
  }

  const onlyAccepts = message.match(/only accepts those of (.+?) blood/i);
  if (onlyAccepts) {
    return {
      kind: "race",
      races: parseBloodFragment(onlyAccepts[1]),
      requirement: "Race restricted",
    };
  }

  if (/does not accept those who are not of Human blood/i.test(message)) {
    return { kind: "human", races: [], requirement: "Human blood" };
  }

  const notOfBlood = message.match(/does not accept those who are not of (.+?) blood/i);
  if (notOfBlood) {
    return {
      kind: "race",
      races: parseBloodFragment(notOfBlood[1]),
      requirement: "Race restricted",
    };
  }

  if (/outlanders who have not proven themselves/i.test(message)) {
    return { kind: "served", races: ["Dunmer"], requirement: message };
  }

  return { kind: "other", races: [], requirement: message };
}

function raceFromFormId(formId) {
  if (!formId) return null;
  return RACE_FORM_ID_TO_DISPLAY.get(formId) ?? null;
}

async function readQuestVmadProperties(pluginPath, questEdid) {
  const { fh, offsets } = await visitPlugin(pluginPath);
  try {
    for (const [offset, type] of offsets) {
      if (type !== "QUST") continue;
      const buffer = await new Promise((resolve, reject) => {
        tesData.getRecordBuffer(fh.fd, offset, (error, value) => (error ? reject(error) : resolve(value)));
      });
      const record = tesData.getRecord(buffer);
      if (getSubrecord(record, "EDID") !== questEdid) continue;
      return record.subRecords?.find((sub) => sub.type === "VMAD")?.scripts?.[0]?.properties ?? [];
    }
    return [];
  } finally {
    await fh.close();
  }
}

async function extractWintersunQuestData(wintersunPluginPath) {
  const trackerProps = await readQuestVmadProperties(wintersunPluginPath, "WSN_TrackerQuest_Quest");
  const peryiteProps = await readQuestVmadProperties(wintersunPluginPath, "WSN_Peryite_Quest");

  const deityNames =
    trackerProps
      .find((property) => property.propertyName === "WSN_DeityName")
      ?.arrayString?.map((entry) => entry?.value ?? "") ?? [];

  const favoredRace0 =
    trackerProps
      .find((property) => property.propertyName === "WSN_FavoredRace0")
      ?.arrayObject?.map((entry) => raceFromFormId(entry?.formId)) ?? [];
  const favoredRace1 =
    trackerProps
      .find((property) => property.propertyName === "WSN_FavoredRace1")
      ?.arrayObject?.map((entry) => raceFromFormId(entry?.formId)) ?? [];

  const questFormIds =
    trackerProps
      .find((property) => property.propertyName === "WSN_QuestToComplete")
      ?.arrayObject?.map((entry) => entry?.formId ?? null) ?? [];

  const startingByRace = new Map();
  for (const property of peryiteProps.filter((entry) => entry.propertyName?.startsWith("WSN_DeityMap_"))) {
    const raceKey = property.propertyName.slice("WSN_DeityMap_".length);
    const displayRace = RACE_MAP_KEY_TO_DISPLAY[raceKey];
    if (!displayRace || !property.arrayInt) continue;
    const deityList = property.arrayInt
      .map((index) => deityNames[index])
      .filter(Boolean);
    startingByRace.set(displayRace, deityList);
  }

  return {
    deityNames,
    favoredRace0,
    favoredRace1,
    questFormIds,
    startingByRace,
  };
}

function invertStartingByRace(startingByRace) {
  const byDeity = new Map();
  for (const [race, deities] of startingByRace.entries()) {
    for (const deityName of deities) {
      const id = deityIdFromName(deityName);
      if (!byDeity.has(id)) byDeity.set(id, []);
      byDeity.get(id).push(race);
    }
  }
  for (const [id, races] of byDeity.entries()) {
    byDeity.set(id, normalizeRaceList(races));
  }
  return byDeity;
}

function indexDeityMetadata(questData) {
  const byId = new Map();
  for (let index = 0; index < questData.deityNames.length; index++) {
    const name = questData.deityNames[index];
    if (!name) continue;
    const id = deityIdFromName(name);
    const favored = normalizeRaceList(
      [questData.favoredRace0[index], questData.favoredRace1[index]].filter(Boolean),
    );
    byId.set(id, {
      name,
      index,
      favoredRaces: favored,
      questFormId: questData.questFormIds[index] ?? null,
    });
  }
  return byId;
}

const ALTAR_KEY_TO_DEITY_NAME = {
  Herma: "Hermaeus Mora",
  Mehrunes: "Mehrunes Dagon",
  MolagBal: "Molag Bal",
  Clavicus: "Clavicus Vile",
  HoonDing: "The HoonDing",
  RiddleThar: "Riddle'Thar",
  TheAllMaker: "The All-Maker",
  TheHist: "The Hist",
  TheMagnaGe: "The Magna-Ge",
  StAlessia: "St. Alessia",
  TallPapa: "Tall Papa",
  BaanDar: "Baan Dar",
  Totems: "The Old Ways",
  Zen: "Z'en",
  Almalexia: "Almalexia",
  SothaSil: "Sotha Sil",
  Sotha_Sil: "Sotha Sil",
  Vivec: "Vivec",
};

const ALTAR_VARIANT_SUFFIX = /(?:_Gift|_Cloak|_BuffOnly|_NoAutocast)$/i;

export function normalizeAltarKey(altarKey) {
  return String(altarKey ?? "").replace(ALTAR_VARIANT_SUFFIX, "");
}

export function deityNameFromAltarKey(altarKey) {
  const normalized = normalizeAltarKey(altarKey);
  const shortName = normalized.split("_").pop() ?? normalized;

  if (ALTAR_KEY_TO_DEITY_NAME[shortName]) {
    return ALTAR_KEY_TO_DEITY_NAME[shortName];
  }
  if (ALTAR_KEY_TO_DEITY_NAME[normalized]) {
    return ALTAR_KEY_TO_DEITY_NAME[normalized];
  }

  if (/^Tribunal_/i.test(normalized)) {
    const tribunalPart = normalized.slice("Tribunal_".length);
    if (ALTAR_KEY_TO_DEITY_NAME[tribunalPart]) {
      return ALTAR_KEY_TO_DEITY_NAME[tribunalPart];
    }
    return tribunalPart.replace(/_/g, " ");
  }

  return shortName.replace(/_/g, " ");
}

function deityIdFromAltarKey(altarKey) {
  return deityIdFromName(deityNameFromAltarKey(altarKey));
}

export function collectWorshipAltarKeys(mesgRecords) {
  const keys = new Set();
  for (const record of mesgRecords) {
    const match = record.edid?.match(/^WSN_WorshipRequest_Message_(.+)$/i);
    if (!match || /_Fail$/i.test(match[1])) continue;
    keys.add(normalizeAltarKey(match[1]));
  }
  return keys;
}

function collectFailMessagesByAltarKey(mesgRecords) {
  const byAltar = new Map();
  for (const record of mesgRecords) {
    const match = record.edid?.match(/^WSN_WorshipRequest_Message_(.+)_Fail/i);
    if (!match) continue;
    const altarKey = normalizeAltarKey(match[1]);
    const text = cleanDescription(record.description ?? "");
    if (!text) continue;
    if (!byAltar.has(altarKey)) byAltar.set(altarKey, []);
    byAltar.get(altarKey).push(text);
  }
  return byAltar;
}

function collectAltarKeyToDeityId(spellRecords) {
  const byAltar = new Map();
  for (const record of spellRecords) {
    if (!record.edid?.startsWith("WSN_AltarBlessing_") || !record.edid.endsWith("_Spell")) continue;
    if (/Gift|Cloak|BuffOnly|NoAutocast/i.test(record.edid)) continue;
    const altarKey = normalizeAltarKey(
      record.edid.slice("WSN_AltarBlessing_".length, -"_Spell".length),
    );
    const match = cleanDescription(record.name).match(/^Blessing of (.+)$/i);
    byAltar.set(altarKey, match ? deityIdFromName(match[1]) : deityIdFromAltarKey(altarKey));
  }
  return byAltar;
}

function buildQuestNameLookup(questRecords) {
  const byEdid = new Map();
  for (const record of questRecords) {
    if (!record.edid || !record.name) continue;
    byEdid.set(record.edid, record.name);
  }
  return byEdid;
}

function questPhraseForDeity(deityId, deityMeta, questByEdid) {
  const phrases = [];
  const trackerQuest = deityMeta?.questFormId;
  if (trackerQuest?.edid) {
    const override = QUEST_DISPLAY_NAME_OVERRIDES[trackerQuest.edid];
    phrases.push(`Anyone who has completed "${override ?? trackerQuest.name}"`);
  }

  const daEdid = DEITY_DA_QUEST_EDID[deityId];
  if (daEdid) {
    const name = QUEST_DISPLAY_NAME_OVERRIDES[daEdid] ?? questByEdid.get(daEdid);
    if (name) {
      phrases.push(`Anyone who has completed "${name}"`);
    }
  }

  return phrases[0] ?? null;
}

export function buildCanFollowFromInstall({
  deityId,
  deityName,
  altarKey,
  failMessages,
  deityMeta,
  startingRaces,
  questByEdid,
}) {
  if (!failMessages || failMessages.length === 0) {
    return { race: "All", requirement: "None" };
  }

  const parsedFails = failMessages.map(parseWorshipFailMessage);
  const requirement =
    parsedFails.find((entry) => entry.requirement && entry.requirement !== "None")?.requirement ?? "None";

  const raceParts = [];
  let needsQuest = false;

  for (const fail of parsedFails) {
    if (fail.kind === "none") continue;
    if (fail.kind === "human") {
      if (altarKey?.startsWith(DIVINE_ALTAR_PREFIX) && HUMAN_BLOOD_DIVINES_ALLOW_ALL.has(deityId)) {
        return { race: "All", requirement: "None" };
      }
      raceParts.push("Breton", "Imperial", "Nord", "Redguard");
      continue;
    }
    if (fail.kind === "race") {
      raceParts.push(...fail.races);
      continue;
    }
    if (fail.kind === "served") {
      needsQuest = true;
      raceParts.push(...startingRaces, ...(deityMeta?.favoredRaces ?? []));
      continue;
    }
  }

  if (needsQuest) {
    const questPhrase = questPhraseForDeity(deityId, deityMeta, questByEdid);
    if (questPhrase) raceParts.push(questPhrase);
  }

  const race = formatCanFollow(raceParts);
  return { race: race || "All", requirement };
}

function isIncompleteCanFollow(race, failMessages, guideEntry) {
  if (!failMessages || failMessages.length === 0) return false;
  const hasServed = failMessages.some((message) => /have not served/i.test(message));
  if (!hasServed) return false;

  const parts = race.split("/").map((part) => part.trim()).filter(Boolean);
  const hasQuestPhrase = parts.some((part) => /anyone who has completed/i.test(part));
  const hasRaces = parts.some((part) => !/anyone who has completed/i.test(part));

  if (guideEntry?.canFollow && guideEntry.canFollow !== "All" && !/^everyone$/i.test(guideEntry.canFollow)) {
    const guideParts = guideEntry.canFollow.split("/").map((part) => part.trim());
    const guideHasRaces = guideParts.some((part) => !/anyone who has completed/i.test(part));
    if (guideHasRaces && !hasRaces) return true;
  }

  return !hasQuestPhrase && !hasRaces;
}

export function normalizeGuideText(content) {
  const text = String(content ?? "");
  if (!/<html|<body|<p[\s>]/i.test(text)) return text;

  return text
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<\/h2>/gi, "\n")
    .replace(/<\/h1>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/[<>]/g, "")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/\u00a0/g, " ")
    .replace(/\r/g, "")
    .replace(/\n{3,}/g, "\n\n");
}

function sectionEndIndex(lines, startIndex) {
  for (let index = startIndex + 1; index < lines.length; index++) {
    const line = lines[index];
    if (/^Can follow /i.test(line)) return index;
    if (/^##\s+/.test(line)) return index;
    if (/^#\s+/.test(line) && !/^##\s+/.test(line)) return index;
    if (/^Page updated$/i.test(line)) return index;
    if (/Google Sites/i.test(line)) return index;
  }
  return lines.length;
}

const SHRINE_LOCATION_FOOTER = /Google Sites|Report abuse|DOCS_timing|WEBSITE BY|Page updated|Page details/i;
const SHRINE_LOCATION_SECTION_BREAK =
  /^(Can follow |#{1,6}\s|Temptation:|Tenets:|Follower:|Devotee:|Shrine Blessing:|Racial starting deity for:|Shrine locations:)/i;

function isShrineLocationLine(line) {
  const trimmed = String(line ?? "").trim();
  if (!trimmed) return false;
  if (SHRINE_LOCATION_SECTION_BREAK.test(trimmed)) return false;
  if (SHRINE_LOCATION_FOOTER.test(trimmed)) return false;
  if (/^-\s*/.test(trimmed)) {
    const content = trimmed.replace(/^-\s*/, "").trim();
    if (SHRINE_LOCATION_SECTION_BREAK.test(content)) return false;
    if (SHRINE_LOCATION_FOOTER.test(content)) return false;
    return content.length > 0;
  }
  if (/^Location:/i.test(trimmed)) return true;
  if (!/\s/.test(trimmed) && trimmed.length < 24) return false;
  return trimmed.length > 3;
}

export function parseShrineLocations(lines, startIndex, endIndex) {
  const locations = [];

  for (let index = startIndex; index < endIndex; index++) {
    if (!/^Shrine locations:/i.test(lines[index])) continue;

    for (let lookAhead = index + 1; lookAhead < endIndex; lookAhead++) {
      const line = lines[lookAhead];
      if (!line) continue;

      const trimmed = line.trim();
      if (!trimmed) continue;
      if (/^#{1,6}\s/.test(trimmed)) break;
      if (/^##\s+/.test(trimmed)) break;
      if (SHRINE_LOCATION_FOOTER.test(trimmed)) break;
      if (SHRINE_LOCATION_SECTION_BREAK.test(trimmed)) break;
      if (!isShrineLocationLine(trimmed)) break;

      locations.push(trimmed.replace(/^-\s*/, "").trim());
    }
    break;
  }

  return locations;
}

export function parseGuideDeityEligibility(content) {
  const byId = new Map();
  const normalized = normalizeGuideText(content);
  const lines = normalized.split("\n").map((line) => line.trim());

  for (let index = 0; index < lines.length; index++) {
    const canFollowMatch = lines[index].match(/Can follow (.+):\s*(.+)/i);
    if (!canFollowMatch) continue;

    const endIndex = sectionEndIndex(lines, index);

    let starting = "";
    for (let lookAhead = index + 1; lookAhead < Math.min(index + 6, endIndex); lookAhead++) {
      if (/^Can follow /i.test(lines[lookAhead])) break;
      const startingMatch = lines[lookAhead].match(/Racial starting deity for:\s*(.+)/i);
      if (startingMatch) {
        starting = startingMatch[1];
        break;
      }
    }

    const shrineLocations = parseShrineLocations(lines, index, endIndex);
    storeGuideEntry(byId, canFollowMatch[1], canFollowMatch[2], starting, shrineLocations);
  }

  for (const [id, entry] of parseTribunalGuideSections(lines).entries()) {
    if (!byId.has(id)) byId.set(id, entry);
  }

  return byId;
}

const TRIBUNAL_CAN_FOLLOW =
  'Dunmer / Anyone who has completed "Ghosts of the Tribunal"';

function storeGuideEntry(
  byId,
  deityName,
  canFollowRaw,
  startingRaw,
  shrineLocations = [],
  extra = {},
) {
  const cleanedName = cleanDescription(deityName);
  if (!cleanedName) return;

  const canFollow =
    !canFollowRaw || /^everyone$/i.test(canFollowRaw.trim()) || /^everone$/i.test(canFollowRaw.trim())
      ? "All"
      : cleanDescription(canFollowRaw).replace(/\s*\/\s*/g, " / ");

  const startingRawClean = cleanDescription(startingRaw);
  const starting =
    !startingRawClean || /^none$/i.test(startingRawClean)
      ? ""
      : startingRawClean.replace(/\s*\/\s*/g, " / ");

  byId.set(deityIdFromName(cleanedName), {
    canFollow,
    starting,
    shrineLocations,
    ...extra,
  });
}

function parseTribunalGuideSections(lines) {
  const byId = new Map();
  let inTribunal = false;

  for (let index = 0; index < lines.length; index++) {
    const line = lines[index];
    if (/^#\s*The Tribunal\b/i.test(line)) {
      inTribunal = true;
      continue;
    }
    if (!inTribunal) continue;
    if (/^#\s+/.test(line) && !/^##\s+/.test(line)) break;

    const deityHeading = line.match(/^##\s+(.+)$/);
    if (!deityHeading) continue;

    const deityName = cleanDescription(deityHeading[1]);
    let endIndex = lines.length;
    for (let lookAhead = index + 1; lookAhead < lines.length; lookAhead++) {
      if (/^##\s+/.test(lines[lookAhead]) || /^#\s+/.test(lines[lookAhead])) {
        endIndex = lookAhead;
        break;
      }
    }

    const shrineLocations = parseShrineLocations(lines, index, endIndex);
    storeGuideEntry(byId, deityName, TRIBUNAL_CAN_FOLLOW, "", shrineLocations);
  }

  return byId;
}

export async function fetchGuideDeityEligibility() {
  const response = await fetch(GUIDE_URL);
  if (!response.ok) {
    throw new Error(`Failed to fetch deity guide (${response.status})`);
  }
  const markdown = await response.text();
  return parseGuideDeityEligibility(markdown);
}

function mergeEligibility(installEntry, guideEntry) {
  const starting = installEntry.starting || guideEntry?.starting || "";
  let race = installEntry.race || "All";
  let requirement = installEntry.requirement || "None";

  if (guideEntry) {
    if (!starting && guideEntry.starting) {
      installEntry.starting = guideEntry.starting;
    }
    if (isIncompleteCanFollow(race, installEntry.failMessages, guideEntry) && guideEntry.canFollow) {
      race = /^everyone$/i.test(guideEntry.canFollow) ? "All" : guideEntry.canFollow;
      requirement = "Must have served this deity";
    } else if (race === "All" && guideEntry.canFollow && guideEntry.canFollow !== "All" && installEntry.failMessages?.length) {
      race = guideEntry.canFollow;
    }
  }

  return {
    starting: installEntry.starting || guideEntry?.starting || "",
    race,
    requirement,
  };
}

export async function buildDeityEligibilityIndex({
  wintersunPlugins,
  mesgRecords,
  questRecords,
  spellRecords = [],
  useGuideFallback = true,
}) {
  const wintersunPluginPath = wintersunPlugins.find((plugin) =>
    /Wintersun - Faiths of Skyrim\.esp$/i.test(plugin.path),
  )?.path;

  const questByEdid = buildQuestNameLookup(questRecords);
  const questByFormId = new Map();
  for (const record of questRecords) {
    if (record.formId && record.edid) {
      questByFormId.set(record.formId, { edid: record.edid, name: record.name });
    }
  }

  let questData = {
    deityNames: [],
    favoredRace0: [],
    favoredRace1: [],
    questFormIds: [],
    startingByRace: new Map(),
  };

  if (wintersunPluginPath) {
    questData = await extractWintersunQuestData(wintersunPluginPath);
  }

  const deityMetaById = indexDeityMetadata(questData);
  for (const [id, meta] of deityMetaById.entries()) {
    const rawFormId = questData.questFormIds[meta.index];
    meta.questFormId = rawFormId ? questByFormId.get(rawFormId) ?? null : null;
    deityMetaById.set(id, meta);
  }

  const startingByDeity = invertStartingByRace(questData.startingByRace);
  const failByAltar = collectFailMessagesByAltarKey(mesgRecords);
  const altarKeyToDeityId = collectAltarKeyToDeityId(spellRecords);

  let guideById = new Map();
  if (useGuideFallback) {
    try {
      guideById = await fetchGuideDeityEligibility();
    } catch (error) {
      console.warn(
        `Warning: could not fetch deity guide fallback (${error instanceof Error ? error.message : error})`,
      );
    }
  }

  const byDeityId = new Map();

  for (const [id, races] of startingByDeity.entries()) {
    byDeityId.set(id, {
      starting: formatRaceList(races),
      race: "All",
      requirement: "None",
      failMessages: [],
    });
  }

  for (const [altarKey, failMessages] of failByAltar.entries()) {
    const deityId = altarKeyToDeityId.get(altarKey) ?? deityIdFromAltarKey(altarKey);
    const meta = deityMetaById.get(deityId);
    const startingRaces = startingByDeity.get(deityId) ?? [];
    const install = buildCanFollowFromInstall({
      deityId,
      deityName: meta?.name ?? altarKey,
      altarKey,
      failMessages,
      deityMeta: meta,
      startingRaces,
      questByEdid,
    });

    const prior = byDeityId.get(deityId) ?? {
      starting: formatRaceList(startingRaces),
      race: "All",
      requirement: "None",
      failMessages,
    };

    byDeityId.set(deityId, {
      ...prior,
      ...install,
      starting: prior.starting || formatRaceList(startingRaces),
      failMessages,
    });
  }

  for (const [id, meta] of deityMetaById.entries()) {
    if (byDeityId.has(id)) continue;
    byDeityId.set(id, {
      starting: formatRaceList(startingByDeity.get(id) ?? []),
      race: "All",
      requirement: "None",
      failMessages: [],
    });
  }

  for (const [id, entry] of byDeityId.entries()) {
    const guideEntry = guideById.get(id);
    const merged = mergeEligibility(entry, guideEntry);
    byDeityId.set(id, {
      starting: merged.starting,
      race: merged.race,
      requirement: merged.requirement,
      shrineLocations: guideEntry?.shrineLocations ?? [],
    });
  }

  return byDeityId;
}

export function resolveDeityEligibility(deityId, deityName, eligibilityById) {
  const direct = eligibilityById.get(deityId);
  if (direct) return direct;

  const byName = [...eligibilityById.entries()].find(([id]) => id === deityIdFromName(deityName));
  return byName?.[1] ?? { starting: "", race: "All", requirement: "None", shrineLocations: [] };
}

export { deityIdFromAltarKey, deityIdFromName };
