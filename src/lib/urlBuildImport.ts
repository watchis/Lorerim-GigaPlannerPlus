import type { GameData } from "@/data/schemas";
import {
  clearBuildFromUrl,
  decodeBuildPackage,
  getBuildFromUrl,
  type DecodedBuildPackage,
} from "@/engine/buildCodec";

export type ApplyUrlBuildImportResult =
  | "imported"
  | "skipped-no-build"
  | "skipped-invalid";

export function applyUrlBuildImport(
  game: GameData,
  importSharedBuild: (decoded: DecodedBuildPackage) => void,
): ApplyUrlBuildImportResult {
  const urlBuild = getBuildFromUrl();
  if (!urlBuild) return "skipped-no-build";

  try {
    importSharedBuild(decodeBuildPackage(urlBuild, game));
    clearBuildFromUrl();
    return "imported";
  } catch {
    return "skipped-invalid";
  }
}
