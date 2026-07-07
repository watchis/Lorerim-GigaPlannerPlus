import type { BuildState } from "@/engine/buildEngine";
import { areBuildStatesEqual, createInitialBuildState, migrateBuildState } from "@/engine/buildEngine";

export interface BuildMilestone {
  id: string;
  name: string;
  build: BuildState;
}

export const DEFAULT_VARIANT_NAME = "Default";

export interface SavedBuild {
  id: string;
  name: string;
  build: BuildState;
  defaultVariantName: string;
  milestones: BuildMilestone[];
  activeMilestoneId: string | null;
  updatedAt: number;
  importedAt: number | null;
}

export interface BuildLibraryState {
  savedBuilds: SavedBuild[];
  activeBuildId: string;
}

export const LEGACY_STORAGE_KEY = "lorerim-build";
export const LIBRARY_STORAGE_KEY = "lorerim-build-library";

export const APP_STORAGE_KEYS = [LIBRARY_STORAGE_KEY, LEGACY_STORAGE_KEY] as const;

export function createBuildId(): string {
  return crypto.randomUUID();
}

export function defaultBuildName(index: number): string {
  return `Build ${index}`;
}

export function createMilestone(name: string, build: BuildState): BuildMilestone {
  return {
    id: createBuildId(),
    name,
    build,
  };
}

export function defaultMilestoneName(playerLevel: number): string {
  return `Level ${playerLevel}`;
}

export function nextMilestoneName(
  milestones: BuildMilestone[],
  playerLevel: number,
  defaultVariantName: string = DEFAULT_VARIANT_NAME,
): string {
  const used = new Set([defaultVariantName, ...milestones.map((m) => m.name)]);
  const levelName = defaultMilestoneName(playerLevel);
  if (!used.has(levelName)) return levelName;

  let index = milestones.length + 1;
  while (used.has(`Milestone ${index}`)) {
    index += 1;
  }
  return `Milestone ${index}`;
}

export function nextVariantCopyName(sourceName: string, entry: SavedBuild): string {
  const normalized = normalizeSavedBuild(entry);
  const used = new Set([
    getDefaultVariantName(normalized),
    ...normalized.milestones.map((milestone) => milestone.name),
  ]);
  const base = `${sourceName} copy`;
  if (!used.has(base)) return base;

  let index = 2;
  while (used.has(`${base} ${index}`)) {
    index += 1;
  }
  return `${base} ${index}`;
}

export function getVariantBuild(entry: SavedBuild, variantId: string | null): BuildState {
  const normalized = normalizeSavedBuild(entry);
  if (variantId === null) return normalized.build;

  const milestone = normalized.milestones.find((item) => item.id === variantId);
  return milestone?.build ?? normalized.build;
}

export function getVariantName(entry: SavedBuild, variantId: string | null): string {
  const normalized = normalizeSavedBuild(entry);
  if (variantId === null) return getDefaultVariantName(normalized);

  const milestone = normalized.milestones.find((item) => item.id === variantId);
  return milestone?.name ?? getDefaultVariantName(normalized);
}

export function createSavedBuild(
  name: string,
  build: BuildState,
  milestones: BuildMilestone[] = [],
  defaultVariantName: string = DEFAULT_VARIANT_NAME,
  options: { imported?: boolean } = {},
): SavedBuild {
  return {
    id: createBuildId(),
    name,
    build,
    defaultVariantName: defaultVariantName.trim() || DEFAULT_VARIANT_NAME,
    milestones,
    activeMilestoneId: null,
    updatedAt: Date.now(),
    importedAt: options.imported ? Date.now() : null,
  };
}

export function isSavedBuildImported(entry: SavedBuild): boolean {
  return entry.importedAt != null;
}

export function markSavedBuildImported(entry: SavedBuild): SavedBuild {
  return { ...entry, importedAt: Date.now() };
}

export function acknowledgeSavedBuildEdits(entry: SavedBuild): SavedBuild {
  if (entry.importedAt == null) return entry;
  return { ...entry, importedAt: null };
}

export function normalizeSavedBuild(entry: SavedBuild): SavedBuild {
  return {
    ...entry,
    defaultVariantName: entry.defaultVariantName?.trim() || DEFAULT_VARIANT_NAME,
    milestones: entry.milestones ?? [],
    activeMilestoneId: entry.activeMilestoneId ?? null,
    importedAt: entry.importedAt ?? null,
  };
}

export function getDefaultVariantName(entry: SavedBuild): string {
  return normalizeSavedBuild(entry).defaultVariantName;
}

export function getVariantCount(entry: SavedBuild): number {
  return 1 + normalizeSavedBuild(entry).milestones.length;
}

export function pickMilestoneToPromote(milestones: BuildMilestone[]): BuildMilestone | undefined {
  if (milestones.length === 0) return undefined;
  return [...milestones].sort((a, b) => a.build.playerLevel - b.build.playerLevel)[0];
}

export function promoteMilestoneToDefault(entry: SavedBuild, milestoneId: string): SavedBuild {
  const milestone = entry.milestones.find((m) => m.id === milestoneId);
  if (!milestone) return entry;

  const wasActive = entry.activeMilestoneId === milestoneId;

  return {
    ...entry,
    build: milestone.build,
    defaultVariantName: milestone.name,
    milestones: entry.milestones.filter((m) => m.id !== milestoneId),
    activeMilestoneId: wasActive ? null : entry.activeMilestoneId,
  };
}

export function getActiveSavedBuildBuild(entry: SavedBuild): BuildState {
  if (!entry.activeMilestoneId) return entry.build;
  const milestone = entry.milestones.find((m) => m.id === entry.activeMilestoneId);
  return milestone?.build ?? entry.build;
}

export function listBuildVariants(entry: SavedBuild): Array<{
  id: string | null;
  name: string;
  level: number;
  perkCount: number;
}> {
  const normalized = normalizeSavedBuild(entry);

  return [
    {
      id: null,
      name: getDefaultVariantName(normalized),
      level: normalized.build.playerLevel,
      perkCount: normalized.build.selectedPerkIds.length,
    },
    ...normalized.milestones.map((milestone) => ({
      id: milestone.id,
      name: milestone.name,
      level: milestone.build.playerLevel,
      perkCount: milestone.build.selectedPerkIds.length,
    })),
  ];
}

export function getActiveVariantIndex(entry: SavedBuild): number {
  const normalized = normalizeSavedBuild(entry);
  if (normalized.activeMilestoneId === null) return 0;

  const milestoneIndex = normalized.milestones.findIndex(
    (milestone) => milestone.id === normalized.activeMilestoneId,
  );
  return milestoneIndex === -1 ? 0 : milestoneIndex + 1;
}

function adjustIndexAfterMove(
  activeIndex: number,
  fromIndex: number,
  toIndex: number,
): number {
  if (fromIndex === activeIndex) return toIndex;
  if (fromIndex < activeIndex && toIndex >= activeIndex) return activeIndex - 1;
  if (fromIndex > activeIndex && toIndex <= activeIndex) return activeIndex + 1;
  return activeIndex;
}

export function reorderVariantsInEntry(
  entry: SavedBuild,
  fromIndex: number,
  toIndex: number,
): SavedBuild {
  const normalized = normalizeSavedBuild(entry);
  const slots = [
    {
      id: null as string | null,
      name: getDefaultVariantName(normalized),
      build: normalized.build,
    },
    ...normalized.milestones.map((milestone) => ({
      id: milestone.id,
      name: milestone.name,
      build: milestone.build,
    })),
  ];

  if (
    fromIndex === toIndex ||
    fromIndex < 0 ||
    toIndex < 0 ||
    fromIndex >= slots.length ||
    toIndex >= slots.length
  ) {
    return normalized;
  }

  const activeIndex = getActiveVariantIndex(normalized);
  const [moved] = slots.splice(fromIndex, 1);
  slots.splice(toIndex, 0, moved);

  const nextActiveIndex = adjustIndexAfterMove(activeIndex, fromIndex, toIndex);
  const [defaultSlot, ...restSlots] = slots;
  const milestones = restSlots.map((slot) => ({
    id: slot.id ?? createBuildId(),
    name: slot.name,
    build: slot.build,
  }));

  return {
    ...normalized,
    build: defaultSlot.build,
    defaultVariantName: defaultSlot.name,
    milestones,
    activeMilestoneId: nextActiveIndex === 0 ? null : milestones[nextActiveIndex - 1]?.id ?? null,
  };
}

export function nextBuildName(builds: SavedBuild[]): string {
  const used = new Set(builds.map((b) => b.name));
  let index = builds.length + 1;
  while (used.has(defaultBuildName(index))) {
    index += 1;
  }
  return defaultBuildName(index);
}

export function uniqueBuildName(desiredName: string, builds: SavedBuild[]): string {
  const trimmed = desiredName.trim();
  if (!trimmed) return nextBuildName(builds);

  const used = new Set(builds.map((build) => build.name));
  if (!used.has(trimmed)) return trimmed;

  const base = `${trimmed} copy`;
  if (!used.has(base)) return base;

  let index = 2;
  while (used.has(`${base} ${index}`)) {
    index += 1;
  }
  return `${base} ${index}`;
}

export function touchSavedBuild(saved: SavedBuild, build: BuildState): SavedBuild {
  if (areBuildStatesEqual(saved.build, build)) {
    return saved;
  }

  return acknowledgeSavedBuildEdits({ ...saved, build, updatedAt: Date.now() });
}

export function updateSavedBuildInList(
  builds: SavedBuild[],
  activeBuildId: string,
  build: BuildState,
): SavedBuild[] {
  return builds.map((entry) => {
    if (entry.id !== activeBuildId) return entry;

    const normalized = normalizeSavedBuild(entry);
    if (normalized.activeMilestoneId) {
      const activeMilestone = normalized.milestones.find(
        (milestone) => milestone.id === normalized.activeMilestoneId,
      );
      if (activeMilestone && areBuildStatesEqual(activeMilestone.build, build)) {
        return normalized;
      }

      return acknowledgeSavedBuildEdits({
        ...normalized,
        milestones: normalized.milestones.map((milestone) =>
          milestone.id === normalized.activeMilestoneId
            ? { ...milestone, build }
            : milestone,
        ),
        updatedAt: Date.now(),
      });
    }

    return touchSavedBuild(normalized, build);
  });
}

export function reorderBuildsInList(
  builds: SavedBuild[],
  fromIndex: number,
  toIndex: number,
): SavedBuild[] {
  if (
    fromIndex === toIndex ||
    fromIndex < 0 ||
    toIndex < 0 ||
    fromIndex >= builds.length ||
    toIndex >= builds.length
  ) {
    return builds;
  }

  const next = [...builds];
  const [moved] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, moved);
  return next;
}

export function migrateLegacyStorage(): BuildLibraryState | null {
  const raw = localStorage.getItem(LEGACY_STORAGE_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as { state?: { build?: BuildState } };
    const build = migrateBuildState(parsed.state?.build ?? createInitialBuildState());

    localStorage.removeItem(LEGACY_STORAGE_KEY);
    const entry = createSavedBuild(defaultBuildName(1), build);
    return {
      savedBuilds: [entry],
      activeBuildId: entry.id,
    };
  } catch {
    return null;
  }
}

export function createInitialLibrary(): BuildLibraryState {
  const build = createInitialBuildState();

  const entry = createSavedBuild(defaultBuildName(1), build);
  return {
    savedBuilds: [entry],
    activeBuildId: entry.id,
  };
}
