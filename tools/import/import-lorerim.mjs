import {
  executeDomainImports,
  isImportMain,
  prepareImportContext,
  resolveDomainList,
} from "./lib/run-import.mjs";
import { IMPORT_DOMAINS, parseImportArgs, printImportHelp } from "./lib/import-cli.mjs";

export async function importLorerimData(argv = process.argv.slice(2)) {
  const options = parseImportArgs(argv);
  if (options.help) {
    printImportHelp();
    return { ok: true, help: true };
  }

  const prepared = await prepareImportContext(argv);
  if (prepared.help) return prepared;

  const domains = resolveDomainList(options.only);
  if (options.only?.length) {
    prepared.progress.step(`Domains: ${domains.join(", ")}`);
  }

  return executeDomainImports({
    domains,
    context: prepared.context,
    progress: prepared.progress,
    options: prepared.options,
    scanMeta: prepared.scanMeta,
  });
}

if (isImportMain(import.meta.url)) {
  importLorerimData().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
}

export { IMPORT_DOMAINS };
