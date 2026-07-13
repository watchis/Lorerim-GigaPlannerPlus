/**
 * Extract keyword FormIDs and EITM enchant FormID from gear records.
 */

function asBuffer(value) {
  if (!value) return null;
  if (Buffer.isBuffer(value)) return value;
  if (Array.isArray(value)) return Buffer.from(value);
  return null;
}

export function readKeywordFormIds(kwdaValue) {
  if (Array.isArray(kwdaValue?.keywords)) {
    return kwdaValue.keywords.filter((id) => typeof id === "number");
  }

  const buf = asBuffer(kwdaValue);
  if (!buf || buf.length < 4) return [];

  const ids = [];
  for (let offset = 0; offset + 4 <= buf.length; offset += 4) {
    ids.push(buf.readUInt32LE(offset));
  }
  return ids;
}

export function readEnchantFormId(eitmValue) {
  if (typeof eitmValue === "number") return eitmValue === 0 ? null : eitmValue;
  if (eitmValue?.formId != null) return eitmValue.formId === 0 ? null : eitmValue.formId;

  const buf = asBuffer(eitmValue);
  if (!buf || buf.length < 4) return null;
  const formId = buf.readUInt32LE(0);
  return formId === 0 ? null : formId;
}

export function readSubrecordRaw(record, type) {
  const sub = record.subRecords?.find((entry) => entry.type === type);
  return sub?.value ?? null;
}

/** Scan uncompressed record buffer for a typed subrecord payload. */
export function readRawSubrecordPayload(recordBuffer, type) {
  if (!Buffer.isBuffer(recordBuffer) || recordBuffer.length < 30) return null;

  let index = 24;
  while (index + 6 <= recordBuffer.length) {
    const tag = recordBuffer.toString("ascii", index, index + 4);
    const size = recordBuffer.readUInt16LE(index + 4);
    const dataStart = index + 6;
    const dataEnd = dataStart + size;
    if (dataEnd > recordBuffer.length) break;
    if (tag === type) return recordBuffer.subarray(dataStart, dataEnd);
    index = dataEnd;
  }

  return null;
}
