import * as tesData from "@fcrick/tes-data";
import { resolveFormIdentity } from "./formid.mjs";

export const BITTERCUP_PLUGIN_PATTERN = /cckrtsse001/i;
export const BITTERCUP_RECORD_PATTERN = /bittercup/i;
export const BITTERCUP_ALCH_EDID = /^ccKRTSSE001_Bittercup$/i;

const VALUE_MOD_EFFECT_TYPE = 0;

/** Skyrim actor value indices for the three attributes. */
const ATTRIBUTE_ACTOR_VALUES = new Map([
  [24, "health"],
  [25, "magicka"],
  [26, "stamina"],
]);

const ATTRIBUTE_STATS = ["health", "magicka", "stamina"];

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

function readSignedEfitMagnitude(sub) {
  if (sub.value?.magnitude != null && Number.isFinite(sub.value.magnitude)) {
    return sub.value.magnitude;
  }

  const raw =
    Buffer.isBuffer(sub.value) ? sub.value : Array.isArray(sub.value) ? Buffer.from(sub.value) : null;
  if (raw?.length >= 4) {
    const magnitude = raw.readFloatLE(0);
    if (Number.isFinite(magnitude)) return magnitude;
  }

  return null;
}

function readSignedSpellEffectEntriesRaw(recordBuffer) {
  const entries = [];
  let index = 0;

  while (index < recordBuffer.length) {
    const efidIdx = recordBuffer.indexOf("EFID", index);
    if (efidIdx === -1) break;

    const efidSize = recordBuffer.readUInt16LE(efidIdx + 4);
    const efidData = recordBuffer.subarray(efidIdx + 6, efidIdx + 6 + efidSize);
    const formId = efidData.length >= 4 ? efidData.readUInt32LE(0) : null;

    const efitIdx = recordBuffer.indexOf("EFIT", efidIdx + 4);
    if (efitIdx === -1) break;

    const efitSize = recordBuffer.readUInt16LE(efitIdx + 4);
    const efitData = recordBuffer.subarray(efitIdx + 6, efitIdx + 6 + efitSize);
    const magnitude =
      efitData.length >= 4 && Number.isFinite(efitData.readFloatLE(0))
        ? efitData.readFloatLE(0)
        : null;

    if (formId != null) entries.push({ formId, magnitude });

    index = efidIdx + 4;
  }

  return entries;
}

function readSignedSpellEffectEntries(recordBuffer) {
  try {
    const record = tesData.getRecord(recordBuffer);
    if (!record.compressed) {
      const entries = [];
      let pendingFormId = null;

      for (const sub of record.subRecords ?? []) {
        if (sub.type === "EFID") {
          pendingFormId =
            typeof sub.value === "number"
              ? sub.value
              : sub.value?.formId != null
                ? sub.value.formId
                : Buffer.isBuffer(sub.value) && sub.value.length >= 4
                  ? sub.value.readUInt32LE(0)
                  : null;
          continue;
        }

        if (sub.type !== "EFIT" || pendingFormId == null) continue;
        entries.push({
          formId: pendingFormId,
          magnitude: readSignedEfitMagnitude(sub),
        });
        pendingFormId = null;
      }

      if (entries.length > 0) return entries;
    }
  } catch {
    // Fall back to raw scan below.
  }

  return readSignedSpellEffectEntriesRaw(recordBuffer);
}

/**
 * Parse a Value Mod MGEF DATA block for Health/Magicka/Stamina.
 */
export function parseAttributeValueModMgef(buffer) {
  let data = null;

  try {
    const record = tesData.getRecord(buffer);
    if (!record.compressed) {
      data = readDataBuffer(record);
    }
  } catch {
    // Fall back to raw DATA scan below.
  }

  if (!data) {
    const dataIndex = buffer.indexOf("DATA");
    if (dataIndex !== -1) {
      const size = buffer.readUInt16LE(dataIndex + 4);
      data = buffer.subarray(dataIndex + 6, dataIndex + 6 + size);
    }
  }

  if (!data || data.length < 0x48) return null;

  const effectType = data.readUInt32LE(0x40);
  if (effectType !== VALUE_MOD_EFFECT_TYPE) return null;

  const stat = ATTRIBUTE_ACTOR_VALUES.get(data.readInt32LE(0x44));
  if (!stat) return null;

  return { stat, effectType };
}

export function isBittercupPluginName(pluginName) {
  return BITTERCUP_PLUGIN_PATTERN.test(String(pluginName ?? ""));
}

export function isBittercupRecordEdid(edid) {
  return BITTERCUP_RECORD_PATTERN.test(String(edid ?? ""));
}

function resolveMgefEdid(formId, lookup) {
  if (formId == null || !lookup) return null;

  const direct = lookup.formIdsByEdid
    ? [...lookup.formIdsByEdid.entries()].find(([, id]) => id === formId)?.[0]
    : null;
  if (direct) return direct;

  const identity = resolveFormIdentity(
    lookup.ownerPluginLower ?? "",
    lookup.masters ?? [],
    formId,
  );
  return lookup.edidByFormIdentity?.get(identity) ?? null;
}

function resolveMgefStat(formId, lookup, mgefByEdid) {
  const edid = resolveMgefEdid(formId, lookup);
  if (!edid) return null;
  return mgefByEdid.get(edid)?.stat ?? null;
}

function pickDominantMagnitude(values, positive) {
  const filtered = values.filter((value) =>
    positive ? value > 0 : value < 0,
  );
  if (filtered.length === 0) return null;

  const magnitudes = filtered.map((value) => Math.abs(Math.round(value)));
  return Math.max(...magnitudes);
}

function buildChoiceId(increasedStat, decreasedStat) {
  return `${increasedStat}-${decreasedStat}`;
}

function buildChoiceLabelKey(increasedStat, decreasedStat) {
  const suffix = (stat) =>
    stat === "health" ? "Health" : stat === "magicka" ? "Magicka" : "Stamina";
  return `bittercup${suffix(increasedStat)}Up${suffix(decreasedStat)}Down`;
}

function buildChoiceEffects(increasedStat, decreasedStat, increaseAmount, decreaseAmount) {
  return [
    { type: "attribute", stat: increasedStat, value: increaseAmount },
    { type: "attribute", stat: decreasedStat, value: -decreaseAmount },
  ];
}

/**
 * Build the bittercup character option from scanned plugin artifacts.
 *
 * @param {{
 *   mgefRecords: Array<{ edid: string, buffer?: Buffer, stat?: string }>,
 *   spellCandidates: Array<{ edid: string, buffer: Buffer, lookup: object }>,
 *   alchDescription?: string,
 *   fallbackMagnitudes?: { increase: number, decrease: number },
 * }} input
 */
export function buildBittercupCharacterOption({
  mgefRecords = [],
  spellCandidates = [],
  alchDescription = "",
  fallbackMagnitudes = { increase: 20, decrease: 20 },
}) {
  const mgefByEdid = new Map();

  for (const record of mgefRecords) {
    if (!record?.edid || !isBittercupRecordEdid(record.edid)) continue;
    const stat =
      record.stat ??
      (record.buffer ? parseAttributeValueModMgef(record.buffer)?.stat : null);
    if (!stat) continue;
    mgefByEdid.set(record.edid, { stat });
  }

  const positiveMagnitudes = [];
  const negativeMagnitudes = [];

  for (const candidate of spellCandidates) {
    if (!candidate?.buffer || !isBittercupRecordEdid(candidate.edid)) continue;

    for (const entry of readSignedSpellEffectEntries(candidate.buffer)) {
      if (entry.magnitude == null || !Number.isFinite(entry.magnitude)) continue;
      const stat = resolveMgefStat(entry.formId, candidate.lookup, mgefByEdid);
      if (!stat) continue;

      if (entry.magnitude > 0) positiveMagnitudes.push(entry.magnitude);
      if (entry.magnitude < 0) negativeMagnitudes.push(entry.magnitude);
    }
  }

  const increaseAmount =
    pickDominantMagnitude(positiveMagnitudes, true) ?? fallbackMagnitudes.increase;
  const decreaseAmount =
    pickDominantMagnitude(negativeMagnitudes, false) ?? fallbackMagnitudes.decrease;

  const choices = [{ id: "none", label: "bittercupNone" }];

  for (const increasedStat of ATTRIBUTE_STATS) {
    for (const decreasedStat of ATTRIBUTE_STATS) {
      if (increasedStat === decreasedStat) continue;
      choices.push({
        id: buildChoiceId(increasedStat, decreasedStat),
        label: buildChoiceLabelKey(increasedStat, decreasedStat),
        effects: buildChoiceEffects(
          increasedStat,
          decreasedStat,
          increaseAmount,
          decreaseAmount,
        ),
      });
    }
  }

  return {
    id: "bittercup",
    titleLabel: "bittercup",
    descriptionLabel: "bittercupDescription",
    defaultChoice: "none",
    choices,
    importedDescription: alchDescription || undefined,
    importedMagnitudes: { increase: increaseAmount, decrease: decreaseAmount },
  };
}

/**
 * Strip import-only metadata before writing planner JSON.
 */
export function serializeBittercupCharacterOption(option) {
  const { importedDescription: _desc, importedMagnitudes: _mags, ...plannerOption } = option;
  return plannerOption;
}
