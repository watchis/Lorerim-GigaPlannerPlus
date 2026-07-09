import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import {
  countDiffFiles,
  formatDryRunDiff,
  serializePlannerJson,
} from "./import-dry-run-diff.mjs";
import { formatCount } from "./import-progress.mjs";

export function writeJson(filePath, value) {
  mkdirSync(dirname(filePath), { recursive: true });
  writeFileSync(filePath, serializePlannerJson(value));
}

export function resolveOutputPath(relativePath, paths) {
  if (relativePath.startsWith("perks/")) {
    return join(paths.perksDir, relativePath.slice("perks/".length));
  }
  return join(paths.dataDir, relativePath);
}

/**
 * @param {Array<{ files: Array<[string, unknown]>, postWrite?: () => unknown, stalePerkFiles?: string[] }>} domainResults
 */
export function mergeDomainFiles(domainResults) {
  const files = [];
  const postWriteHooks = [];
  const stalePerkFiles = [];

  for (const result of domainResults) {
    files.push(...result.files);
    if (result.postWrite) postWriteHooks.push(result.postWrite);
    if (result.stalePerkFiles?.length) stalePerkFiles.push(...result.stalePerkFiles);
  }

  return { files, postWriteHooks, stalePerkFiles };
}

/**
 * @param {object} params
 * @param {Array<[string, unknown]>} params.files
 * @param {string[]} [params.stalePerkFiles]
 * @param {import('./import-context.mjs').ImportContext['paths']} params.paths
 * @param {boolean} params.dryRun
 * @param {import('./import-progress.mjs').ImportReporter} [params.progress]
 */
export function writeImportOutputs({ files, stalePerkFiles = [], paths, dryRun, progress }) {
  if (dryRun) {
    const diffText = formatDryRunDiff({
      filesToWrite: files,
      staleFiles: stalePerkFiles,
      dataDir: paths.dataDir,
      perksDir: paths.perksDir,
      repoRoot: paths.repoRoot,
    });

    if (diffText) {
      progress?.step(`Changes detected in ${formatCount(countDiffFiles(diffText))} file(s):`);
      console.log(diffText);
    } else {
      progress?.step("No changes detected.");
    }

    return { diff: diffText };
  }

  progress?.phase("Writing planner JSON", 5, 5);
  const writeProgress = progress?.track("Writing output files", files.length);

  for (const [relativePath, payload] of files) {
    writeJson(resolveOutputPath(relativePath, paths), payload);
    writeProgress?.tick();
  }

  writeProgress?.finish(`${formatCount(files.length)} files`);

  return { diff: null };
}
