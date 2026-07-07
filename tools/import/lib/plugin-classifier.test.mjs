import assert from "node:assert/strict";
import { MECHANICS_RECORD_TYPES } from "./plugin-classifier.mjs";

assert.ok(MECHANICS_RECORD_TYPES.has("PERK"));
assert.ok(MECHANICS_RECORD_TYPES.has("AVIF"));
assert.ok(MECHANICS_RECORD_TYPES.has("MGEF"));
assert.equal(MECHANICS_RECORD_TYPES.has("TXST"), false);
assert.equal(MECHANICS_RECORD_TYPES.has("MESH"), false);

console.log("plugin-classifier.test.mjs: ok");
