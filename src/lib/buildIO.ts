import type { BuildState } from "@/engine/buildEngine";
import type { BuildMilestone, SavedBuild } from "@/store/savedBuilds";
import { DEFAULT_VARIANT_NAME, getDefaultVariantName } from "@/store/savedBuilds";

const BUILD_EXPORT_FORMAT = "lorerim-build";
const LIBRARY_EXPORT_FORMAT = "lorerim-build-library";
const VARIANT_EXPORT_FORMAT = "lorerim-build-variant";
const EXPORT_VERSION = 1;

/** Lorerim GigaPlanner Plus backup file extension */
export const BUILD_BACKUP_EXTENSION = ".gpp";

export const LIBRARY_BACKUP_FILENAME = `lorerim-builds${BUILD_BACKUP_EXTENSION}`;

export interface ExportedMilestone {
  name: string;
  build: BuildState;
}

export interface ExportedBuild {
  format: typeof BUILD_EXPORT_FORMAT;
  version: typeof EXPORT_VERSION;
  name: string;
  modpackVersion: string;
  build: BuildState;
  defaultVariantName?: string;
  milestones?: ExportedMilestone[];
  exportedAt: string;
}

export interface ExportedVariant {
  format: typeof VARIANT_EXPORT_FORMAT;
  version: typeof EXPORT_VERSION;
  name: string;
  modpackVersion: string;
  build: BuildState;
  exportedAt: string;
}

export interface ExportedLibrary {
  format: typeof LIBRARY_EXPORT_FORMAT;
  version: typeof EXPORT_VERSION;
  modpackVersion: string;
  savedBuilds: Array<{
    name: string;
    build: BuildState;
    defaultVariantName?: string;
    milestones?: ExportedMilestone[];
    updatedAt: number;
  }>;
  exportedAt: string;
}

export function buildShareUrl(code: string): string {
  const base = import.meta.env.BASE_URL.replace(/\/$/, "");
  const path = `${base}/planner?build=${encodeURIComponent(code)}`;
  return `${window.location.origin}${path.startsWith("/") ? path : `/${path}`}`;
}

export function buildBackupFilename(name: string): string {
  return `${sanitizeFilename(name)}${BUILD_BACKUP_EXTENSION}`;
}

export function downloadBackupFile(filename: string, data: unknown): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/vnd.lorerim-gigaplanner+backup",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function serializeMilestones(milestones: BuildMilestone[]): ExportedMilestone[] {
  return milestones.map(({ name, build }) => ({ name, build }));
}

export function createExportedVariant(
  name: string,
  build: BuildState,
  modpackVersion: string,
): ExportedVariant {
  return {
    format: VARIANT_EXPORT_FORMAT,
    version: EXPORT_VERSION,
    name,
    modpackVersion,
    build,
    exportedAt: new Date().toISOString(),
  };
}

export function createExportedBuild(
  name: string,
  build: BuildState,
  modpackVersion: string,
  milestones: BuildMilestone[] = [],
  defaultVariantName: string = DEFAULT_VARIANT_NAME,
): ExportedBuild {
  return {
    format: BUILD_EXPORT_FORMAT,
    version: EXPORT_VERSION,
    name,
    modpackVersion,
    build,
    ...(defaultVariantName !== DEFAULT_VARIANT_NAME ? { defaultVariantName } : {}),
    ...(milestones.length > 0 ? { milestones: serializeMilestones(milestones) } : {}),
    exportedAt: new Date().toISOString(),
  };
}

export function createExportedLibrary(
  savedBuilds: SavedBuild[],
  modpackVersion: string,
): ExportedLibrary {
  return {
    format: LIBRARY_EXPORT_FORMAT,
    version: EXPORT_VERSION,
    modpackVersion,
    savedBuilds: savedBuilds.map((entry) => ({
      name: entry.name,
      build: entry.build,
      ...(getDefaultVariantName(entry) !== DEFAULT_VARIANT_NAME
        ? { defaultVariantName: getDefaultVariantName(entry) }
        : {}),
      ...(entry.milestones.length > 0 ? { milestones: serializeMilestones(entry.milestones) } : {}),
      updatedAt: entry.updatedAt,
    })),
    exportedAt: new Date().toISOString(),
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function parseExportedVariant(data: unknown): ExportedVariant {
  if (!isRecord(data)) {
    throw new Error("Invalid backup file: unreadable content");
  }
  if (data.format === BUILD_EXPORT_FORMAT) {
    const build = parseExportedBuild(data);
    return {
      format: VARIANT_EXPORT_FORMAT,
      version: EXPORT_VERSION,
      name: build.name,
      modpackVersion: build.modpackVersion,
      build: build.build,
      exportedAt: build.exportedAt,
    };
  }
  if (data.format !== VARIANT_EXPORT_FORMAT) {
    throw new Error("Invalid backup file: unrecognized format");
  }
  if (data.version !== EXPORT_VERSION) {
    throw new Error(`Unsupported backup version: ${String(data.version)}`);
  }
  if (typeof data.name !== "string" || !isRecord(data.build)) {
    throw new Error("Invalid backup file: missing name or build data");
  }

  return data as unknown as ExportedVariant;
}

export function parseExportedBuild(data: unknown): ExportedBuild {
  if (!isRecord(data)) {
    throw new Error("Invalid backup file: unreadable content");
  }
  if (data.format !== BUILD_EXPORT_FORMAT) {
    throw new Error("Invalid backup file: unrecognized format");
  }
  if (data.version !== EXPORT_VERSION) {
    throw new Error(`Unsupported backup version: ${String(data.version)}`);
  }
  if (typeof data.name !== "string" || !isRecord(data.build)) {
    throw new Error("Invalid backup file: missing name or build data");
  }

  return data as unknown as ExportedBuild;
}

export function parseExportedLibrary(data: unknown): ExportedLibrary {
  if (!isRecord(data)) {
    throw new Error("Invalid backup file: unreadable content");
  }
  if (data.format !== LIBRARY_EXPORT_FORMAT) {
    throw new Error("Invalid backup file: unrecognized format");
  }
  if (data.version !== EXPORT_VERSION) {
    throw new Error(`Unsupported backup version: ${String(data.version)}`);
  }
  if (!Array.isArray(data.savedBuilds)) {
    throw new Error("Invalid backup file: missing saved builds");
  }

  return data as unknown as ExportedLibrary;
}

export async function readBackupFile(file: File): Promise<unknown> {
  const text = await file.text();
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new Error("Could not read backup file");
  }
}

export function sanitizeFilename(name: string): string {
  return name.replace(/[^a-z0-9-_]+/gi, "-").replace(/^-+|-+$/g, "") || "build";
}
