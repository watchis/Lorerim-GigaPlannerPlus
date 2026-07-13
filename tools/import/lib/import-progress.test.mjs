import assert from "node:assert/strict";
import { Writable } from "node:stream";
import {
  createImportReporter,
  formatCount,
  formatDuration,
  formatImportSummary,
  printImportSummary,
} from "./import-progress.mjs";

assert.equal(formatDuration(450), "450ms");
assert.equal(formatDuration(5000), "5s");
assert.equal(formatDuration(65000), "1m 5s");
assert.equal(formatDuration(120000), "2m");
assert.equal(formatCount(3500), "3,500");

{
  const lines = formatImportSummary(
    {
      installDir: "D:/Lorerim",
      profile: "Default",
      pluginsInLoadOrder: 3500,
      pluginsSkippedNonMechanics: 2300,
      pluginsScanned: 1200,
      perkRecords: 3321,
      perkTrees: 18,
      importedPerks: 2050,
      addedPerks: 12,
      removedPerks: 0,
      avifSkills: 18,
      avifPerks: 2100,
      traits: 85,
      races: 10,
      birthsigns: 13,
      deities: 200,
      modpackVersion: "5.0.3.2",
    },
    { elapsed: "1m 45s" },
  );

  assert.match(lines[0], /Import complete in 1m 45s/);
  assert.ok(lines.some((line) => line === "Perk records: 3,321"));
  assert.ok(lines.some((line) => line === "Modpack version: 5.0.3.2"));
  assert.ok(!lines.some((line) => line.includes("pluginsFromXEditOutput")));
}

{
  const lines = formatImportSummary(
    {
      installDir: "D:/Lorerim",
      profile: "Default",
      pluginsInLoadOrder: 3500,
      pluginsSkippedNonMechanics: 2000,
      pluginsScanned: 1300,
      perkRecords: 3321,
      weapons: 13599,
      armor: 10165,
      enchantments: 2446,
      staticItems: 18222,
    },
    { elapsed: "2m" },
  );

  assert.ok(lines.some((line) => line === "Weapons: 13,599"));
  assert.ok(lines.some((line) => line === "Static gear: 18,222"));
  assert.ok(!lines.some((line) => line.startsWith("Perk trees:")));
}

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

  scan.tick("MeshOnly.esp");
  scan.tick("Ordinator.esp");
  scan.tick("Requiem.esp");
  scan.finish("2 to scan, 1 skipped");

  const text = getOutput();
  assert.match(text, /Classifying plugins/);
  assert.match(text, /Ordinator\.esp/);
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

  scan.tick("1,000 records read");
  scan.tick("2,000 records read");
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
  const { stream, getOutput } = createCaptureStream({ isTTY: true });
  const progress = createImportReporter({ stream, interactive: true });
  const transform = progress.track("Transform steps", 2);

  transform.tick("Perk trees");
  transform.tick("Traits");
  transform.finish("2 data sets");

  assert.match(getOutput(), /Transform steps/);
  assert.match(getOutput(), /Perk trees/);
}

{
  const { stream, getOutput } = createCaptureStream({ isTTY: true });
  const progress = createImportReporter({ stream, interactive: true });

  printImportSummary(
    progress,
    {
      installDir: "D:/Lorerim",
      profile: "Default",
      pluginsInLoadOrder: 100,
      pluginsSkippedNonMechanics: 0,
      pluginsScanned: 100,
      perkRecords: 500,
      perkTrees: 5,
      importedPerks: 400,
      addedPerks: 0,
      removedPerks: 0,
      avifSkills: 5,
      avifPerks: 350,
      traits: 10,
      races: 10,
      birthsigns: 5,
      deities: 20,
    },
    { elapsed: "30s" },
  );

  assert.match(getOutput(), /Perk records: 500/);
  assert.doesNotMatch(getOutput(), /\{/);
}

{
  const { stream, getOutput } = createCaptureStream({ isTTY: true, columns: 120 });
  const progress = createImportReporter({ stream, interactive: true });
  const scan = progress.track("Classifying plugins", 2);

  scan.tick("ccbgssse050-ba_daedric.esl");
  scan.tick("Water patch.esp");

  const text = getOutput();
  assert.match(text, /\x1b\[2K/);
  assert.match(text, /Water patch\.esp/);
  assert.doesNotMatch(text, /eslsl/);
}

{
  const { stream, getOutput } = createCaptureStream({ isTTY: true, columns: 72 });
  const progress = createImportReporter({ stream, interactive: true });
  const scan = progress.track("Classifying plugins", 1);

  scan.tick("ccbgssse067-daedrapaladinarmor.esl");

  const lastWrite = getOutput().split("\x1b[2K").pop();
  assert.ok(lastWrite.length <= 72);
  assert.match(lastWrite, /Classifying plugins \[/);
  assert.match(lastWrite, /1\/1 \(100%\)/);
}

{
  const { stream, getOutput } = createCaptureStream({ isTTY: true });
  const progress = createImportReporter({ stream, interactive: true });
  const transform = progress.track("Transform steps", 2);

  transform.tick("Perk trees");
  transform.tick("Traits");
  transform.finish("2 data sets");

  assert.match(getOutput(), /Transform steps/);
  assert.match(getOutput(), /Traits/);
}

console.log("import-progress.test.mjs: ok");
