import { pathToFileURL } from "node:url";
import { discoverInstall } from "./lorerim-install.mjs";
import { filterPluginsForImport } from "./plugin-skip-cache.mjs";
import { buildImportContext } from "./import-context.mjs";
import { mergeDomainFiles, writeImportOutputs } from "./import-io.mjs";
import {
  exportCodecRegistry,
  shouldExportCodecRegistry,
} from "./export-codec-registry.mjs";
import { loadJsonIfExists } from "./transform-utils.mjs";
import {
  buildAggregateSummary,
  reportDomainSummaries,
  runDomainImports,
} from "./import-orchestrator.mjs";
import { createImportReporter, formatCount, printImportSummary } from "./import-progress.mjs";
import {
  parseImportArgs,
  printImportHelp,
  resolveImportPaths,
} from "./import-cli.mjs";

export async function prepareImportContext(argv) {
  const options = parseImportArgs(argv);
  if (options.help) {
    printImportHelp();
    return { ok: true, help: true, options };
  }

  if (!options.installPath) {
    printImportHelp();
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

  const context = await buildImportContext({ install, plugins, progress });

  return {
    ok: true,
    options,
    context,
    progress,
    scanMeta: {
      pluginsInLoadOrder: allPlugins.length,
      pluginsSkippedNonMechanics: skippedPlugins.length,
      pluginsScanned: plugins.length,
    },
  };
}

/**
 * @param {object} params
 * @param {string[]} params.domains
 * @param {import('./import-context.mjs').ImportContext} params.context
 * @param {import('./import-progress.mjs').ImportReporter} params.progress
 * @param {object} params.options
 * @param {Record<string, unknown>} [params.scanMeta]
 */
export async function executeDomainImports({ domains, context, progress, options, scanMeta = {} }) {
  progress.phase("Transforming game data", 3, 5);
  const domainResults = await runDomainImports(context, domains, progress);
  reportDomainSummaries(domainResults, progress);

  const summary = buildAggregateSummary(context, domainResults, scanMeta);
  const { files, postWriteHooks, stalePerkFiles } = mergeDomainFiles(domainResults);
  const previousManifest = loadJsonIfExists(context.paths.manifestPath);
  const previousVersion = previousManifest?.version ?? null;

  if (options.dryRun) {
    progress.phase("Dry run complete", 5, 5);
    const { diff } = writeImportOutputs({
      files,
      stalePerkFiles,
      paths: context.paths,
      dryRun: true,
      progress,
    });

    printImportSummary(progress, summary, {
      elapsed: progress.elapsed(),
      dryRun: true,
    });

    const nextVersion = summary.modpackVersion ?? previousVersion;
    if (shouldExportCodecRegistry({ previousVersion, modpackVersion: nextVersion })) {
      progress.step(
        `Codec registry: would export snapshot for ${nextVersion} after write`,
      );
    }

    return { ok: true, dryRun: true, summary, diff, domainResults };
  }

  const { diff } = writeImportOutputs({
    files,
    paths: context.paths,
    dryRun: false,
    progress,
  });

  for (const hook of postWriteHooks) {
    const removedPerkFiles = hook();
    if (removedPerkFiles?.length > 0) {
      progress.step(`Removed stale perk files: ${removedPerkFiles.join(", ")}`);
    }
  }

  const updatedManifest = loadJsonIfExists(context.paths.manifestPath);
  const modpackVersion = updatedManifest?.version ?? summary.modpackVersion ?? null;
  if (shouldExportCodecRegistry({ previousVersion, modpackVersion })) {
    const exported = exportCodecRegistry({
      gameDir: context.paths.dataDir,
      repoRoot: context.paths.repoRoot,
    });
    progress.step(
      `Codec registry: exported snapshot for ${exported.version} (${exported.perkCount} perks)`,
    );
    summary.codecRegistryExported = exported.version;
  }

  printImportSummary(progress, summary, { elapsed: progress.elapsed() });
  return { ok: true, summary, diff, domainResults };
}

export async function runStandaloneDomainImport({ domain, argv = process.argv.slice(2) }) {
  const prepared = await prepareImportContext(argv);
  if (prepared.help) return prepared;

  return executeDomainImports({
    domains: [domain],
    context: prepared.context,
    progress: prepared.progress,
    options: prepared.options,
    scanMeta: prepared.scanMeta,
  });
}

export function isImportMain(moduleUrl, argv = process.argv) {
  return argv[1] && moduleUrl === pathToFileURL(argv[1]).href;
}

export { resolveImportPaths };
export { resolveDomainList } from "./import-orchestrator.mjs";
