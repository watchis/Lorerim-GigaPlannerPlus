/**
 * Rebuild tools/import/lib/giga-planner-layout.json from a live GigaPlanner export.
 *
 * Export source: browser CDP extract saved as giga-planner-live-perks.json
 * (see README in tools/import/).
 *
 * Usage:
 *   node tools/import/sync-giga-planner-layout.mjs
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { canonicalPerkName } from "./lib/perk-import-filter.mjs";
import { SKILL_IDS } from "./lib/skill-constants.mjs";
import { gigaPercentToGrid, GIGA_LAYOUT_GRID } from "./lib/giga-planner-layout-constants.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const livePath = join(__dirname, "lib", "giga-planner-live-perks.json");
const outputPath = join(__dirname, "lib", "giga-planner-layout.json");

/** LoreRim perks absent from multidyls GigaPlanner v4.0.31 — placed by prerequisite branch. */
const LORE_RIM_ONLY_POSITIONS = {
  "alteration:geomancer": { x: 16, y: 40 },
  "alteration:philosopher's stone": { x: 7, y: 42 },
  "block:surprise attack": { x: 6, y: 13 },
  "block:strike the jugular": { x: 6, y: 8 },
  "block:master of all": { x: 6, y: 4 },
  "destruction:rune mastery": { x: 5, y: 24 },
  "destruction:blood glutton": { x: 1, y: 15 },
  "destruction:eldritch artist": { x: 3, y: 12 },
  "destruction:disciple of the mystics": { x: 4, y: 9 },
  "marksman:hidden blade": { x: 6, y: 35 },
  "one-handed:piercing strike": { x: 15, y: 17 },
  "one-handed:deathbringer": { x: 18, y: 3 },
  "restoration:mental acuity": { x: 17, y: 28 },
  "restoration:masterly wards": { x: 15, y: 10 },
  "restoration:venomaster": { x: 7, y: 6 },
  "restoration:heliomaster": { x: 5, y: 8 },
  "restoration:greater vitality": { x: 1, y: 12 },
  "sneak:shadow opportunist": { x: 9, y: 10 },
  "two-handed:longweapon focus": { x: 8, y: 29 },
  "wayfarer:animal taming": { x: 2, y: 40 },
  "wayfarer:animal riding": { x: 2, y: 31 },
  "wayfarer:beastmaster": { x: 2, y: 22 },
};

const livePerks = JSON.parse(readFileSync(livePath, "utf8"));
const positions = {};

for (const perk of livePerks) {
  const skillId = SKILL_IDS[perk.skill];
  if (!skillId || skillId === "traits" || skillId === "destiny") continue;

  const canonical = canonicalPerkName(perk.name.replace(/<br>/gi, " "));
  if (!canonical) continue;

  positions[`${skillId}:${canonical}`] = gigaPercentToGrid(perk.xPos, perk.yPos);
}

for (const [key, position] of Object.entries(LORE_RIM_ONLY_POSITIONS)) {
  positions[key] = position;
}

const document = {
  version: 2,
  source:
    "multidyls.github.io/GigaPlanner v4.0.31 (live export) + LoreRim-only perk branches",
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
      loreRimOnly: Object.keys(LORE_RIM_ONLY_POSITIONS).length,
    },
    null,
    2,
  ),
);
