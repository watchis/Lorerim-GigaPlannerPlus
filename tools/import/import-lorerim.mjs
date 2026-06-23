import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { collectAltarBlessingMagnitudes, collectRecordsFromPlugins } from "./lib/esp-reader.mjs";
import { collectAvifPerkTrees, buildIdentityToPerkName } from "./lib/avif-perk-tree.mjs";
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

  console.log(`LoreRim install: ${install.installDir}`);
  console.log(`MO2 profile: ${install.profile}`);
  console.log(`Plugins to scan: ${plugins.length}`);
  const pluginSources = summarizePluginSources(plugins);
  const fromXEdit = plugins.filter((plugin) => plugin.modName === "LoreRim - xEdit64 Output").length;
  console.log(`Plugins from LoreRim - xEdit64 Output: ${fromXEdit}`);

  const perkRecords = await collectRecordsFromPlugins(plugins, ["PERK"]);
  const avifTrees = await collectAvifPerkTrees(plugins);
  const avifMembership = buildAvifMembershipIndex(
    avifTrees,
    buildIdentityToPerkName(perkRecords),
  );
  const perkMetadataIndex = buildPerkMetadataIndex(perkRecords, avifTrees, avifMembership);
  const spellRecords = await collectRecordsFromPlugins(plugins, ["SPEL"]);
  const raceRecords = await collectRecordsFromPlugins(plugins, ["RACE"]);
  const mesgRecords = await collectRecordsFromPlugins(plugins, ["MESG"]);

  const wintersunPlugins = plugins.filter((plugin) => /Wintersun/i.test(plugin.pluginName));
  const wintersunMgefRecords = await collectRecordsFromPlugins(wintersunPlugins, ["MGEF"]);
  const wintersunMesgRecords = await collectRecordsFromPlugins(wintersunPlugins, ["MESG"]);
  const altarMagnitudes = await collectAltarBlessingMagnitudes(plugins);

  const { trees, indexEntries, addedPerks, removedPerks } = transformPerkRecords(
    perkRecords,
    perksDir,
    install.installDir,
    perkMetadataIndex,
    avifMembership,
  );
  const traits = transformTraitRecords(
    perkRecords,
    install.installDir,
    spellRecords,
  );
  const lorerimRacePlugins = plugins.filter((plugin) =>
    /LoreRim - NPCs and Races/i.test(plugin.pluginName),
  );
  const lorerimRaceRecords = await collectRecordsFromPlugins(lorerimRacePlugins, ["RACE"]);
  const races = transformRaceRecords(
    raceRecords,
    spellRecords,
    join(dataDir, "races.json"),
    lorerimRaceRecords,
  );
  const birthsigns = transformStandingStoneRecords(
    spellRecords,
    mesgRecords,
    join(dataDir, "birthsigns.json"),
  );
  const deities = transformDeityRecords(
    spellRecords,
    wintersunMgefRecords,
    wintersunMesgRecords,
    join(dataDir, "deities.json"),
    altarMagnitudes,
  );
  const existingManifest = loadJsonIfExists(join(dataDir, "manifest.json"));
  const manifest = transformManifestFromInstall(existingManifest, install.installDir);
  const versionInfo = manifest.version
    ? { modpackVersion: manifest.version }
    : {};

  if (manifest.version && manifest.version !== existingManifest?.version) {
    console.log(
      `Modpack version: ${manifest.version}` +
        (existingManifest?.version ? ` (was ${existingManifest.version})` : ""),
    );
  } else if (manifest.version) {
    console.log(`Modpack version: ${manifest.version}`);
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
    console.log("Dry run complete:");
    console.log(JSON.stringify(summary, null, 2));
    return { ok: true, dryRun: true, summary };
  }

  writeJson(join(perksDir, "index.json"), indexEntries);
  writeJson(join(dataDir, "traits.json"), traits);
  writeJson(join(dataDir, "races.json"), races);
  writeJson(join(dataDir, "birthsigns.json"), birthsigns);
  writeJson(join(dataDir, "deities.json"), deities);
  writeJson(join(dataDir, "manifest.json"), manifest);

  for (const [filename, tree] of Object.entries(trees)) {
    writeJson(join(perksDir, filename), tree);
  }

  const removedPerkFiles = removeStalePerkFiles(perksDir, Object.keys(trees));
  if (removedPerkFiles.length > 0) {
    console.log(`Removed stale perk files: ${removedPerkFiles.join(", ")}`);
  }

  console.log("Import complete:");
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
