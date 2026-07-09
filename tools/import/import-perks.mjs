import { runStandaloneDomainImport, isImportMain } from "./lib/run-import.mjs";

if (isImportMain(import.meta.url)) {
  runStandaloneDomainImport({ domain: "perks" }).catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
}
