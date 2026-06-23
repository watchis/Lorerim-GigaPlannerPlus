import * as tesData from "@fcrick/tes-data";
import { open } from "node:fs/promises";
import { parseAvifRecord } from "./avif-perk-tree.mjs";
import { formatCount } from "./import-progress.mjs";
import { parsePerkRecordMetadata } from "./perk-record-parser.mjs";
import { parseMasters, resolveFormIdentity } from "./formid.mjs";
import { raceDataSkillScore } from "./race-data-parser.mjs";
import { getRecordBufferAsync, mapConcurrent, visitAsync } from "./plugin-io.mjs";
import {
  TRAITS_ABILITY_LIST_EDID,
  readFormIdsFromBuffer,
} from "./trait-ability-list.mjs";

const IMPORT_RECORD_TYPES = ["PERK", "SPEL", "RACE", "MESG", "QUST"];
const LORERIM_RACE_PLUGIN_PATTERN = /LoreRim - NPCs and Races/i;
const WINTERSUN_PLUGIN_PATTERN = /Wintersun/i;
const DEFAULT_PLUGIN_CONCURRENCY =
  Number(process.env.IMPORT_PLUGIN_CONCURRENCY) > 0
    ? Number(process.env.IMPORT_PLUGIN_CONCURRENCY)
    : 8;

function getSubrecord(record, type) {
  return record.subRecords?.find((sub) => sub.type === type)?.value;
}

function readDataBuffer(record) {
  const sub = record.subRecords?.find((entry) => entry.type === "DATA");
  if (!sub?.value) return null;
  if (Buffer.isBuffer(sub.value)) return sub.value;
  if (Array.isArray(sub.value)) return Buffer.from(sub.value);
  return null;
}

function readDnam(record) {
  const sub = record.subRecords?.find((entry) => entry.type === "DNAM");
  if (!sub?.value) return "";

  if (typeof sub.value === "string") return sub.value;
  if (Buffer.isBuffer(sub.value)) return sub.value.toString("utf8").replace(/\0/g, "");
  if (Array.isArray(sub.value)) return Buffer.from(sub.value).toString("utf8").replace(/\0/g, "");
  return "";
}

function buildPerkMeta(buffer, edid, ownerPluginLower, masters) {
  const meta = parsePerkRecordMetadata(buffer, edid);
  return {
    formIdentity: resolveFormIdentity(ownerPluginLower, masters, meta.rawFormId),
    skillReq: meta.skillReq,
    prerequisiteIdentities: meta.prerequisiteRawFormIds.map((rawFormId) =>
      resolveFormIdentity(ownerPluginLower, masters, rawFormId),
    ),
    nextRankIdentity:
      meta.nextRankRawFormId != null
        ? resolveFormIdentity(ownerPluginLower, masters, meta.nextRankRawFormId)
        : null,
  };
}

function parseRecord(buffer, ownerPluginLower, masters) {
  const record = tesData.getRecord(buffer);
  if (record.compressed) return null;

  const edid = getSubrecord(record, "EDID");
  if (!edid) return null;

  const effectDescription = record.recordType === "MGEF" ? readDnam(record) : "";

  return {
    type: record.recordType,
    edid,
    name: getSubrecord(record, "FULL") ?? "",
    description: getSubrecord(record, "DESC") ?? "",
    effectDescription,
    formId: record.formId ?? readRecordFormId(buffer),
    perkMeta:
      record.recordType === "PERK"
        ? buildPerkMeta(buffer, edid, ownerPluginLower, masters)
        : undefined,
    data: record.recordType === "RACE" ? readDataBuffer(record) : undefined,
  };
}

async function readPluginMasters(fd, offsets) {
  const header = offsets.find(([, type]) => type === "TES4");
  if (!header) return [];
  try {
    const buffer = await getRecordBufferAsync(fd, header[0]);
    return parseMasters(buffer);
  } catch {
    return [];
  }
}

function readRecordFormId(buffer) {
  if (buffer.length < 16) return 0;
  return buffer.readUInt32LE(12);
}

function mergeCollectedRecord(existing, incoming) {
  if (existing.type !== "RACE" || incoming.type !== "RACE") {
    return incoming;
  }

  const existingScore = raceDataSkillScore(existing.data);
  const incomingScore = raceDataSkillScore(incoming.data);
  return incomingScore >= existingScore ? incoming : existing;
}

function readEfitMagnitudes(recordBuffer) {
  const magnitudes = [];
  let index = 0;

  while ((index = recordBuffer.indexOf("EFIT", index)) !== -1) {
    const size = recordBuffer.readUInt16LE(index + 4);
    const data = recordBuffer.subarray(index + 6, index + 6 + size);
    if (data.length >= 4) magnitudes.push(data.readFloatLE(0));
    index += 4;
  }

  return magnitudes;
}

function altarKeyFromSpellEdid(edid) {
  if (!edid.startsWith("WSN_AltarBlessing_") || !edid.endsWith("_Spell")) return null;
  if (/Gift|Cloak|BuffOnly|NoAutocast/i.test(edid)) return null;
  return edid.slice("WSN_AltarBlessing_".length, -"_Spell".length);
}

function collectAltarBlessingFromSpellBuffer(buffer, edid, pluginName) {
  const altarKey = altarKeyFromSpellEdid(edid);
  if (!altarKey) return null;

  const effectMagnitudes = readEfitMagnitudes(buffer).filter((value) => value > 0);
  if (effectMagnitudes.length === 0) return null;

  return {
    altarKey,
    magnitude: effectMagnitudes[0],
    plugin: pluginName,
  };
}

function wantedTypesForPlugin(pluginName) {
  const wanted = new Set([...IMPORT_RECORD_TYPES, "AVIF", "FLST"]);
  if (WINTERSUN_PLUGIN_PATTERN.test(pluginName)) wanted.add("MGEF");
  return wanted;
}

async function readPluginImportPayload({ pluginName, path }) {
  const ownerPluginLower = (pluginName || path.split(/[/\\]/).pop() || "").toLowerCase();
  const wanted = wantedTypesForPlugin(pluginName);
  const isLorerimRacePlugin = LORERIM_RACE_PLUGIN_PATTERN.test(pluginName);

  const fh = await open(path, "r");
  const offsets = await visitAsync(fh.fd);
  const masters = await readPluginMasters(fh.fd, offsets);

  const records = [];
  const avifRecords = [];
  let traitsFormListFormIds = null;
  const altarBlessings = [];
  const lorerimRaceRecords = [];

  for (const [offset, type] of offsets) {
    if (!wanted.has(type)) continue;

    try {
      const buffer = await getRecordBufferAsync(fh.fd, offset);

      if (type === "AVIF") {
        const parsed = parseAvifRecord(buffer, ownerPluginLower, masters);
        if (parsed) avifRecords.push(parsed);
        continue;
      }

      if (type === "FLST") {
        const record = tesData.getRecord(buffer);
        if (record.compressed) continue;
        const edid = getSubrecord(record, "EDID");
        if (edid === TRAITS_ABILITY_LIST_EDID) {
          traitsFormListFormIds = readFormIdsFromBuffer(buffer);
        }
        continue;
      }

      const parsed = parseRecord(buffer, ownerPluginLower, masters);
      if (!parsed) continue;

      if (type === "SPEL") {
        const altarBlessing = collectAltarBlessingFromSpellBuffer(buffer, parsed.edid, pluginName);
        if (altarBlessing) altarBlessings.push(altarBlessing);
      }

      records.push(parsed);
      if (isLorerimRacePlugin && type === "RACE") {
        lorerimRaceRecords.push({ ...parsed, plugin: pluginName });
      }
    } catch {
      // Skip malformed or unsupported records instead of failing the whole import.
    }
  }

  await fh.close();

  return {
    pluginName,
    path,
    masters,
    records,
    avifRecords,
    traitsFormListFormIds,
    altarBlessings,
    lorerimRaceRecords,
  };
}

function mergePluginPayload(
  mergedByType,
  avifTrees,
  altarMagnitudes,
  lorerimRaceByEdid,
  traitsFormList,
  mastersByPath,
  payload,
) {
  const { pluginName, path, masters, records, avifRecords, traitsFormListFormIds, altarBlessings, lorerimRaceRecords } =
    payload;

  mastersByPath.set(path, masters);

  for (const record of records) {
    const key = `${record.type}:${record.edid}`;
    const next = { ...record, plugin: pluginName };
    const bucket = mergedByType[record.type];
    const existing = bucket.get(key);
    bucket.set(key, existing ? mergeCollectedRecord(existing, next) : next);
  }

  for (const tree of avifRecords) {
    avifTrees.set(tree.skillId, tree);
  }

  for (const blessing of altarBlessings) {
    altarMagnitudes.set(blessing.altarKey, {
      magnitude: blessing.magnitude,
      plugin: blessing.plugin,
    });
  }

  for (const record of lorerimRaceRecords) {
    const existing = lorerimRaceByEdid.get(record.edid);
    lorerimRaceByEdid.set(record.edid, existing ? mergeCollectedRecord(existing, record) : record);
  }

  if (traitsFormListFormIds != null) {
    traitsFormList.formIds = traitsFormListFormIds;
    traitsFormList.sourcePlugin = { pluginName, path };
  }
}

function createEmptyMergeBuckets() {
  return {
    PERK: new Map(),
    SPEL: new Map(),
    RACE: new Map(),
    MESG: new Map(),
    QUST: new Map(),
    MGEF: new Map(),
  };
}

/**
 * Single-pass plugin scan for the main import: PERK, AVIF, SPEL, RACE, MESG, QUST,
 * Wintersun MGEF, altar blessing magnitudes, Traits_AbilityList, and LoreRim race DATA.
 */
export async function collectImportPluginData(plugins, progress = null, options = {}) {
  const concurrency = options.concurrency ?? DEFAULT_PLUGIN_CONCURRENCY;
  const mergedByType = createEmptyMergeBuckets();
  const avifTrees = new Map();
  const altarMagnitudes = new Map();
  const lorerimRaceByEdid = new Map();
  const traitsFormList = { formIds: null, sourcePlugin: null };
  const mastersByPath = new Map();

  const scan = progress?.pluginScan?.("Scanning plugin records", plugins.length);
  const pluginPayloads = await mapConcurrent(plugins, concurrency, readPluginImportPayload);

  let recordCount = 0;
  for (const payload of pluginPayloads) {
    mergePluginPayload(
      mergedByType,
      avifTrees,
      altarMagnitudes,
      lorerimRaceByEdid,
      traitsFormList,
      mastersByPath,
      payload,
    );
    recordCount += payload.records.length;
    scan?.tick(
      payload.pluginName,
      recordCount > 0 ? `${formatCount(recordCount)} records` : "",
    );
  }

  const wintersunPluginNames = new Set(
    plugins.filter((plugin) => WINTERSUN_PLUGIN_PATTERN.test(plugin.pluginName)).map((plugin) => plugin.pluginName),
  );

  scan?.finish(
    `${formatCount(mergedByType.PERK.size)} PERK, ` +
      `${formatCount(avifTrees.size)} AVIF trees, ` +
      `${formatCount(mergedByType.SPEL.size)} SPEL`,
  );

  return {
    perkRecords: [...mergedByType.PERK.values()],
    avifTrees,
    spellRecords: [...mergedByType.SPEL.values()],
    raceRecords: [...mergedByType.RACE.values()],
    mesgRecords: [...mergedByType.MESG.values()],
    questRecords: [...mergedByType.QUST.values()],
    wintersunMgefRecords: [...mergedByType.MGEF.values()],
    wintersunMesgRecords: [...mergedByType.MESG.values()].filter((record) =>
      wintersunPluginNames.has(record.plugin),
    ),
    altarMagnitudes,
    lorerimRaceRecords: [...lorerimRaceByEdid.values()],
    traitsFormList,
    mastersByPath,
  };
}

export async function collectAltarBlessingMagnitudes(plugins, progress = null) {
  const magnitudes = new Map();
  const scan = progress?.pluginScan?.("Wintersun altar blessings", plugins.length);

  for (const { pluginName, path } of plugins) {
    const fh = await open(path, "r");
    const offsets = await visitAsync(fh.fd);

    for (const [offset, type] of offsets) {
      if (type !== "SPEL") continue;

      try {
        const buffer = await getRecordBufferAsync(fh.fd, offset);
        const record = tesData.getRecord(buffer);
        if (record.compressed) continue;

        const edid = getSubrecord(record, "EDID");
        const blessing = collectAltarBlessingFromSpellBuffer(buffer, edid, pluginName);
        if (!blessing) continue;

        magnitudes.set(blessing.altarKey, {
          magnitude: blessing.magnitude,
          plugin: blessing.plugin,
        });
      } catch {
        // Skip malformed records.
      }
    }

    await fh.close();
    scan?.tick(pluginName);
  }

  scan?.finish(`${formatCount(magnitudes.size)} altar keys`);
  return magnitudes;
}

export async function readPluginRecords(pluginPath, recordTypes, pluginName = "") {
  const wanted = new Set(recordTypes);
  const needsMasters = wanted.has("PERK") || wanted.has("AVIF");
  const ownerPluginLower = (pluginName || pluginPath.split(/[/\\]/).pop() || "").toLowerCase();
  const fh = await open(pluginPath, "r");
  const offsets = await visitAsync(fh.fd);
  const masters = needsMasters ? await readPluginMasters(fh.fd, offsets) : [];
  const records = [];

  for (const [offset, type] of offsets) {
    if (!wanted.has(type)) continue;
    try {
      const buffer = await getRecordBufferAsync(fh.fd, offset);
      if (type === "AVIF") {
        const parsed = parseAvifRecord(buffer, ownerPluginLower, masters);
        if (parsed) records.push(parsed);
        continue;
      }
      const parsed = parseRecord(buffer, ownerPluginLower, masters);
      if (parsed) records.push(parsed);
    } catch {
      // Skip malformed or unsupported records instead of failing the whole import.
    }
  }

  await fh.close();
  return records;
}

function formatRecordTypeLabel(recordTypes) {
  return recordTypes.join("/");
}

export async function collectRecordsFromPlugins(plugins, recordTypes, progress = null) {
  const merged = new Map();
  const label = formatRecordTypeLabel(recordTypes);
  const scan = progress?.pluginScan?.(`Scanning ${label}`, plugins.length);

  for (const { pluginName, path } of plugins) {
    const records = await readPluginRecords(path, recordTypes, pluginName);
    for (const record of records) {
      const key = `${record.type}:${record.edid}`;
      const next = { ...record, plugin: pluginName };
      const existing = merged.get(key);
      merged.set(key, existing ? mergeCollectedRecord(existing, next) : next);
    }
    scan?.tick(pluginName, records.length > 0 ? `${records.length} in plugin` : "");
  }

  scan?.finish(`${formatCount(merged.size)} unique ${label} records`);
  return [...merged.values()];
}
