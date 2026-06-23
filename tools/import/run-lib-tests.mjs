import { spawnSync } from "node:child_process";
import { readdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const libDir = join(dirname(fileURLToPath(import.meta.url)), "lib");
const names = await readdir(libDir);
const testFiles = names
  .filter((name) => name.endsWith(".test.mjs"))
  .sort()
  .map((name) => join(libDir, name));

if (testFiles.length === 0) {
  console.error(`No import tests found in ${libDir}`);
  process.exit(1);
}

const result = spawnSync(process.execPath, ["--test", ...testFiles], { stdio: "inherit" });
process.exit(result.status ?? 1);
