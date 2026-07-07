import assert from "node:assert/strict";
import { parseMasters, resolveFormIdentity } from "./formid.mjs";
import { buildTes4MastersBuffer } from "./test-fixtures.mjs";

const header = buildTes4MastersBuffer([
  "Skyrim.esm",
  "Update.esm",
  "Dawnguard.esm",
]);

assert.deepEqual(parseMasters(header), ["skyrim.esm", "update.esm", "dawnguard.esm"]);
assert.deepEqual(parseMasters(Buffer.alloc(20)), []);

assert.equal(
  resolveFormIdentity("req.esp", ["skyrim.esm"], 0x00005c68),
  "skyrim.esm|5c68",
);
assert.equal(resolveFormIdentity("req.esp", [], 0x01005c68), "req.esp|5c68");
assert.equal(
  resolveFormIdentity(
    "wintersun - reqtificated.esp",
    (() => {
      const masters = Array.from({ length: 0x1c }, () => "");
      masters[0x1b] = "wintersun - faiths of skyrim.esp";
      return masters;
    })(),
    0x1b24c5e7,
  ),
  "wintersun - faiths of skyrim.esp|24c5e7",
);
assert.equal(
  resolveFormIdentity("plugin.esp", ["skyrim.esm"], 0xff00abcd),
  "plugin.esp|abcd",
);

console.log("formid.test.mjs: ok");
