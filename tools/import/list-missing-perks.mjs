import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { discoverInstall } from "./lib/lorerim-install.mjs";
import { collectRecordsFromPlugins } from "./lib/esp-reader.mjs";
import {
  collectDisplayedPerkRecords,
  canonicalPerkName,
} from "./lib/perk-import-filter.mjs";
import { buildAvifMembershipIndex } from "./lib/avif-perk-membership.mjs";
import { collectAvifPerkTrees, buildIdentityToPerkName } from "./lib/avif-perk-tree.mjs";

const install = discoverInstall(process.argv[2] ?? "D:/Wabbajack/Modlists/Lorerim");
const perks = await collectRecordsFromPlugins(install.plugins, ["PERK"]);
const avifTrees = await collectAvifPerkTrees(install.plugins);
const membership = buildAvifMembershipIndex(avifTrees, buildIdentityToPerkName(perks));
const tree = collectDisplayedPerkRecords(perks, membership);

const plannerNames = new Map();
for (const filename of readdirSync("data/game/perks").filter(
  (entry) => entry.endsWith(".json") && entry !== "index.json" && entry !== "destiny.json",
)) {
  const perkTree = JSON.parse(readFileSync(join("data/game/perks", filename), "utf8"));
  for (const perk of perkTree.perks) {
    const key = canonicalPerkName(perk.name);
    plannerNames.set(key, (plannerNames.get(key) ?? 0) + 1);
  }
}

const espByCanon = new Map();
for (const record of tree) {
  const key = canonicalPerkName(record.name);
  if (!key || espByCanon.has(key)) continue;
  espByCanon.set(key, record);
}

const missing = [...espByCanon.entries()]
  .filter(([key]) => !plannerNames.has(key))
  .map(([, record]) => record)
  .sort((left, right) => left.edid.localeCompare(right.edid));

console.log(JSON.stringify({ missing: missing.length, perks: missing.map((r) => ({ edid: r.edid, name: r.name })) }, null, 2));
