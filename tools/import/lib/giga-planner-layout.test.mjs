import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  applyGigaPlannerTreeLayout,
  gigaPercentToGrid,
  getGigaPlannerLayoutStats,
} from "./giga-planner-layout.mjs";
import { GIGA_LAYOUT_GRID } from "./giga-planner-layout-constants.mjs";

assert.deepEqual(gigaPercentToGrid(50, 62.857142857142854), { x: 10, y: 28 });

const stats = getGigaPlannerLayoutStats();
assert.ok(stats.positionCount > 300);

const blockTree = {
  skillId: "block",
  grid: { width: 1, height: 1 },
  perks: [
    {
      id: "block-block-mastery",
      name: "Block Mastery",
      skillReq: 20,
      position: { x: 0, y: 0 },
      prerequisites: ["block-block-mastery"],
    },
    {
      id: "block-elemental-protection",
      name: "Elemental Protection",
      skillReq: 30,
      position: { x: 0, y: 0 },
      prerequisites: ["block-block-mastery"],
    },
    {
      id: "block-disarming-bash",
      name: "Disarming Bash",
      skillReq: 40,
      position: { x: 0, y: 0 },
      prerequisites: ["block-elemental-protection"],
    },
  ],
};

const { matched } = applyGigaPlannerTreeLayout(blockTree);
assert.equal(matched, 2);

const xs = new Set(blockTree.perks.map((perk) => perk.position.x));
assert.ok(xs.size > 1, "layout should spread perks horizontally");

const layoutPath = join(dirname(fileURLToPath(import.meta.url)), "giga-planner-layout.json");
const layout = JSON.parse(readFileSync(layoutPath, "utf8"));
assert.equal(layout.grid.width, GIGA_LAYOUT_GRID.width);
assert.equal(layout.grid.height, GIGA_LAYOUT_GRID.height);
assert.deepEqual(layout.positions["block:elemental protection"], { x: 3, y: 13 });

console.log("giga-planner-layout.test.mjs: ok");
