import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";
import { pruneOrphanPerks } from "./lib/prune-orphan-perks.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const perksDir = join(__dirname, "..", "..", "data", "game", "perks");

let removed = 0;
let totalBefore = 0;
let totalAfter = 0;

for (const filename of readdirSync(perksDir)) {
  if (!filename.endsWith(".json") || filename === "index.json") continue;

  const path = join(perksDir, filename);
  const tree = JSON.parse(readFileSync(path, "utf8"));
  const before = tree.perks.length;
  tree.perks = pruneOrphanPerks(tree.perks);
  const after = tree.perks.length;

  totalBefore += before;
  totalAfter += after;
  removed += before - after;

  if (before !== after) {
    writeFileSync(path, `${JSON.stringify(tree, null, 2)}\n`);
    console.log(`${filename}: ${before} -> ${after} (-${before - after})`);
  }
}

console.log(
  JSON.stringify({ totalBefore, totalAfter, removed }, null, 2),
);
