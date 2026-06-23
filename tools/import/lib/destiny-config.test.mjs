import assert from "node:assert/strict";
import { parseDestinyConfig } from "./destiny-config.mjs";

const DESTINY_COORD_SCALE = 2;

function mapDestinyPosition(node) {
  return {
    x: Math.round(node.x * DESTINY_COORD_SCALE),
    y: Math.round(node.y * DESTINY_COORD_SCALE),
  };
}

function normalizeDestinyGrid(perks) {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const perk of perks) {
    minX = Math.min(minX, perk.position.x);
    minY = Math.min(minY, perk.position.y);
    maxX = Math.max(maxX, perk.position.x);
    maxY = Math.max(maxY, perk.position.y);
  }

  for (const perk of perks) {
    perk.position = {
      x: perk.position.x - minX,
      y: perk.position.y - minY,
    };
  }

  return perks;
}

const nodes = parseDestinyConfig(`
Node1.Enable = true
Node1.X = 8.5
Node1.Y = 6.0
Node1.Links = 2
Node2.Enable = true
Node2.X = 8.5
Node2.Y = 5.0
Node2.Links =
`);

const root = nodes.find((node) => node.index === 1);
const child = nodes.find((node) => node.index === 2);
const perks = [root, child].map((node) => ({
  id: `destiny-${node.index}`,
  position: mapDestinyPosition(node),
}));
normalizeDestinyGrid(perks);

const rootPerk = perks.find((perk) => perk.id === "destiny-1");
const childPerk = perks.find((perk) => perk.id === "destiny-2");

assert.ok(rootPerk.position.y > childPerk.position.y, "root perk should sit below its child");
