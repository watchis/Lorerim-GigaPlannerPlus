export function formatModpackVersion(version: string): string {
  const trimmed = version.trim();
  if (!trimmed) return "";
  if (trimmed.startsWith("v")) return trimmed;
  return `v${trimmed}`;
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

