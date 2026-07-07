/** Shared binary builders for import lib unit tests. */

export function buildSubrecord(type, data) {
  const payload = Buffer.isBuffer(data) ? data : Buffer.from(data);
  const header = Buffer.alloc(6);
  header.write(type, 0, 4, "ascii");
  header.writeUInt16LE(payload.length, 4);
  return Buffer.concat([header, payload]);
}

export function buildEdidSubrecord(edid) {
  return buildSubrecord("EDID", `${edid}\0`);
}

export function buildCtdaSubrecord(hex) {
  return buildSubrecord("CTDA", Buffer.from(hex, "hex"));
}

export function buildPerkBuffer(edid, ctdaHexes = [], extraSubrecords = []) {
  const parts = [buildEdidSubrecord(edid)];

  for (const hex of ctdaHexes) {
    parts.push(buildCtdaSubrecord(hex));
  }

  for (const sub of extraSubrecords) {
    parts.push(sub);
  }

  parts.push(buildSubrecord("DATA", Buffer.from([0, 0, 1, 1, 0])));
  return Buffer.concat(parts);
}

export function buildTes4MastersBuffer(masters) {
  const parts = [Buffer.alloc(24)];
  for (const master of masters) {
    parts.push(buildSubrecord("MAST", `${master}\0`));
  }
  return Buffer.concat(parts);
}

export function buildAvifSectionsBuffer(sections) {
  const parts = [buildEdidSubrecord("AVDestruction"), buildSubrecord("FULL", "Destruction\0")];

  for (const section of sections) {
    parts.push(buildSubrecord("PNAM", u32Buffer(section.formId ?? 0x00123456)));
    if (section.x != null) parts.push(buildSubrecord("XNAM", u32Buffer(section.x)));
    if (section.y != null) parts.push(buildSubrecord("YNAM", u32Buffer(section.y)));
    if (section.inam != null) parts.push(buildSubrecord("INAM", u32Buffer(section.inam)));
    for (const cnam of section.cnam ?? []) {
      parts.push(buildSubrecord("CNAM", u32Buffer(cnam)));
    }
  }

  return Buffer.concat(parts);
}

export function u32Buffer(value) {
  const buffer = Buffer.alloc(4);
  buffer.writeUInt32LE(value >>> 0, 0);
  return buffer;
}

export function buildRaceDataBuffer({
  skillPairs = [],
  health = 100,
  magicka = 100,
  stamina = 100,
  carryWeight = 300,
  healthRegen = 0,
  magickaRegen = 0,
  staminaRegen = 0,
  unarmedDamage = 10,
} = {}) {
  const bytes = Buffer.alloc(120);

  for (const [index, pair] of skillPairs.entries()) {
    const offset = 2 + index * 2;
    if (offset + 1 >= 14) break;
    bytes[offset] = pair.actorValue;
    bytes[offset + 1] = pair.level;
  }

  bytes.writeFloatLE(health, 36);
  bytes.writeFloatLE(magicka, 40);
  bytes.writeFloatLE(stamina, 44);
  bytes.writeFloatLE(carryWeight, 48);
  bytes.writeFloatLE(healthRegen, 84);
  bytes.writeFloatLE(magickaRegen, 88);
  bytes.writeFloatLE(staminaRegen, 92);
  bytes.writeFloatLE(unarmedDamage, 96);

  return bytes;
}
