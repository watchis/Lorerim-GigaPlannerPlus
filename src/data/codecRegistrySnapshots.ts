import registryIndex from "../../data/codec-registries/index.json";

export interface CodecRegistrySnapshot {
  version: string;
  races: string[];
  birthsigns: string[];
  deities: string[];
  traits: string[];
  skills: string[];
  perks: string[];
  characterOptions?: string[];
  characterOptionChoices?: string[][];
}

const snapshotModules = import.meta.glob("../../data/codec-registries/*.json", {
  eager: true,
  import: "default",
}) as Record<string, CodecRegistrySnapshot>;

const SNAPSHOTS = Object.fromEntries(
  Object.entries(snapshotModules)
    .filter((entry) => !entry[0].endsWith("/index.json"))
    .map(([, snapshot]) => [snapshot.version, snapshot]),
);

export const codecRegistryVersions = registryIndex.versions;

export function getCodecRegistrySnapshot(version: string): CodecRegistrySnapshot | null {
  const trimmed = version.trim();
  return SNAPSHOTS[trimmed] ?? null;
}
