import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const DESTINY_CONFIG_RELATIVE = join(
  "mods",
  "Subclasses of Skyrim",
  "NetScriptFramework",
  "Plugins",
  "CustomSkill.destiny.config.txt",
);

export function resolveDestinyConfigPath(installDir) {
  const path = join(installDir, DESTINY_CONFIG_RELATIVE);
  return existsSync(path) ? path : null;
}

export function parseDestinyConfig(configText) {
  const nodes = [];

  for (const line of configText.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const match = trimmed.match(/^Node(\d+)\.(\w+)\s*=\s*(.*)$/);
    if (!match) continue;

    const nodeIndex = Number(match[1]);
    const key = match[2];
    const value = match[3].trim().replace(/^"|"$/g, "");

    if (!nodes[nodeIndex]) {
      nodes[nodeIndex] = {
        index: nodeIndex,
        enabled: false,
        links: [],
      };
    }

    const node = nodes[nodeIndex];
    if (key === "Enable") node.enabled = value === "true";
    else if (key === "PerkId") node.perkId = Number.parseInt(value, 16);
    else if (key === "PerkFile") node.perkFile = value;
    else if (key === "X") node.x = Number.parseFloat(value);
    else if (key === "Y") node.y = Number.parseFloat(value);
    else if (key === "Links") {
      node.links = value
        ? value
            .split(",")
            .map((part) => Number.parseInt(part.trim(), 10))
            .filter((part) => !Number.isNaN(part))
        : [];
    }
  }

  return nodes.filter(Boolean);
}

export function loadDestinyConfig(installDir) {
  const path = resolveDestinyConfigPath(installDir);
  if (!path) return null;
  return parseDestinyConfig(readFileSync(path, "utf8"));
}
