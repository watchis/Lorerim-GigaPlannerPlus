import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { collectImportPluginData } from "./lib/esp-reader.mjs";
import { buildIdentityToPerkName } from "./lib/avif-perk-tree.mjs";
import { buildAvifMembershipIndex } from "./lib/avif-perk-membership.mjs";
import { buildPerkMetadataIndex } from "./lib/perk-tree-metadata.mjs";
import { discoverInstall } from "./lib/lorerim-install.mjs";
import { filterPluginsForImport } from "./lib/plugin-skip-cache.mjs";
import {
  transformManifestFromInstall,
  transformDeityRecords,
  transformPerkRecords,
  transformRaceRecords,
  transformStandingStoneRecords,
  transformTraitRecords,
} from "./lib/lorerim-transform.mjs";
import { loadJsonIfExists } from "./lib/transform-utils.mjs";
import { removeStalePerkFiles, findStalePerkFiles } from "./lib/import-reset.mjs";
import { createImportReporter, formatCount, printImportSummary } from "./lib/import-progress.mjs";
import { buildDeityEligibilityIndex } from "./lib/deity-eligibility.mjs";
import {
  countDiffFiles,
  formatDryRunDiff,
  serializePlannerJson,
} from "./lib/import-dry-run-diff.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..", "..");
const dataDir = join(root, "data", "game");
const perksDir = join(dataDir, "perks");

function writeJson(filePath, value) {
  mkdirSync(dirname(filePath), { recursive: true });
  writeFileSync(filePath, serializePlannerJson(value));
}

function buildFilesToWrite({
  indexEntries,
  playerLevelReqs,
  traits,
  races,
  raceEffects,
  birthsigns,
  deities,
  manifest,
  trees,
}) {
  return [
    ["perks/index.json", indexEntries],
    ["perk-player-level-reqs.json", playerLevelReqs],
    ["traits.json", traits],
    ["races.json", races],
    ["race-effects.json", raceEffects],
    ["birthsigns.json", birthsigns],
    ["deities.json", deities],
    ["manifest.json", manifest],
    ...Object.entries(trees).map(([filename, tree]) => [`perks/${filename}`, tree]),
  ];
}

function parseArgs(argv) {
  const options = {
    installPath: null,
    dryRun: false,
    pluginLimit: null,
    rescanPlugins: false,
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
    if (arg === "--rescan-plugins") {
      options.rescanPlugins = true;
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
  --dry-run              Parse and report a git-style diff without writing files
  --plugin-limit <n>     Only scan the first N plugins (debug)
  --rescan-plugins       Reclassify all plugins (ignore non-mechanics skip cache)
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
  const allPlugins =
    options.pluginLimit != null
      ? install.plugins.slice(0, options.pluginLimit)
      : install.plugins;

  const progress = createImportReporter();
  progress.banner([
    "Game data import",
    options.dryRun ? "(dry run — no files will be written)" : "",
  ].filter(Boolean));

  progress.step(`Install: ${install.installDir}`);
  progress.step(`MO2 profile: ${install.profile}`);
  progress.step(`Plugins in load order: ${formatCount(allPlugins.length)}`);

  progress.phase("Classifying plugins", 1, 5);
  const { toScan: plugins, skipped: skippedPlugins } = await filterPluginsForImport(
    allPlugins,
    { rescanAll: options.rescanPlugins, progress },
  );
  if (skippedPlugins.length > 0) {
    progress.step(
      `Skipping ${formatCount(skippedPlugins.length)} non-mechanics plugins ` +
        `(asset-only; cache in tools/import/cache/)`,
    );
  }
  progress.step(`Plugins to scan: ${formatCount(plugins.length)}`);

  progress.phase("Scanning plugin records", 2, 5);
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
    boonMagnitudes,
    lorerimRaceRecords,
    traitsFormList,
    mastersByPath,
  } = await collectImportPluginData(plugins, progress);
  progress.activity("Building perk metadata index…");
  const avifMembership = buildAvifMembershipIndex(
    avifTrees,
    buildIdentityToPerkName(perkRecords),
  );
  const perkMetadataIndex = buildPerkMetadataIndex(perkRecords, avifTrees, avifMembership);
  progress.step(
    `Indexed perks — ${formatCount(perkRecords.length)} PERK records, ` +
      `${formatCount(avifMembership.allDisplayedIdentities.size)} AVIF-displayed perks`,
  );

  progress.phase("Transforming game data", 3, 5);
  const transformProgress = progress.track("Transform steps", 5);

  transformProgress.tick("Perk trees");
  const { trees, indexEntries, addedPerks, removedPerks, playerLevelReqs } = transformPerkRecords(
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

  transformProgress.tick("Traits");
  const traits = await transformTraitRecords(spellRecords, install, plugins, {
    traitsFormList,
    mastersByPath,
  });
  progress.step(`Traits — ${formatCount(traits.traits.length)} entries`);

  transformProgress.tick("Races");
  const { races, raceEffects } = transformRaceRecords(
    raceRecords,
    spellRecords,
    join(dataDir, "races.json"),
    lorerimRaceRecords,
  );
  progress.step(`Races — ${formatCount(races.races.length)} playable races`);

  transformProgress.tick("Birthsigns");
  const birthsigns = transformStandingStoneRecords(
    spellRecords,
    mesgRecords,
    join(dataDir, "birthsigns.json"),
  );
  progress.step(`Birthsigns — ${formatCount(birthsigns.birthsigns.length)} entries`);

  transformProgress.tick("Deities");
  const deityEligibility = await buildDeityEligibilityIndex({
    wintersunPlugins: plugins.filter((plugin) => /Wintersun/i.test(plugin.pluginName)),
    mesgRecords: wintersunMesgRecords,
    questRecords,
    spellRecords,
  });
  const deities = transformDeityRecords(
    spellRecords,
    wintersunMgefRecords,
    wintersunMesgRecords,
    join(dataDir, "deities.json"),
    altarMagnitudes,
    deityEligibility,
    boonMagnitudes,
  );
  progress.step(`Deities — ${formatCount(deities.deities.length)} entries`);
  transformProgress.finish("5 data sets transformed");

  progress.phase("Resolving modpack version", 4, 5);
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
    progress.step("Warning: could not detect modpack version; manifest version unchanged.");
  }

  const summary = {
    installDir: install.installDir,
    profile: install.profile,
    pluginsInLoadOrder: allPlugins.length,
    pluginsSkippedNonMechanics: skippedPlugins.length,
    pluginsScanned: plugins.length,
    perkRecords: perkRecords.length,
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
    progress.phase("Dry run complete", 5, 5);
    const filesToWrite = buildFilesToWrite({
      indexEntries,
      playerLevelReqs,
      traits,
      races,
      raceEffects,
      birthsigns,
      deities,
      manifest,
      trees,
    });
    const staleFiles = findStalePerkFiles(perksDir, Object.keys(trees));
    const diffText = formatDryRunDiff({
      filesToWrite,
      staleFiles,
      dataDir,
      perksDir,
      repoRoot: root,
    });

    if (diffText) {
      progress.step(`Changes detected in ${formatCount(countDiffFiles(diffText))} file(s):`);
      console.log(diffText);
    } else {
      progress.step("No changes detected.");
    }

    printImportSummary(progress, summary, {
      elapsed: progress.elapsed(),
      dryRun: true,
    });
    return { ok: true, dryRun: true, summary, diff: diffText };
  }

  progress.phase("Writing planner JSON", 5, 5);
  const filesToWrite = buildFilesToWrite({
    indexEntries,
    playerLevelReqs,
    traits,
    races,
    raceEffects,
    birthsigns,
    deities,
    manifest,
    trees,
  });

  const writeProgress = progress.track("Writing output files", filesToWrite.length);
  for (const [relativePath, payload] of filesToWrite) {
    const filePath = relativePath.startsWith("perks/")
      ? join(perksDir, relativePath.slice("perks/".length))
      : join(dataDir, relativePath);
    writeJson(filePath, payload);
    writeProgress.tick();
  }
  writeProgress.finish(`${formatCount(filesToWrite.length)} files`);

  const removedPerkFiles = removeStalePerkFiles(perksDir, Object.keys(trees));
  if (removedPerkFiles.length > 0) {
    progress.step(`Removed stale perk files: ${removedPerkFiles.join(", ")}`);
  }

  printImportSummary(progress, summary, { elapsed: progress.elapsed() });

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
