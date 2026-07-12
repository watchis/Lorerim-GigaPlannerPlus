import type { GameData } from "@/data/schemas";
import {
  clearBuildFromUrl,
  decodeBuildPackage,
  getBuildFromUrl,
  type DecodedBuildPackage,
} from "@/engine/buildCodec";
import {
  getImportedBuildVersionMismatch,
  type ImportedBuildVersionMismatch,
} from "@/lib/modpackVersion";

export type ApplyUrlBuildImportResult =
  | { status: "skipped-no-build" }
  | { status: "skipped-invalid" }
  | {
      status: "imported";
      versionMismatch: ImportedBuildVersionMismatch | null;
    };

export function applyUrlBuildImport(
  game: GameData,
  importSharedBuild: (decoded: DecodedBuildPackage) => void,
): ApplyUrlBuildImportResult {
  const urlBuild = getBuildFromUrl();
  if (!urlBuild) return { status: "skipped-no-build" };

  try {
    const decoded = decodeBuildPackage(urlBuild, game);
    importSharedBuild(decoded);
    clearBuildFromUrl();
    return {
      status: "imported",
      versionMismatch: getImportedBuildVersionMismatch(
        decoded.sourceModpackVersion,
        game.manifest.version,
      ),
    };
  } catch {
    return { status: "skipped-invalid" };
  }
}
