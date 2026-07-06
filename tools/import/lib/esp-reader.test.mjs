import assert from "node:assert/strict";
import { readSpellEfitMagnitudes } from "./esp-reader.mjs";

function buildSpellEfitBuffer(formId, magnitude, dataSize = 16) {
  const data = Buffer.alloc(dataSize);
  data.writeUInt32LE(formId, 0);
  data.writeFloatLE(magnitude, 4);
  if (dataSize >= 12) data.writeUInt32LE(0, 8);
  if (dataSize >= 16) data.writeUInt32LE(0, 12);

  const header = Buffer.alloc(6);
  header.write("EFIT", 0, 4, "ascii");
  header.writeUInt16LE(dataSize, 4);
  return Buffer.concat([header, data]);
}

assert.deepEqual(readSpellEfitMagnitudes(buildSpellEfitBuffer(0x01020304, 15)), [15]);

assert.deepEqual(
  readSpellEfitMagnitudes(
    Buffer.concat([
      Buffer.from("SPEL\x00\x00", "ascii"),
      buildSpellEfitBuffer(0x0a0b0c0d, 20),
      buildSpellEfitBuffer(0x01020304, 15),
    ]),
  ),
  [20, 15],
);

assert.deepEqual(readSpellEfitMagnitudes(Buffer.from("no efit here", "ascii")), []);

console.log("esp-reader tests passed");
