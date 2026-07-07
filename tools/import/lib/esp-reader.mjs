import * as tesData from "@fcrick/tes-data";
import { open } from "node:fs/promises";
import { parseAvifRecord } from "./avif-perk-tree.mjs";
import { formatCount } from "./import-progress.mjs";
import { parsePerkRecordMetadata } from "./perk-record-parser.mjs";
import { parseMasters, resolveFormIdentity } from "./formid.mjs";
import { raceDataSkillScore } from "./race-data-parser.mjs";
import { getRecordBufferAsync, mapConcurrent, visitAsync } from "./plugin-io.mjs";
import { normalizeAltarKey } from "./deity-eligibility.mjs";
import {
  collectBoonMgefFormIds,
  isAltarBlessingMgefEdid,
  parseShrineMgefAltarKey,
} from "./deity-faith-from-plugins.mjs";
import {
  meaningfulSpellMagnitudes,
  readSpellEfitMagnitudes,
  readSpellFaithEffectEntries,
  readSpellMagnitudesForFormIds,
} from "./spell-magnitude.mjs";

const IMPORT_RECORD_TYPES = ["PERK", "SPEL", "RACE", "MESG", "QUST"];
const LORERIM_RACE_PLUGIN_PATTERN = /LoreRim - NPCs and Races/i;
export const WINTERSUN_FAITH_PLUGIN_PATTERN = /Wintersun|Tribunal Integration/i;
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
    playerLevelReq: meta.playerLevelReq,
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

/**
 * Skyrim SPEL effects use EFID (MGEF FormID) + EFIT (magnitude, area, duration).
 * Re-exported for tests and callers that read altar blessing magnitudes.
 */
export { meaningfulSpellMagnitudes, readSpellEfitMagnitudes } from "./spell-magnitude.mjs";

function parseFaithMgefLookupArg(lookupArg, pluginName = "", masters = []) {
  if (!lookupArg) {
    return {
      formIdsByEdid: new Map(),
      edidByFormIdentity: new Map(),
      ownerPluginLower: pluginName.toLowerCase(),
      masters,
    };
  }

  if (lookupArg instanceof Map) {
    return {
      formIdsByEdid: lookupArg,
      edidByFormIdentity: new Map(),
      ownerPluginLower: pluginName.toLowerCase(),
      masters,
    };
  }

  return {
    formIdsByEdid: lookupArg.formIdsByEdid ?? new Map(),
    edidByFormIdentity: lookupArg.edidByFormIdentity ?? new Map(),
    ownerPluginLower: lookupArg.ownerPluginLower ?? pluginName.toLowerCase(),
    masters: lookupArg.masters ?? masters,
  };
}

function resolveFaithMgefEdid(formId, lookup) {
  if (formId == null || !lookup) return null;

  const { formIdsByEdid, edidByFormIdentity, ownerPluginLower, masters } = lookup;
  if (edidByFormIdentity?.size && masters?.length) {
    const identity = resolveFormIdentity(ownerPluginLower, masters, formId);
    const byIdentity = edidByFormIdentity.get(identity);
    if (byIdentity) return byIdentity;
  }

  for (const [edid, mappedFormId] of formIdsByEdid ?? []) {
    if (mappedFormId === formId) return edid;
  }

  return null;
}

function hasFaithMgefLookup(lookup) {
  return lookup?.formIdsByEdid?.size > 0 || lookup?.edidByFormIdentity?.size > 0;
}

function collectShrineEffectsFromSpell(buffer, lookup) {
  return readSpellFaithEffectEntries(buffer)
    .map((entry) => ({
      ...entry,
      mgefEdid: resolveFaithMgefEdid(entry.formId, lookup),
    }))
    .filter((entry) => entry.magnitude != null && isAltarBlessingMgefEdid(entry.mgefEdid));
}

function resolveAltarBlessingFromSpellEffects(buffer, lookup) {
  if (!hasFaithMgefLookup(lookup)) return null;

  const shrineEffects = collectShrineEffectsFromSpell(buffer, lookup);
  if (shrineEffects.length === 0) return null;

  const altarKey = parseShrineMgefAltarKey(shrineEffects[0].mgefEdid);
  if (!altarKey) return null;

  return {
    altarKey,
    magnitudes: shrineEffects.map((entry) => entry.magnitude),
    shrineMgefEdid: shrineEffects[0].mgefEdid,
  };
}

function pickAltarBlessingMagnitudes(buffer, altarKey, lookup) {
  const resolved = resolveAltarBlessingFromSpell(buffer, altarKey, lookup);
  return resolved?.magnitudes ?? [];
}

function resolveAltarBlessingFromSpell(buffer, altarKey, lookup) {
  if (hasFaithMgefLookup(lookup)) {
    const shrineEffects = collectShrineEffectsFromSpell(buffer, lookup);
    if (shrineEffects.length === 0) return null;

    return {
      magnitudes: shrineEffects.map((entry) => entry.magnitude),
      shrineMgefEdid: shrineEffects[0].mgefEdid,
    };
  }

  const magnitudes = meaningfulSpellMagnitudes(buffer);
  if (magnitudes.length === 0) return null;
  return { magnitudes, shrineMgefEdid: null };
}

function pickBoonMagnitudes(buffer, altarKey, boonNumber, lookup) {
  if (hasFaithMgefLookup(lookup)) {
    const boonFormIds = collectBoonMgefFormIds(lookup.formIdsByEdid ?? new Map(), altarKey, boonNumber);
    const boonEdids = new Set();
    for (const [edid, formId] of lookup.formIdsByEdid ?? []) {
      if (boonFormIds.has(formId)) boonEdids.add(edid);
    }

    if (boonEdids.size > 0) {
      const magnitudes = [];
      for (const entry of readSpellFaithEffectEntries(buffer)) {
        if (entry.magnitude == null) continue;
        const edid = resolveFaithMgefEdid(entry.formId, lookup);
        if (edid && boonEdids.has(edid)) magnitudes.push(entry.magnitude);
      }
      if (magnitudes.length > 0) return magnitudes;
    }

    const magnitudes = readSpellMagnitudesForFormIds(buffer, boonFormIds);
    if (magnitudes.length > 0) return magnitudes;

    return [];
  }

  return meaningfulSpellMagnitudes(buffer);
}

function spellBufferHasAltarBlessingEffect(buffer, lookup) {
  if (!hasFaithMgefLookup(lookup)) return false;
  return collectShrineEffectsFromSpell(buffer, lookup).length > 0;
}

function isVariantAltarBlessingSpellEdid(edid) {
  return /Gift|Cloak|BuffOnly|NoAutocast/i.test(edid);
}

function shouldReplaceAltarMagnitude(existing, incoming) {
  if (!existing) return true;
  if (existing.isVariant && !incoming.isVariant) return true;
  if (!existing.isVariant && incoming.isVariant) return false;
  if (incoming.magnitudes.length === 0) return false;
  if (existing.magnitudes.length === 0) return true;
  if (incoming.shrineMgefEdid && !existing.shrineMgefEdid) return true;
  if (!incoming.shrineMgefEdid && existing.shrineMgefEdid) return false;
  return true;
}

function altarKeyFromSpellEdid(edid) {
  if (!edid.startsWith("WSN_AltarBlessing_") || !edid.endsWith("_Spell")) return null;

  const rawKey = edid.slice("WSN_AltarBlessing_".length, -"_Spell".length);
  return normalizeAltarKey(rawKey);
}

export function collectAltarBlessingFromSpellBuffer(buffer, edid, pluginName, lookupArg = null) {
  const lookup = parseFaithMgefLookupArg(lookupArg, pluginName);
  const altarKey = altarKeyFromSpellEdid(edid);
  const resolved = altarKey
    ? resolveAltarBlessingFromSpell(buffer, altarKey, lookup)
    : resolveAltarBlessingFromSpellEffects(buffer, lookup);

  if (!resolved || resolved.magnitudes.length === 0) return null;

  return {
    altarKey: altarKey ?? resolved.altarKey,
    magnitudes: resolved.magnitudes,
    magnitude: Math.max(...resolved.magnitudes),
    shrineMgefEdid: resolved.shrineMgefEdid,
    plugin: pluginName,
    isVariant: altarKey ? isVariantAltarBlessingSpellEdid(edid) : false,
  };
}

const BOON_SPELL_PATTERN = /^WSN(?:_AltarBlessing)?_(.+)_Boon([12])_Spell/i;

function boonMagnitudeKey(altarKey, boonNumber) {
  return `${normalizeAltarKey(altarKey)}:${boonNumber}`;
}

function parseBoonSpellEdid(edid) {
  const match = edid.match(BOON_SPELL_PATTERN);
  if (!match) return null;

  return {
    altarKey: normalizeAltarKey(match[1]),
    boonNumber: Number(match[2]),
  };
}

function isVariantBoonSpellEdid(edid) {
  return !/_Spell_Ab$/i.test(edid);
}

function shouldReplaceBoonMagnitude(existing, incoming) {
  if (!existing) return true;
  if (existing.isVariant && !incoming.isVariant) return true;
  if (!existing.isVariant && incoming.isVariant) return false;
  // Same spell tier: later plugin in load order wins.
  return true;
}

export function collectBoonFromSpellBuffer(buffer, edid, pluginName, lookupArg = null) {
  const parsed = parseBoonSpellEdid(edid);
  if (!parsed) return null;

  const lookup = parseFaithMgefLookupArg(lookupArg, pluginName);
  const magnitudes = pickBoonMagnitudes(
    buffer,
    parsed.altarKey,
    parsed.boonNumber,
    lookup,
  );
  if (magnitudes.length === 0) return null;

  return {
    key: boonMagnitudeKey(parsed.altarKey, parsed.boonNumber),
    altarKey: parsed.altarKey,
    boonNumber: parsed.boonNumber,
    magnitudes,
    magnitude: Math.max(...magnitudes),
    plugin: pluginName,
    isVariant: isVariantBoonSpellEdid(edid),
  };
}

function wantedTypesForPlugin(pluginName) {
  const wanted = new Set([...IMPORT_RECORD_TYPES, "AVIF", "FLST"]);
  if (WINTERSUN_FAITH_PLUGIN_PATTERN.test(pluginName)) wanted.add("MGEF");
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
  const faithSpellCandidates = [];
  const lorerimRaceRecords = [];
  const pluginMgefFormIds = new Map();
  const pluginMgefIdentities = new Map();

  for (const [offset, type] of offsets) {
    if (type !== "MGEF" || !wanted.has(type)) continue;

    try {
      const buffer = await getRecordBufferAsync(fh.fd, offset);
      const parsed = parseRecord(buffer, ownerPluginLower, masters);
      if (parsed?.edid && parsed.formId != null) {
        pluginMgefFormIds.set(parsed.edid, parsed.formId);
        pluginMgefIdentities.set(
          resolveFormIdentity(ownerPluginLower, masters, parsed.formId),
          parsed.edid,
        );
      }
    } catch {
      // Skip malformed MGEF records.
    }
  }

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
        const spellEdid = parsed.edid;
        const pluginFaithLookup = {
          formIdsByEdid: pluginMgefFormIds,
          edidByFormIdentity: pluginMgefIdentities,
          ownerPluginLower,
          masters,
        };
        if (
          spellEdid.startsWith("WSN_AltarBlessing_") ||
          BOON_SPELL_PATTERN.test(spellEdid) ||
          spellBufferHasAltarBlessingEffect(buffer, pluginFaithLookup)
        ) {
          faithSpellCandidates.push({ edid: spellEdid, buffer: Buffer.from(buffer) });
        }
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
    faithSpellCandidates,
    pluginMgefFormIds,
    pluginMgefIdentities,
    lorerimRaceRecords,
  };
}

function mergePluginPayload(
  mergedByType,
  avifTrees,
  lorerimRaceByEdid,
  traitsFormList,
  mastersByPath,
  payload,
) {
  const {
    pluginName,
    path,
    masters,
    records,
    avifRecords,
    traitsFormListFormIds,
    lorerimRaceRecords,
  } = payload;

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

  for (const record of lorerimRaceRecords) {
    const existing = lorerimRaceByEdid.get(record.edid);
    lorerimRaceByEdid.set(record.edid, existing ? mergeCollectedRecord(existing, record) : record);
  }

  if (traitsFormListFormIds != null) {
    traitsFormList.formIds = traitsFormListFormIds;
    traitsFormList.sourcePlugin = { pluginName, path };
  }
}

function buildFaithMgefLookup(orderedPayloads) {
  const formIdsByEdid = new Map();
  const edidByFormIdentity = new Map();

  for (const payload of orderedPayloads) {
    if (!WINTERSUN_FAITH_PLUGIN_PATTERN.test(payload.pluginName)) continue;
    for (const [edid, formId] of payload.pluginMgefFormIds ?? []) {
      formIdsByEdid.set(edid, formId);
    }
    for (const [identity, edid] of payload.pluginMgefIdentities ?? []) {
      edidByFormIdentity.set(identity, edid);
    }
  }

  return { formIdsByEdid, edidByFormIdentity };
}

function collectFaithSpellMagnitudes(orderedPayloads) {
  const altarMagnitudes = new Map();
  const boonMagnitudes = new Map();
  const globalLookup = buildFaithMgefLookup(orderedPayloads);

  for (const payload of orderedPayloads) {
    if (!WINTERSUN_FAITH_PLUGIN_PATTERN.test(payload.pluginName)) continue;

    const lookup = {
      ...globalLookup,
      ownerPluginLower: (payload.pluginName || "").toLowerCase(),
      masters: payload.masters ?? [],
    };

    for (const candidate of payload.faithSpellCandidates ?? []) {
      const altarBlessing = collectAltarBlessingFromSpellBuffer(
        candidate.buffer,
        candidate.edid,
        payload.pluginName,
        lookup,
      );
      if (altarBlessing) {
        const existing = altarMagnitudes.get(altarBlessing.altarKey);
        if (shouldReplaceAltarMagnitude(existing, altarBlessing)) {
          altarMagnitudes.set(altarBlessing.altarKey, {
            magnitudes: altarBlessing.magnitudes,
            magnitude: altarBlessing.magnitude,
            shrineMgefEdid: altarBlessing.shrineMgefEdid ?? null,
            plugin: altarBlessing.plugin,
            isVariant: altarBlessing.isVariant,
          });
        }
      }

      const boonBlessing = collectBoonFromSpellBuffer(
        candidate.buffer,
        candidate.edid,
        payload.pluginName,
        lookup,
      );
      if (boonBlessing) {
        const existing = boonMagnitudes.get(boonBlessing.key);
        if (shouldReplaceBoonMagnitude(existing, boonBlessing)) {
          boonMagnitudes.set(boonBlessing.key, {
            altarKey: boonBlessing.altarKey,
            boonNumber: boonBlessing.boonNumber,
            magnitudes: boonBlessing.magnitudes,
            magnitude: boonBlessing.magnitude,
            plugin: boonBlessing.plugin,
            isVariant: boonBlessing.isVariant,
          });
        }
      }
    }
  }

  return { altarMagnitudes, boonMagnitudes };
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
  const lorerimRaceByEdid = new Map();
  const traitsFormList = { formIds: null, sourcePlugin: null };
  const mastersByPath = new Map();

  const scan = progress?.pluginScan?.("Scanning plugin records", plugins.length);
  let recordsRead = 0;
  const pluginPayloads = await mapConcurrent(plugins, concurrency, async (plugin) => {
    const payload = await readPluginImportPayload(plugin);
    recordsRead += payload.records.length;
    scan?.tick(
      recordsRead > 0 ? `${formatCount(recordsRead)} records read` : "reading files",
    );
    return payload;
  });

  // Merge in load-order sequence so later plugins override earlier ones.
  progress?.activity?.("Merging records by load order…");
  const payloadsByName = new Map(pluginPayloads.map((payload) => [payload.pluginName, payload]));
  const orderedPayloads = plugins
    .map((plugin) => payloadsByName.get(plugin.pluginName))
    .filter(Boolean);

  for (const payload of orderedPayloads) {
    mergePluginPayload(
      mergedByType,
      avifTrees,
      lorerimRaceByEdid,
      traitsFormList,
      mastersByPath,
      payload,
    );
  }

  const { altarMagnitudes, boonMagnitudes } = collectFaithSpellMagnitudes(orderedPayloads);

  const wintersunPluginNames = new Set(
    plugins
      .filter((plugin) => WINTERSUN_FAITH_PLUGIN_PATTERN.test(plugin.pluginName))
      .map((plugin) => plugin.pluginName),
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
    boonMagnitudes,
    lorerimRaceRecords: [...lorerimRaceByEdid.values()],
    traitsFormList,
    mastersByPath,
  };
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
    scan?.tick(records.length > 0 ? `${formatCount(records.length)} records` : "");
  }

  scan?.finish(`${formatCount(merged.size)} unique ${label} records`);
  return [...merged.values()];
}
