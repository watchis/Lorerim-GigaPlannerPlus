/**
 * Spread skill perk trees horizontally so they average ~20 columns wide.
 *
 * The planner renders each tree from its content bounds (actual perk x/y),
 * normalizing x and y independently, so widening a tree's x-span increases its
 * aspect ratio and spreads nodes apart horizontally in the fitted view. We scale
 * every skill tree's x positions by a single factor chosen so the mean content
 * width lands on the target, preserving each tree's relative shape and node
 * density. Perks sharing a cell (rank stacks) keep sharing it, and distinct
 * columns stay distinct because the scale factor is >= 1.
 *
 * Destiny is excluded: it is a wide, special tree, not a skill tree.
 *
 * Usage:
 *   node tools/import/spread-perk-trees.mjs            # apply
 *   node tools/import/spread-perk-trees.mjs --dry-run  # report only
 */
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const TARGET_AVG_WIDTH = 25;
const EXCLUDED_FILES = new Set(["index.json", "destiny.json"]);

const __dirname = dirname(fileURLToPath(import.meta.url));
const perksDir = join(__dirname, "..", "..", "data", "game", "perks");
const dryRun = process.argv.includes("--dry-run");

function contentWidth(perks) {
  let minX = Infinity;
  let maxX = -Infinity;
  for (const perk of perks) {
    minX = Math.min(minX, perk.position.x);
    maxX = Math.max(maxX, perk.position.x);
  }
  return { minX, width: maxX - minX + 1 };
}

const files = readdirSync(perksDir).filter(
  (entry) => entry.endsWith(".json") && !EXCLUDED_FILES.has(entry),
);

const trees = files.map((filename) => {
  const path = join(perksDir, filename);
  const tree = JSON.parse(readFileSync(path, "utf8"));
  return { filename, path, tree, ...contentWidth(tree.perks) };
});

const widthsBefore = trees.filter((t) => t.tree.perks.length > 0).map((t) => t.width);
const avgBefore = widthsBefore.reduce((sum, w) => sum + w, 0) / widthsBefore.length;
const scale = TARGET_AVG_WIDTH / avgBefore;

const results = [];

for (const entry of trees) {
  const { tree, minX } = entry;
  if (tree.perks.length === 0) continue;

  let maxNewX = 0;
  for (const perk of tree.perks) {
    perk.position.x = Math.round((perk.position.x - minX) * scale);
    maxNewX = Math.max(maxNewX, perk.position.x);
  }
  tree.grid.width = maxNewX + 1;

  if (!dryRun) {
    writeFileSync(entry.path, `${JSON.stringify(tree, null, 2)}\n`);
  }

  results.push({ file: entry.filename, before: entry.width, after: tree.grid.width });
}

const widthsAfter = results.map((r) => r.after);
const avgAfter = widthsAfter.reduce((sum, w) => sum + w, 0) / widthsAfter.length;

console.log(
  JSON.stringify(
    {
      mode: dryRun ? "dry-run" : "apply",
      target: TARGET_AVG_WIDTH,
      scale: Number(scale.toFixed(4)),
      averageWidthBefore: Number(avgBefore.toFixed(2)),
      averageWidthAfter: Number(avgAfter.toFixed(2)),
      trees: results.sort((a, b) => a.file.localeCompare(b.file)),
    },
    null,
    2,
  ),
);
