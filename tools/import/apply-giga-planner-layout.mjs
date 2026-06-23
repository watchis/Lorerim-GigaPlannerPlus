/**
 * Apply GigaPlanner reference coordinates to all perk tree JSON files.
 *
 * Usage:
 *   node tools/import/apply-giga-planner-layout.mjs
 */
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { applyGigaPlannerTreeLayout } from "./lib/giga-planner-layout.mjs";
import { repositionOutOfGridPerks, resizeGridToFit } from "./lib/append-missing-perks.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const perksDir = join(__dirname, "..", "..", "data", "game", "perks");

const results = [];

for (const filename of readdirSync(perksDir).filter(
  (entry) => entry.endsWith(".json") && entry !== "index.json",
)) {
  const path = join(perksDir, filename);
  const tree = JSON.parse(readFileSync(path, "utf8"));
  const before = tree.perks.map((perk) => ({ ...perk.position }));

  const stats = applyGigaPlannerTreeLayout(tree);
  repositionOutOfGridPerks(tree);
  tree.grid = resizeGridToFit(tree.perks, tree.grid);

  const changed = tree.perks.filter(
    (perk, index) =>
      perk.position.x !== before[index]?.x || perk.position.y !== before[index]?.y,
  ).length;

  writeFileSync(path, `${JSON.stringify(tree, null, 2)}\n`);
  results.push({
    file: filename,
    skillId: tree.skillId,
    ...stats,
    changed,
    grid: tree.grid,
    perks: tree.perks.length,
  });
}

console.log(
  JSON.stringify(
    {
      filesUpdated: results.length,
      perksRepositioned: results.reduce((sum, entry) => sum + entry.changed, 0),
      trees: results.sort((left, right) => left.file.localeCompare(right.file)),
    },
    null,
    2,
  ),
);
