import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { discoverInstall } from "./lib/lorerim-install.mjs";
import { collectRecordsFromPlugins } from "./lib/esp-reader.mjs";
import { collectAvifPerkTrees, buildIdentityToPerkName } from "./lib/avif-perk-tree.mjs";
import {
  buildAvifMembershipIndex,
  compareAvifToPlanner,
} from "./lib/avif-perk-membership.mjs";
import {
  collectDisplayedPerkRecords,
  collectTreePerkRecords,
} from "./lib/perk-import-filter.mjs";

const installPath = process.argv[2] ?? "D:/Wabbajack/Modlists/Lorerim";
const install = discoverInstall(installPath);
const perkRecords = await collectRecordsFromPlugins(install.plugins, ["PERK"]);
const avifTrees = await collectAvifPerkTrees(install.plugins);
const membership = buildAvifMembershipIndex(avifTrees, buildIdentityToPerkName(perkRecords));

const plannerTrees = {};
for (const filename of readdirSync("data/game/perks")) {
  if (!filename.endsWith(".json") || filename === "index.json") continue;
  plannerTrees[filename] = JSON.parse(readFileSync(join("data/game/perks", filename), "utf8"));
}

const displayedRecords = collectDisplayedPerkRecords(perkRecords, membership);
const prefixRecords = collectTreePerkRecords(perkRecords);
const diff = compareAvifToPlanner(plannerTrees, membership, prefixRecords);

console.log(
  JSON.stringify(
    {
      avifSkills: membership.identitiesBySkill.size,
      avifPerks: membership.allDisplayedIdentities.size,
      prefixFilteredPerks: prefixRecords.length,
      displayedPerks: displayedRecords.length,
      prefixOnlyExcluded: prefixRecords.length - displayedRecords.length,
      inAvifNotInPlanner: diff.inAvifNotInPlanner.length,
      inPlannerNotInAvif: diff.inPlannerNotInAvif.length,
      prefixOnlyNotInAvif: diff.prefixOnlyNotInAvif.length,
      samples: {
        inAvifNotInPlanner: diff.inAvifNotInPlanner.slice(0, 20),
        inPlannerNotInAvif: diff.inPlannerNotInAvif.slice(0, 20),
        prefixOnlyNotInAvif: diff.prefixOnlyNotInAvif.slice(0, 20),
      },
    },
    null,
    2,
  ),
);
