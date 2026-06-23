import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { collectRecordsFromPlugins } from "./lib/esp-reader.mjs";
import { collectAvifPerkTrees, buildIdentityToPerkName } from "./lib/avif-perk-tree.mjs";
import { buildAvifMembershipIndex } from "./lib/avif-perk-membership.mjs";
import { buildPerkMetadataIndex } from "./lib/perk-tree-metadata.mjs";
import { discoverInstall } from "./lib/lorerim-install.mjs";
import { transformPerkRecords } from "./lib/lorerim-transform.mjs";
import { removeStalePerkFiles } from "./lib/import-reset.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const perksDir = join(__dirname, "..", "..", "data", "game", "perks");

const install = discoverInstall(process.argv[2] ?? "D:/Wabbajack/Modlists/Lorerim");
const perkRecords = await collectRecordsFromPlugins(install.plugins, ["PERK"]);
const avifTrees = await collectAvifPerkTrees(install.plugins);
const avifMembership = buildAvifMembershipIndex(
  avifTrees,
  buildIdentityToPerkName(perkRecords),
);
const perkMetadataIndex = buildPerkMetadataIndex(perkRecords, avifTrees, avifMembership);
const { trees, indexEntries, addedPerks, removedPerks } = transformPerkRecords(
  perkRecords,
  perksDir,
  install.installDir,
  perkMetadataIndex,
  avifMembership,
);

for (const [filename, tree] of Object.entries(trees)) {
  writeFileSync(join(perksDir, filename), `${JSON.stringify(tree, null, 2)}\n`);
}

writeFileSync(join(perksDir, "index.json"), `${JSON.stringify(indexEntries, null, 2)}\n`);

const removedPerkFiles = removeStalePerkFiles(perksDir, Object.keys(trees));

console.log(
  JSON.stringify(
    {
      addedPerks: addedPerks.length,
      removedPerks: removedPerks.reduce((sum, entry) => sum + entry.count, 0),
      totalPerks: Object.values(trees).reduce((sum, tree) => sum + tree.perks.length, 0),
      avifPerks: avifMembership.allDisplayedIdentities.size,
      removedPerkFiles,
      sample: addedPerks.slice(0, 12),
    },
    null,
    2,
  ),
);
