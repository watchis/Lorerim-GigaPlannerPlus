import { loadJsonIfExists } from "../lib/transform-utils.mjs";
import { detectLorerimVersion } from "../lib/lorerim-version.mjs";

export function transformManifestFromInstall(existingManifest, installDir) {
  const detected = detectLorerimVersion(installDir);
  const version = detected.version ?? existingManifest?.version ?? null;

  return {
    ...existingManifest,
    name: "LoreRim",
    ...(version ? { version } : {}),
  };
}

export async function importManifest(context) {
  const existingManifest = loadJsonIfExists(context.paths.manifestPath);
  const manifest = transformManifestFromInstall(existingManifest, context.install.installDir);

  return {
    files: [["manifest.json", manifest]],
    summary: {
      modpackVersion: manifest.version ?? null,
      previousVersion: existingManifest?.version ?? null,
    },
  };
}
