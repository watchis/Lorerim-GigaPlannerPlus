import * as tesData from "@fcrick/tes-data";
import { open } from "node:fs/promises";
import { parsePerkRecordMetadata } from "./perk-record-parser.mjs";
import { parseMasters, resolveFormIdentity } from "./formid.mjs";
import { raceDataSkillScore } from "./race-data-parser.mjs";

function getRecordBufferAsync(file, offset) {
  return new Promise((resolve, reject) => {
    tesData.getRecordBuffer(file, offset, (err, buffer) => (err ? reject(err) : resolve(buffer)));
  });
}

function visitAsync(file) {
  const offsets = [];
  return new Promise((resolve, reject) => {
    tesData.visit(file, {
      visitOffset(offset, type) {
        offsets.push([offset, type]);
      },
      done() {
        resolve(offsets);
      },
    });
  });
}

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

export async function collectAltarBlessingMagnitudes(plugins) {
  const magnitudes = new Map();

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
        const altarKey = altarKeyFromSpellEdid(edid);
        if (!altarKey) continue;

        const effectMagnitudes = readEfitMagnitudes(buffer).filter((value) => value > 0);
        if (effectMagnitudes.length === 0) continue;

        magnitudes.set(altarKey, {
          magnitude: effectMagnitudes[0],
          plugin: pluginName,
        });
      } catch {
        // Skip malformed records.
      }
    }

    await fh.close();
  }

  return magnitudes;
}

export async function readPluginRecords(pluginPath, recordTypes, pluginName = "") {
  const wanted = new Set(recordTypes);
  const needsMasters = wanted.has("PERK");
  const ownerPluginLower = (pluginName || pluginPath.split(/[/\\]/).pop() || "").toLowerCase();
  const fh = await open(pluginPath, "r");
  const offsets = await visitAsync(fh.fd);
  const masters = needsMasters ? await readPluginMasters(fh.fd, offsets) : [];
  const records = [];

  for (const [offset, type] of offsets) {
    if (!wanted.has(type)) continue;
    try {
      const buffer = await getRecordBufferAsync(fh.fd, offset);
      const parsed = parseRecord(buffer, ownerPluginLower, masters);
      if (parsed) records.push(parsed);
    } catch {
      // Skip malformed or unsupported records instead of failing the whole import.
    }
  }

  await fh.close();
  return records;
}

export async function collectRecordsFromPlugins(plugins, recordTypes) {
  const merged = new Map();

  for (const { pluginName, path } of plugins) {
    const records = await readPluginRecords(path, recordTypes, pluginName);
    for (const record of records) {
      const key = `${record.type}:${record.edid}`;
      const next = { ...record, plugin: pluginName };
      const existing = merged.get(key);
      merged.set(key, existing ? mergeCollectedRecord(existing, next) : next);
    }
  }

  return [...merged.values()];
}
