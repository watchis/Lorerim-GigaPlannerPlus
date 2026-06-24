/**
 * Rebuild tools/import/lib/giga-planner-layout.json from curated planner perk trees.
 *
 * Uses `data/game/perks/*.json` as the source of truth for fallback layout
 * coordinates when the importer places perks that have no saved position yet.
 *
 * Usage:
 *   node tools/import/sync-giga-planner-layout.mjs
 */
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { canonicalPerkName } from "./lib/perk-import-filter.mjs";
import { GIGA_LAYOUT_GRID } from "./lib/giga-planner-layout-constants.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const perksDir = join(__dirname, "..", "..", "data", "game", "perks");
const outputPath = join(__dirname, "lib", "giga-planner-layout.json");

const positions = {};

for (const filename of readdirSync(perksDir).filter(
  (entry) => entry.endsWith(".json") && entry !== "index.json",
)) {
  const tree = JSON.parse(readFileSync(join(perksDir, filename), "utf8"));
  if (!tree.skillId || tree.skillId === "destiny" || tree.skillId === "traits") continue;

  const seen = new Set();
  for (const perk of tree.perks ?? []) {
    const canonical = canonicalPerkName(perk.name);
    if (!canonical || perk.position == null) continue;

    const key = `${tree.skillId}:${canonical}`;
    if (seen.has(key)) continue;
    seen.add(key);

    positions[key] = { x: perk.position.x, y: perk.position.y };
  }
}

const document = {
  version: 3,
  source: "data/game/perks (curated planner layout)",
  grid: GIGA_LAYOUT_GRID,
  positions,
};

writeFileSync(outputPath, `${JSON.stringify(document, null, 2)}\n`);

const skillCount = new Set(Object.keys(positions).map((key) => key.split(":")[0])).size;
console.log(
  JSON.stringify(
    {
      output: outputPath,
      skills: skillCount,
      positions: Object.keys(positions).length,
    },
    null,
    2,
  ),
);
