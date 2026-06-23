/**
 * One-time generator for static GigaPlanner perk coordinates.
 * Source: legacy scripts/giga-perkListData.js (LoreRim v4 GigaPlanner layout).
 * Do not fetch https://multidyls.github.io/GigaPlanner/ at runtime.
 */
import { execSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import vm from "node:vm";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { canonicalPerkName } from "./lib/perk-import-filter.mjs";
import { SKILL_IDS } from "./lib/skill-constants.mjs";
import { gigaPercentToGrid, GIGA_LAYOUT_GRID } from "./lib/giga-planner-layout-constants.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const outputPath = join(__dirname, "lib", "giga-planner-layout.json");

function loadLegacyPerkData(sourcePath = null) {
  const src = sourcePath
    ? readFileSync(sourcePath, "utf8")
    : execSync("git show HEAD:scripts/giga-perkListData.js", { encoding: "utf8" });

  const sandbox = { addPerkData: (data) => { sandbox.data = data; } };
  vm.runInNewContext(src, sandbox);
  if (!sandbox.data?.perks) {
    throw new Error("Could not parse legacy giga-perkListData.js");
  }
  return sandbox.data.perks;
}

function buildLayoutDocument(perks) {
  const positions = {};

  for (const perk of perks) {
    const skillId = SKILL_IDS[perk.skill];
    if (!skillId || skillId === "traits") continue;

    const canonical = canonicalPerkName(perk.name);
    if (!canonical) continue;

    positions[`${skillId}:${canonical}`] = gigaPercentToGrid(perk.xPos, perk.yPos);
  }

  return {
    version: 1,
    source: "legacy scripts/giga-perkListData.js (multidyls GigaPlanner v4 layout)",
    grid: GIGA_LAYOUT_GRID,
    positions,
  };
}

const perks = loadLegacyPerkData(process.argv[2] ?? null);
const document = buildLayoutDocument(perks);
writeFileSync(outputPath, `${JSON.stringify(document, null, 2)}\n`);
console.log(
  JSON.stringify(
    {
      output: outputPath,
      skills: new Set(Object.keys(document.positions).map((key) => key.split(":")[0])).size,
      positions: Object.keys(document.positions).length,
    },
    null,
    2,
  ),
);
