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
  const saved = savedModpackVersion?.trim();
  if (!saved) return false;

  return (
    normalizeModpackVersionForCompare(saved) !==
    normalizeModpackVersionForCompare(currentModpackVersion)
  );
}

