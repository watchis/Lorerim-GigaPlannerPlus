import assert from "node:assert/strict";
import {
  meaningfulSpellMagnitudes,
  primarySpellMagnitude,
  readSpellEfitMagnitudes,
  readSpellFaithEffectEntries,
  readSpellMagnitudeForMgefFormId,
  readSpellMagnitudesForFormIds,
} from "./spell-magnitude.mjs";
import { buildSubrecord } from "./test-fixtures.mjs";

function buildSpellEfitBuffer(magnitude, dataSize = 12) {
  const data = Buffer.alloc(dataSize);
  data.writeFloatLE(magnitude, 0);
  return buildSubrecord("EFIT", data);
}

function buildSpellEfidBuffer(formId) {
  const data = Buffer.alloc(4);
  data.writeUInt32LE(formId, 0);
  return buildSubrecord("EFID", data);
}

assert.deepEqual(readSpellEfitMagnitudes(buildSpellEfitBuffer(15)), [15]);
assert.deepEqual(readSpellEfitMagnitudes(buildSpellEfitBuffer(0)), [0]);
assert.deepEqual(meaningfulSpellMagnitudes(buildSpellEfitBuffer(0)), []);
assert.equal(primarySpellMagnitude(buildSpellEfitBuffer(12.5)), 12.5);
assert.equal(primarySpellMagnitude(buildSpellEfitBuffer(0)), null);

const multiRaw = Buffer.concat([
  Buffer.from("SPEL\x00\x00", "ascii"),
  buildSpellEfitBuffer(0),
  buildSpellEfitBuffer(25),
  buildSpellEfitBuffer(40),
]);
assert.deepEqual(readSpellEfitMagnitudes(multiRaw), [0, 25, 40]);
assert.deepEqual(meaningfulSpellMagnitudes(multiRaw), [25, 40]);

const targetFormId = 0x00aa0001;
const pairedSpell = Buffer.concat([
  buildSpellEfidBuffer(0x00aa0002),
  buildSpellEfitBuffer(2),
  buildSpellEfidBuffer(targetFormId),
  buildSpellEfitBuffer(25),
  buildSpellEfidBuffer(targetFormId),
  buildSpellEfitBuffer(30),
]);
assert.deepEqual(readSpellMagnitudesForFormIds(pairedSpell, new Set([targetFormId])), [25, 30]);
assert.equal(readSpellMagnitudeForMgefFormId(pairedSpell, targetFormId), 25);

const faithEntries = readSpellFaithEffectEntries(pairedSpell);
assert.deepEqual(
  faithEntries.map((entry) => [entry.formId, entry.magnitude]),
  [
    [0x00aa0002, 2],
    [targetFormId, 25],
    [targetFormId, 30],
  ],
);

assert.deepEqual(readSpellEfitMagnitudes(Buffer.from("no efit here", "ascii")), []);
assert.deepEqual(readSpellMagnitudesForFormIds(pairedSpell, new Set()), []);
assert.equal(readSpellMagnitudeForMgefFormId(pairedSpell, null), null);

console.log("spell-magnitude.test.mjs: ok");
