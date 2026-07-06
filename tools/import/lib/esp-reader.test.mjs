import assert from "node:assert/strict";
import { readSpellEfitMagnitudes } from "./esp-reader.mjs";

function buildSpellEfitBuffer(magnitude, dataSize = 12) {
  const data = Buffer.alloc(dataSize);
  data.writeFloatLE(magnitude, 0);
  if (dataSize >= 8) data.writeUInt32LE(0, 4);
  if (dataSize >= 12) data.writeUInt32LE(0, 8);

  const header = Buffer.alloc(6);
  header.write("EFIT", 0, 4, "ascii");
  header.writeUInt16LE(dataSize, 4);
  return Buffer.concat([header, data]);
}

assert.deepEqual(readSpellEfitMagnitudes(buildSpellEfitBuffer(15)), [15]);
assert.deepEqual(readSpellEfitMagnitudes(buildSpellEfitBuffer(25)), [25]);

assert.deepEqual(
  readSpellEfitMagnitudes(
    Buffer.concat([
      Buffer.from("SPEL\x00\x00", "ascii"),
      buildSpellEfitBuffer(0),
      buildSpellEfitBuffer(25),
    ]),
  ),
  [0, 25],
);

assert.deepEqual(readSpellEfitMagnitudes(Buffer.from("no efit here", "ascii")), []);

console.log("esp-reader tests passed");
