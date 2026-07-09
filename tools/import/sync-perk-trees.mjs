/**
 * @deprecated Use `npm run import:perks -- --install <path>` instead.
 * Thin wrapper kept for backward compatibility.
 */
import { runStandaloneDomainImport } from "./lib/run-import.mjs";

const installPath = process.argv[2];
if (!installPath || installPath.startsWith("-")) {
  console.error(
    "Deprecated: sync-perk-trees.mjs — use npm run import:perks -- --install <path> instead.",
  );
  process.exit(1);
}

console.warn(
  "Warning: sync-perk-trees.mjs is deprecated. Use: npm run import:perks -- --install <path>",
);

await runStandaloneDomainImport({
  domain: "perks",
  argv: ["--install", installPath],
});
