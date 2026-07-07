import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  formatDryRunDiff,
  formatUnifiedDiff,
  serializePlannerJson,
} from "./import-dry-run-diff.mjs";

{
  const diff = formatUnifiedDiff(
    "data/game/traits.json",
    "data/game/traits.json",
    '{\n  "traits": [\n    {\n      "name": "Old"\n    }\n  ]\n}\n',
    '{\n  "traits": [\n    {\n      "name": "New"\n    }\n  ]\n}\n',
  );

  assert.match(diff, /^diff --git a\/data\/game\/traits\.json b\/data\/game\/traits\.json/);
  assert.match(diff, /^--- a\/data\/game\/traits\.json/m);
  assert.match(diff, /^\+\+\+ b\/data\/game\/traits\.json/m);
  assert.match(diff, /^@@ -\d+,\d+ \+\d+,\d+ @@/m);
  assert.ok(diff.includes('-      "name": "Old"'));
  assert.ok(diff.includes('+      "name": "New"'));
}

{
  const diff = formatUnifiedDiff(
    "data/game/manifest.json",
    "data/game/manifest.json",
    null,
    '{\n  "version": "1.0.0"\n}\n',
  );

  assert.match(diff, /^--- \/dev\/null/m);
  assert.match(diff, /^\+\+\+ b\/data\/game\/manifest\.json/m);
  assert.match(diff, /\+  "version": "1.0.0"/);
}

{
  const diff = formatUnifiedDiff(
    "data/game/perks/old.json",
    "data/game/perks/old.json",
    '{\n  "skillId": "old"\n}\n',
    null,
  );

  assert.match(diff, /^--- a\/data\/game\/perks\/old\.json/m);
  assert.match(diff, /^\+\+\+ \/dev\/null/m);
  assert.match(diff, /^-  "skillId": "old"/m);
}

assert.equal(
  formatUnifiedDiff("data/game/a.json", "data/game/a.json", '{"a":1}\n', '{"a":1}\n'),
  null,
);

{
  const repoRoot = mkdtempSync(join(tmpdir(), "giga-dry-run-diff-"));
  const dataDir = join(repoRoot, "data", "game");
  const perksDir = join(dataDir, "perks");
  mkdirSync(perksDir, { recursive: true });
  writeFileSync(join(dataDir, "traits.json"), serializePlannerJson({ traits: [{ name: "Old" }] }));
  writeFileSync(join(perksDir, "removed.json"), serializePlannerJson({ skillId: "removed" }));

  const diff = formatDryRunDiff({
    filesToWrite: [["traits.json", { traits: [{ name: "New" }] }]],
    staleFiles: ["removed.json"],
    dataDir,
    perksDir,
    repoRoot,
  });

  assert.match(diff, /traits\.json/);
  assert.ok(diff.includes('-      "name": "Old"'));
  assert.ok(diff.includes('+      "name": "New"'));
  assert.match(diff, /perks\/removed\.json/);
  assert.match(diff, /^-  "skillId": "removed"/m);
}

console.log("import-dry-run-diff.test.mjs: ok");
