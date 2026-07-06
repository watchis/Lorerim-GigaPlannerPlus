import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { collectImportPluginData } from "./lib/esp-reader.mjs";
import { buildIdentityToPerkName } from "./lib/avif-perk-tree.mjs";
import { buildAvifMembershipIndex } from "./lib/avif-perk-membership.mjs";
import { buildPerkMetadataIndex } from "./lib/perk-tree-metadata.mjs";
import { discoverInstall, summarizePluginSources } from "./lib/lorerim-install.mjs";
import {
  transformManifestFromInstall,
  transformDeityRecords,
  transformPerkRecords,
  transformRaceRecords,
  transformStandingStoneRecords,
  transformTraitRecords,
} from "./lib/lorerim-transform.mjs";
import { loadJsonIfExists } from "./lib/transform-utils.mjs";
import { removeStalePerkFiles } from "./lib/import-reset.mjs";
import { createImportReporter, formatCount } from "./lib/import-progress.mjs";
import { buildDeityEligibilityIndex } from "./lib/deity-eligibility.mjs";
import { fetchFaithEffectsFromSheet } from "./lib/deity-faith-effects.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..", "..");
const dataDir = join(root, "data", "game");
const perksDir = join(dataDir, "perks");

function writeJson(filePath, value) {
  mkdirSync(dirname(filePath), { recursive: true });
  writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function parseArgs(argv) {
  const options = {
    installPath: null,
    dryRun: false,
    pluginLimit: null,
    help: false,
  };

  for (let index = 0; index < argv.length; index++) {
    const arg = argv[index];
    if (arg === "--install" || arg === "-i") {
      const value = argv[++index];
      if (!value) throw new Error("--install requires a path");
      options.installPath = value;
      continue;
    }
    if (arg === "--dry-run") {
      options.dryRun = true;
      continue;
    }
    if (arg === "--plugin-limit") {
      options.pluginLimit = Number(argv[++index]);
      continue;
    }
    if (arg === "--help" || arg === "-h") {
      options.help = true;
      continue;
    }
    throw new Error(`Unknown argument: ${arg}`);
  }

  return options;
}

function printHelp() {
  console.log(`Usage: npm run import:lorerim -- --install <path> [options]

Parse game data from a local LoreRim MO2 install and update planner JSON.

Options:
  --install, -i <path>   LoreRim install root (required; must contain ModOrganizer.exe)
  --dry-run              Parse and report without writing files
  --plugin-limit <n>     Only scan the first N plugins (debug)
  --help, -h             Show this help

Example:
  npm run import:lorerim -- --install "D:/Wabbajack/Modlists/Lorerim"
`);
}

export async function importLorerimData(argv = process.argv.slice(2)) {
  const options = parseArgs(argv);
  if (options.help) {
    printHelp();
    return { ok: true, help: true };
  }

  if (!options.installPath) {
    printHelp();
    throw new Error("Missing required --install <path>");
  }

  const install = discoverInstall(options.installPath);
  const plugins =
    options.pluginLimit != null
      ? install.plugins.slice(0, options.pluginLimit)
      : install.plugins;

  const progress = createImportReporter();
  progress.banner([
    "LoreRim → GigaPlanner import",
    options.dryRun ? "(dry run — no files will be written)" : "",
  ].filter(Boolean));

  console.log(`Install: ${install.installDir}`);
  console.log(`MO2 profile: ${install.profile}`);
  console.log(`Plugins to scan: ${formatCount(plugins.length)}`);
  const pluginSources = summarizePluginSources(plugins);
  const fromXEdit = plugins.filter((plugin) => plugin.modName === "LoreRim - xEdit64 Output").length;
  console.log(`Plugins from LoreRim - xEdit64 Output: ${fromXEdit}`);
  if (pluginSources.length > 0) {
    const topSources = pluginSources
      .slice(0, 5)
      .map(({ modName, count }) => `${modName} (${formatCount(count)})`)
      .join(", ");
    console.log(`Top plugin sources: ${topSources}`);
  }

  progress.phase("Scanning plugin records", 1, 4);
  const {
    perkRecords,
    avifTrees,
    spellRecords,
    raceRecords,
    mesgRecords,
    questRecords,
    wintersunMgefRecords,
    wintersunMesgRecords,
    altarMagnitudes,
    lorerimRaceRecords,
    traitsFormList,
    mastersByPath,
  } = await collectImportPluginData(plugins, progress);
  progress.step("Building perk metadata index…");
  const avifMembership = buildAvifMembershipIndex(
    avifTrees,
    buildIdentityToPerkName(perkRecords),
  );
  const perkMetadataIndex = buildPerkMetadataIndex(perkRecords, avifTrees, avifMembership);
  progress.step(
    `Perk metadata ready — ${formatCount(perkRecords.length)} PERK records, ` +
      `${formatCount(avifMembership.allDisplayedIdentities.size)} AVIF-displayed perks`,
  );

  const wintersunPlugins = plugins.filter((plugin) => /Wintersun/i.test(plugin.pluginName));
  progress.step(
    `Wintersun plugins: ${formatCount(wintersunPlugins.length)} ` +
      `(MGEF/MESG from combined scan)`,
  );

  progress.phase("Transforming game data", 2, 4);
  progress.step("Building perk trees…");
  const { trees, indexEntries, addedPerks, removedPerks } = transformPerkRecords(
    perkRecords,
    perksDir,
    install.installDir,
    perkMetadataIndex,
    avifMembership,
  );
  const importedPerks = Object.values(trees).reduce((sum, tree) => sum + tree.perks.length, 0);
  progress.step(
    `Perk trees — ${formatCount(Object.keys(trees).length)} trees, ` +
      `${formatCount(importedPerks)} perks` +
      (addedPerks.length > 0 ? ` (+${formatCount(addedPerks.length)} new)` : "") +
      (removedPerks.length > 0
        ? ` (−${formatCount(removedPerks.reduce((sum, entry) => sum + entry.count, 0))} removed)`
        : ""),
  );

  progress.step("Parsing traits…");
  const traits = await transformTraitRecords(spellRecords, install, plugins, {
    traitsFormList,
    mastersByPath,
  });
  progress.step(`Traits — ${formatCount(traits.traits.length)} entries`);

  progress.step(
    `Races — merging ${formatCount(raceRecords.length)} RACE records` +
      (lorerimRaceRecords.length > 0
        ? ` with ${formatCount(lorerimRaceRecords.length)} LoreRim race overrides`
        : ""),
  );
  const races = transformRaceRecords(
    raceRecords,
    spellRecords,
    join(dataDir, "races.json"),
    lorerimRaceRecords,
  );
  progress.step(`Races — ${formatCount(races.races.length)} playable races`);

  progress.step("Birthsigns…");
  const birthsigns = transformStandingStoneRecords(
    spellRecords,
    mesgRecords,
    join(dataDir, "birthsigns.json"),
  );
  progress.step(`Birthsigns — ${formatCount(birthsigns.birthsigns.length)} entries`);

  progress.step("Deities…");
  const deityEligibility = await buildDeityEligibilityIndex({
    wintersunPlugins,
    mesgRecords: wintersunMesgRecords,
    questRecords,
    spellRecords,
  });
  let faithEffectsById = new Map();
  try {
    faithEffectsById = await fetchFaithEffectsFromSheet();
    progress.step(`Faith effects sheet — ${formatCount(faithEffectsById.size)} deities`);
  } catch (error) {
    console.warn(
      `Warning: could not fetch faith effects sheet (${error instanceof Error ? error.message : error})`,
    );
  }
  const deities = transformDeityRecords(
    spellRecords,
    wintersunMgefRecords,
    wintersunMesgRecords,
    join(dataDir, "deities.json"),
    altarMagnitudes,
    deityEligibility,
    faithEffectsById,
  );
  progress.step(`Deities — ${formatCount(deities.deities.length)} entries`);

  progress.phase("Resolving modpack version", 3, 4);
  const existingManifest = loadJsonIfExists(join(dataDir, "manifest.json"));
  const manifest = transformManifestFromInstall(existingManifest, install.installDir);
  const versionInfo = manifest.version
    ? { modpackVersion: manifest.version }
    : {};

  if (manifest.version && manifest.version !== existingManifest?.version) {
    progress.step(
      `Modpack version: ${manifest.version}` +
        (existingManifest?.version ? ` (was ${existingManifest.version})` : ""),
    );
  } else if (manifest.version) {
    progress.step(`Modpack version: ${manifest.version}`);
  } else {
    console.warn("Warning: could not detect LoreRim modpack version; manifest version unchanged.");
  }

  const summary = {
    installDir: install.installDir,
    profile: install.profile,
    pluginsScanned: plugins.length,
    pluginsFromXEditOutput: fromXEdit,
    pluginSourcesTop: pluginSources.slice(0, 8),
    perkRecords: perkRecords.length,
    raceRecords: raceRecords.length,
    perkTrees: Object.keys(trees).length,
    importedPerks: Object.values(trees).reduce((sum, tree) => sum + tree.perks.length, 0),
    addedPerks: addedPerks.length,
    removedPerks: removedPerks.reduce((sum, entry) => sum + entry.count, 0),
    avifSkills: avifMembership.identitiesBySkill.size,
    avifPerks: avifMembership.allDisplayedIdentities.size,
    traits: traits.traits.length,
    races: races.races.length,
    birthsigns: birthsigns.birthsigns.length,
    deities: deities.deities.length,
    ...versionInfo,
  };

  if (options.dryRun) {
    progress.phase("Dry run complete", 4, 4);
    console.log(`Finished in ${progress.elapsed()} (no files written).`);
    console.log(JSON.stringify(summary, null, 2));
    return { ok: true, dryRun: true, summary };
  }

  progress.phase("Writing planner JSON", 4, 4);
  const filesToWrite = [
    ["perks/index.json", indexEntries],
    ["traits.json", traits],
    ["races.json", races],
    ["birthsigns.json", birthsigns],
    ["deities.json", deities],
    ["manifest.json", manifest],
    ...Object.entries(trees).map(([filename, tree]) => [`perks/${filename}`, tree]),
  ];

  for (const [relativePath, payload] of filesToWrite) {
    const filePath = relativePath.startsWith("perks/")
      ? join(perksDir, relativePath.slice("perks/".length))
      : join(dataDir, relativePath);
    writeJson(filePath, payload);
    progress.step(`Wrote ${relativePath}`);
  }

  const removedPerkFiles = removeStalePerkFiles(perksDir, Object.keys(trees));
  if (removedPerkFiles.length > 0) {
    progress.step(`Removed stale perk files: ${removedPerkFiles.join(", ")}`);
  }

  console.log(`\nImport complete in ${progress.elapsed()}:`);
  console.log(JSON.stringify(summary, null, 2));

  return { ok: true, summary };
}

const isMain =
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href;

if (isMain) {
  importLorerimData().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
}
