import { spawnSync } from "node:child_process";
import { readdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const importRoot = dirname(fileURLToPath(import.meta.url));
const testDirs = [join(importRoot, "lib"), join(importRoot, "lib", "effects"), join(importRoot, "importers")];

const testFiles = [];
for (const dir of testDirs) {
  const names = await readdir(dir);
  testFiles.push(
    ...names
      .filter((name) => name.endsWith(".test.mjs"))
      .sort()
      .map((name) => join(dir, name)),
  );
}

if (testFiles.length === 0) {
  console.error(`No import tests found in ${testDirs.join(", ")}`);
  process.exit(1);
}

const result = spawnSync(process.execPath, ["--test", ...testFiles], { stdio: "inherit" });
process.exit(result.status ?? 1);
