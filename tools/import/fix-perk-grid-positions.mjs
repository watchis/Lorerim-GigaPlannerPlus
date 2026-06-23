import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { repositionOutOfGridPerks } from "./lib/append-missing-perks.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const perksDir = join(__dirname, "..", "..", "data", "game", "perks");

const results = [];

for (const filename of readdirSync(perksDir).filter(
  (entry) => entry.endsWith(".json") && entry !== "index.json",
)) {
  const path = join(perksDir, filename);
  const tree = JSON.parse(readFileSync(path, "utf8"));
  const { moved } = repositionOutOfGridPerks(tree);

  if (moved.length > 0) {
    writeFileSync(path, `${JSON.stringify(tree, null, 2)}\n`);
    results.push({ file: filename, moved });
  }
}

console.log(
  JSON.stringify(
    {
      filesUpdated: results.length,
      perksMoved: results.reduce((sum, entry) => sum + entry.moved.length, 0),
      details: results,
    },
    null,
    2,
  ),
);
