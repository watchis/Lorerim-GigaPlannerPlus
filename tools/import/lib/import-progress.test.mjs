import assert from "node:assert/strict";
import { Writable } from "node:stream";
import {
  createImportReporter,
  formatCount,
  formatDuration,
} from "./import-progress.mjs";

assert.equal(formatDuration(450), "450ms");
assert.equal(formatDuration(5000), "5s");
assert.equal(formatDuration(65000), "1m 5s");
assert.equal(formatDuration(120000), "2m");
assert.equal(formatCount(3500), "3,500");

function createCaptureStream({ isTTY = false, columns = 100 } = {}) {
  let output = "";
  const stream = new Writable({
    write(chunk, _encoding, callback) {
      output += chunk.toString();
      callback();
    },
  });
  stream.isTTY = isTTY;
  stream.columns = columns;
  return { stream, getOutput: () => output, clear: () => { output = ""; } };
}

{
  const { stream, getOutput } = createCaptureStream({ isTTY: true });
  const progress = createImportReporter({ stream, interactive: true });
  const scan = progress.track("Classifying plugins", 3);

  scan.tick("cached skip");
  scan.tick("PERK, AVIF");
  scan.tick("mechanics");
  scan.finish("2 to scan, 1 skipped");

  const text = getOutput();
  assert.match(text, /Classifying plugins/);
  assert.doesNotMatch(text, /\.esp/);
  assert.match(text, /✓ Classifying plugins: 3\/3 — 2 to scan, 1 skipped/);
}

{
  const { stream, getOutput } = createCaptureStream({ isTTY: false });
  const progress = createImportReporter({
    stream,
    interactive: false,
    updateIntervalMs: 0,
  });
  const scan = progress.track("Scanning records", 2);

  scan.tick("1,000 records");
  scan.tick("2,000 records");
  scan.finish("done");

  const lines = getOutput().trim().split("\n");
  assert.equal(lines.length, 3);
  assert.doesNotMatch(getOutput(), /SomeMod\.esp/);
}

{
  const { stream, getOutput } = createCaptureStream({ isTTY: true });
  const progress = createImportReporter({ stream, interactive: true });

  progress.activity("Building perk trees…");
  progress.step("Perk trees — 18 trees");

  const text = getOutput();
  assert.match(text, /Building perk trees/);
  assert.match(text, /Perk trees — 18 trees/);
}

{
  const { stream, getOutput } = createCaptureStream({ isTTY: false });
  const progress = createImportReporter({
    stream,
    interactive: false,
    updateIntervalMs: 0,
  });
  const legacy = progress.pluginScan("Legacy label", 1);
  legacy.tick("detail");
  legacy.finish("legacy ok");

  assert.match(getOutput(), /Legacy label/);
  assert.match(getOutput(), /legacy ok/);
}

console.log("import-progress.test.mjs: ok");
