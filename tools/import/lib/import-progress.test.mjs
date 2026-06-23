import assert from "node:assert/strict";
import { formatCount, formatDuration } from "./import-progress.mjs";

assert.equal(formatDuration(450), "450ms");
assert.equal(formatDuration(5000), "5s");
assert.equal(formatDuration(65000), "1m 5s");
assert.equal(formatDuration(120000), "2m");
assert.equal(formatCount(3500), "3,500");

console.log("import-progress.test.mjs: ok");
