export function formatModpackVersion(version: string): string {
  const trimmed = version.trim();
  if (!trimmed) return "";
  if (trimmed.startsWith("v")) return trimmed;
  return `v${trimmed}`;
}

export function normalizeModpackVersionForCompare(version: string): string {
  const trimmed = version.trim();
  if (!trimmed) return "";
  return trimmed.replace(/^[vV]/, "");
}

/** First dot-separated segment of a modpack version (e.g. `5` from `5.0.4.2`). */
export function getModpackMajorVersion(version: string): string {
  const normalized = normalizeModpackVersionForCompare(version);
  if (!normalized) return "";
  return normalized.split(".")[0] ?? "";
}

export type ModpackVersionMismatchLevel = "none" | "warning" | "error";

export function getModpackVersionMismatchLevel({
  savedModpackVersion,
  currentModpackVersion,
}: {
  savedModpackVersion?: string | null;
  currentModpackVersion: string;
}): ModpackVersionMismatchLevel {
  const saved = savedModpackVersion?.trim();
  if (!saved) return "none";

  const normalizedSaved = normalizeModpackVersionForCompare(saved);
  const normalizedCurrent = normalizeModpackVersionForCompare(currentModpackVersion);
  if (normalizedSaved === normalizedCurrent) return "none";

  if (getModpackMajorVersion(saved) !== getModpackMajorVersion(currentModpackVersion)) {
    return "error";
  }

  return "warning";
}

export function getModpackVersionForBuildCard({
  savedModpackVersion,
  currentModpackVersion,
}: {
  savedModpackVersion?: string | null;
  currentModpackVersion: string;
}): string {
  const raw = savedModpackVersion?.trim() ? savedModpackVersion : currentModpackVersion;
  return formatModpackVersion(raw);
}

/** True when a saved build's modpack version differs from the planner's current version. */
export function isModpackVersionMismatch({
  savedModpackVersion,
  currentModpackVersion,
}: {
  savedModpackVersion?: string | null;
  currentModpackVersion: string;
}): boolean {
  return (
    getModpackVersionMismatchLevel({ savedModpackVersion, currentModpackVersion }) !== "none"
  );
}

export interface ImportedBuildVersionMismatch {
  level: Exclude<ModpackVersionMismatchLevel, "none">;
  sourceVersion: string;
  currentVersion: string;
}

export function getImportedBuildVersionMismatch(
  sourceModpackVersion: string | undefined | null,
  currentModpackVersion: string,
): ImportedBuildVersionMismatch | null {
  const source = sourceModpackVersion?.trim();
  if (!source) return null;

  const level = getModpackVersionMismatchLevel({
    savedModpackVersion: source,
    currentModpackVersion,
  });
  if (level === "none") return null;

  return {
    level,
    sourceVersion: source,
    currentVersion: currentModpackVersion,
  };
}

export function formatImportedBuildVersionWarning(
  template: string,
  mismatch: ImportedBuildVersionMismatch,
): string {
  return template
    .replaceAll("{sourceVersion}", formatModpackVersion(mismatch.sourceVersion))
    .replaceAll("{currentVersion}", formatModpackVersion(mismatch.currentVersion));
}

