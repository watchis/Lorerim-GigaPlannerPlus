import { existsSync } from "node:fs";
import { spawn } from "node:child_process";
import { join } from "node:path";

const DEFAULT_GAME_RELEASE = "SkyrimSE";
const DEFAULT_PACKAGE = "Spriggit.Json";

/**
 * Resolve Spriggit CLI path from IMPORT_SPRIGGIT_CLI or a --spriggit-cli option.
 */
export function resolveSpriggitCli(explicitPath = null) {
  const candidate = explicitPath ?? process.env.IMPORT_SPRIGGIT_CLI ?? null;
  if (!candidate) return null;
  return existsSync(candidate) ? candidate : null;
}

/**
 * Export one plugin to Spriggit JSON via CLI. Returns the output folder path.
 * Requires Spriggit.CLI (.NET) on the host — typically Windows/Wine.
 */
export function exportPluginWithSpriggit(pluginPath, outputDir, options = {}) {
  const cliPath = resolveSpriggitCli(options.cliPath);
  if (!cliPath) {
    throw new Error(
      "Spriggit CLI not found. Set IMPORT_SPRIGGIT_CLI or pass --spriggit-cli <path>.",
    );
  }

  const gameRelease = options.gameRelease ?? DEFAULT_GAME_RELEASE;
  const packageName = options.packageName ?? DEFAULT_PACKAGE;
  const pluginOutputDir = join(outputDir, pluginPath.split(/[/\\]/).pop());

  return new Promise((resolve, reject) => {
    const args = [
      "serialize",
      "--InputPath",
      pluginPath,
      "--OutputPath",
      pluginOutputDir,
      "--GameRelease",
      gameRelease,
      "--PackageName",
      packageName,
    ];

    const child = spawn(cliPath, args, { stdio: ["ignore", "pipe", "pipe"] });
    let stderr = "";

    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) {
        resolve(pluginOutputDir);
        return;
      }
      reject(new Error(`Spriggit export failed (exit ${code}): ${stderr.trim()}`));
    });
  });
}
