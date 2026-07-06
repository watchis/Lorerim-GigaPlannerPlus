import * as tesData from "@fcrick/tes-data";
import { meaningfulEffectMagnitude } from "./transform-utils.mjs";

function readMagnitudeFromEfitSubrecord(sub) {
  if (sub.value?.magnitude != null && Number.isFinite(sub.value.magnitude)) {
    return sub.value.magnitude;
  }

  const raw =
    Buffer.isBuffer(sub.value) ? sub.value : Array.isArray(sub.value) ? Buffer.from(sub.value) : null;
  if (raw && raw.length >= 4) {
    const magnitude = raw.readFloatLE(0);
    if (Number.isFinite(magnitude)) return magnitude;
  }

  return null;
}

function readSpellEfitMagnitudesRaw(recordBuffer) {
  const magnitudes = [];
  let index = 0;

  while ((index = recordBuffer.indexOf("EFIT", index)) !== -1) {
    const size = recordBuffer.readUInt16LE(index + 4);
    const data = recordBuffer.subarray(index + 6, index + 6 + size);
    if (data.length >= 4) {
      const magnitude = data.readFloatLE(0);
      if (Number.isFinite(magnitude)) magnitudes.push(magnitude);
    }
    index += 4;
  }

  return magnitudes;
}

/**
 * Skyrim SPEL effects use EFID (MGEF FormID) + EFIT (magnitude, area, duration).
 * EFIT magnitude is the float at byte offset 0 of the EFIT payload.
 */
export function readSpellEfitMagnitudes(recordBuffer) {
  try {
    const record = tesData.getRecord(recordBuffer);
    if (!record.compressed) {
      const magnitudes = [];
      for (const sub of record.subRecords ?? []) {
        if (sub.type !== "EFIT") continue;
        const magnitude = readMagnitudeFromEfitSubrecord(sub);
        if (magnitude != null) magnitudes.push(magnitude);
      }

      if (magnitudes.length > 0) return magnitudes;
    }
  } catch {
    // Fall back to raw subrecord scan below.
  }

  return readSpellEfitMagnitudesRaw(recordBuffer);
}

export function meaningfulSpellMagnitudes(recordBuffer) {
  return readSpellEfitMagnitudes(recordBuffer)
    .map((value) => meaningfulEffectMagnitude(value))
    .filter((value) => value != null);
}

export function primarySpellMagnitude(recordBuffer) {
  const magnitudes = meaningfulSpellMagnitudes(recordBuffer);
  if (magnitudes.length === 0) return null;
  return Math.max(...magnitudes);
}

function readFormIdFromEfidSubrecord(sub) {
  if (typeof sub.value === "number") return sub.value;
  if (sub.value?.formId != null) return sub.value.formId;

  const raw =
    Buffer.isBuffer(sub.value) ? sub.value : Array.isArray(sub.value) ? Buffer.from(sub.value) : null;
  return raw?.length >= 4 ? raw.readUInt32LE(0) : null;
}

function readSpellFaithEffectEntriesFromSubrecords(subRecords) {
  const entries = [];
  let pendingFormId = null;

  for (const sub of subRecords ?? []) {
    if (sub.type === "EFID") {
      pendingFormId = readFormIdFromEfidSubrecord(sub);
      continue;
    }

    if (sub.type !== "EFIT" || pendingFormId == null) continue;

    const magnitude = meaningfulEffectMagnitude(readMagnitudeFromEfitSubrecord(sub));
    entries.push({ formId: pendingFormId, magnitude });
    pendingFormId = null;
  }

  return entries;
}

function readSpellFaithEffectEntriesRaw(recordBuffer) {
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
      efitData.length >= 4 ? meaningfulEffectMagnitude(efitData.readFloatLE(0)) : null;

    if (formId != null) entries.push({ formId, magnitude });

    index = efidIdx + 4;
  }

  return entries;
}

/**
 * EFID/EFIT pairs from a SPEL record in effect order.
 */
export function readSpellFaithEffectEntries(recordBuffer) {
  try {
    const record = tesData.getRecord(recordBuffer);
    if (!record.compressed) {
      const fromSubs = readSpellFaithEffectEntriesFromSubrecords(record.subRecords);
      if (fromSubs.some((entry) => entry.magnitude != null)) return fromSubs;
    }
  } catch {
    // Fall back to raw subrecord scan below.
  }

  return readSpellFaithEffectEntriesRaw(recordBuffer);
}

function readMagnitudeForMgefFormIdFromSubrecords(subRecords, mgefFormId) {
  let pendingFormId = null;

  for (const sub of subRecords ?? []) {
    if (sub.type === "EFID") {
      pendingFormId = readFormIdFromEfidSubrecord(sub);
      continue;
    }

    if (sub.type !== "EFIT" || pendingFormId == null) continue;

    if (pendingFormId === mgefFormId) {
      const magnitude = readMagnitudeFromEfitSubrecord(sub);
      const meaningful = meaningfulEffectMagnitude(magnitude);
      if (meaningful != null) return meaningful;
    }

    pendingFormId = null;
  }

  return null;
}

function readMagnitudeForMgefFormIdRaw(recordBuffer, mgefFormId) {
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

    if (formId === mgefFormId && efitData.length >= 4) {
      const meaningful = meaningfulEffectMagnitude(efitData.readFloatLE(0));
      if (meaningful != null) return meaningful;
    }

    index = efidIdx + 4;
  }

  return null;
}

/**
 * Read the EFIT magnitude paired with a specific MGEF FormID inside a SPEL record.
 * Tribunal shrine blessings use CC spells (ccASVSSE001_*Spell) instead of WSN_AltarBlessing_*_Spell.
 */
export function readSpellMagnitudeForMgefFormId(recordBuffer, mgefFormId) {
  if (mgefFormId == null) return null;

  try {
    const record = tesData.getRecord(recordBuffer);
    if (!record.compressed) {
      const fromSubs = readMagnitudeForMgefFormIdFromSubrecords(record.subRecords, mgefFormId);
      if (fromSubs != null) return fromSubs;
    }
  } catch {
    // Fall back to raw subrecord scan below.
  }

  return readMagnitudeForMgefFormIdRaw(recordBuffer, mgefFormId);
}

function readMagnitudesForFormIdsFromSubrecords(subRecords, formIds) {
  const idSet = formIds instanceof Set ? formIds : new Set(formIds);
  const magnitudes = [];
  let pendingFormId = null;

  for (const sub of subRecords ?? []) {
    if (sub.type === "EFID") {
      pendingFormId = readFormIdFromEfidSubrecord(sub);
      continue;
    }

    if (sub.type !== "EFIT" || pendingFormId == null) continue;

    if (idSet.has(pendingFormId)) {
      const meaningful = meaningfulEffectMagnitude(readMagnitudeFromEfitSubrecord(sub));
      if (meaningful != null) magnitudes.push(meaningful);
    }

    pendingFormId = null;
  }

  return magnitudes;
}

function readMagnitudesForFormIdsRaw(recordBuffer, formIds) {
  const idSet = formIds instanceof Set ? formIds : new Set(formIds);
  const magnitudes = [];
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

    if (formId != null && idSet.has(formId) && efitData.length >= 4) {
      const meaningful = meaningfulEffectMagnitude(efitData.readFloatLE(0));
      if (meaningful != null) magnitudes.push(meaningful);
    }

    index = efidIdx + 4;
  }

  return magnitudes;
}

/**
 * Collect EFIT magnitudes for shrine/boon MGEF FormIDs in spell effect order.
 */
export function readSpellMagnitudesForFormIds(recordBuffer, formIds) {
  if (formIds == null || (formIds instanceof Set && formIds.size === 0)) return [];

  try {
    const record = tesData.getRecord(recordBuffer);
    if (!record.compressed) {
      const fromSubs = readMagnitudesForFormIdsFromSubrecords(record.subRecords, formIds);
      if (fromSubs.length > 0) return fromSubs;
    }
  } catch {
    // Fall back to raw subrecord scan below.
  }

  return readMagnitudesForFormIdsRaw(recordBuffer, formIds);
}
