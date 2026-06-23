/**
 * Skyrim FormIDs are plugin-local on disk: the high byte is an index into the
 * plugin's master list (TES4 MAST entries), followed by "self" for new records.
 * Two unrelated forms can share the same low 24 bits, so a perk reference can
 * only be matched to a record by resolving it to a global identity:
 *   `${definingPluginFilename}|${baseId}`
 */

const RECORD_HEADER_SIZE = 24;

/** Ordered master filenames (lowercase) from a TES4 header record buffer. */
export function parseMasters(headerBuffer) {
  const masters = [];
  let index = RECORD_HEADER_SIZE;

  while (index + 6 <= headerBuffer.length) {
    const type = headerBuffer.toString("ascii", index, index + 4);
    const size = headerBuffer.readUInt16LE(index + 4);
    const dataStart = index + 6;
    const dataEnd = dataStart + size;
    if (dataEnd > headerBuffer.length) break;

    if (type === "MAST") {
      const raw = headerBuffer.subarray(dataStart, dataEnd);
      const nullIndex = raw.indexOf(0);
      const name = raw.toString("latin1", 0, nullIndex === -1 ? raw.length : nullIndex);
      masters.push(name.toLowerCase());
    }

    index = dataEnd;
  }

  return masters;
}

/** Resolve a plugin-local FormID to a global `definingPlugin|baseId` identity. */
export function resolveFormIdentity(ownerPluginLower, masters, rawFormId) {
  const formId = rawFormId >>> 0;
  const highByte = (formId >>> 24) & 0xff;
  const baseId = formId & 0x00ffffff;
  const definingPlugin = highByte < masters.length ? masters[highByte] : ownerPluginLower;
  return `${definingPlugin}|${baseId.toString(16)}`;
}
