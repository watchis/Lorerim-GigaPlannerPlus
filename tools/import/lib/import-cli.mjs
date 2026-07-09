import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const importRoot = join(__dirname, "..");
const repoRoot = join(importRoot, "..", "..");

export const IMPORT_DOMAINS = [
  "perks",
  "traits",
  "races",
  "birthsigns",
  "deities",
  "manifest",
];

export function resolveImportPaths() {
  const dataDir = join(repoRoot, "data", "game");
  return {
    repoRoot,
    importRoot,
    dataDir,
    perksDir: join(dataDir, "perks"),
    extensionBindingsPath: join(dataDir, "extension-bindings.json"),
    characterOptionsPath: join(dataDir, "character-options.json"),
    extensionsDir: join(repoRoot, "extensions"),
  };
}

export function parseImportArgs(argv) {
  const options = {
    installPath: null,
    dryRun: false,
    pluginLimit: null,
    rescanPlugins: false,
    only: null,
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
    if (arg === "--only") {
      const value = argv[++index];
      if (!value) throw new Error("--only requires a comma-separated domain list");
      options.only = value
        .split(",")
        .map((entry) => entry.trim())
        .filter(Boolean);
      continue;
    }
    if (arg === "--help" || arg === "-h") {
      options.help = true;
      continue;
    }
    throw new Error(`Unknown argument: ${arg}`);
  }

  if (options.only) {
    for (const domain of options.only) {
      if (!IMPORT_DOMAINS.includes(domain)) {
        throw new Error(
          `Unknown domain "${domain}". Valid domains: ${IMPORT_DOMAINS.join(", ")}`,
        );
      }
    }
  }

  return options;
}

export function printImportHelp({ standaloneDomain = null } = {}) {
  const domainLine = standaloneDomain
    ? `Import ${standaloneDomain} data from a local LoreRim MO2 install.`
    : "Parse game data from a local LoreRim MO2 install and update planner JSON.";

  console.log(`Usage: npm run import:${standaloneDomain ?? "lorerim"} -- --install <path> [options]

${domainLine}

Options:
  --install, -i <path>   LoreRim install root (required; must contain ModOrganizer.exe)
  --dry-run              Parse and report a git-style diff without writing files
  --plugin-limit <n>     Only scan the first N plugins (debug)
  --rescan-plugins       Reclassify all plugins (ignore non-mechanics skip cache)
  --only <domains>       Comma-separated domains (lorerim only): ${IMPORT_DOMAINS.join(", ")}
  --help, -h             Show this help

Example:
  npm run import:lorerim -- --install "D:/Wabbajack/Modlists/Lorerim"
`);
}
