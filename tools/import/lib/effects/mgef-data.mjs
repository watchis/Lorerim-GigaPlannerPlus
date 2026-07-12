import * as tesData from "@fcrick/tes-data";

/**
 * Skyrim SSE MGEF DATA subrecord (152 bytes) — see UESP MGEF format.
 */
export const MGEF_EFFECT_TYPE = {
  VALUE_MOD: 0,
  SCRIPT: 1,
  DISPEL: 2,
  DUAL_VALUE_MOD: 5,
  PEAK_VALUE_MOD: 34,
};

const DATA_MIN_SIZE = 0x5c;

/**
 * @param {Buffer} raw
 */
export function parseMgefDataBuffer(raw) {
  if (!raw || raw.length < DATA_MIN_SIZE) return null;

  return {
    flags: raw.readUInt32LE(0x00),
    effectType: raw.readUInt32LE(0x40),
    primaryAV: raw.readInt32LE(0x44),
    secondAV: raw.readInt32LE(0x58),
  };
}

export function readMgefEffectDataFromRecord(record) {
  const dataSub = record.subRecords?.find((sub) => sub.type === "DATA");
  if (!dataSub?.value) return null;
  const raw = Buffer.isBuffer(dataSub.value) ? dataSub.value : Buffer.from(dataSub.value);
  return parseMgefDataBuffer(raw);
}

export function readMgefEffectData(recordBuffer) {
  try {
    const record = tesData.getRecord(recordBuffer);
    if (record.compressed) return null;
    return readMgefEffectDataFromRecord(record);
  } catch {
    return null;
  }
}
