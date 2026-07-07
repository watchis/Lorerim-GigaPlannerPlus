import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { AppData } from "@/data/schemas";
import {
  allocatePerk as allocatePerkInBuild,
  applySkillLevelChange,
  applySkillTrainingRangeChange,
  canSelectMajorSkill,
  canSelectMinorSkill,
  canSelectTrait,
  computeBuild,
  createInitialBuildState,
  migrateBuildState,
  clampPlayerLevel,
  ensurePlayerLevelForBuild,
  getEarnedAttributeChoices,
  getSkillFloor,
  isAllocatableSkill,
  preserveSkillPointAllocations,
  reconcileBuild,
  removePerk as removePerkFromBuild,
  tryTakePerk as tryTakePerkInBuild,
  togglePerkSelection,
  type Attributes,
  type BuildState,
  type ComputedBuild,
} from "@/engine/buildEngine";
import {
  acknowledgeSavedBuildEdits,
  createInitialLibrary,
  createMilestone,
  createSavedBuild,
  getActiveSavedBuildBuild,
  getDefaultVariantName,
  getVariantBuild,
  getVariantCount,
  getVariantName,
  markSavedBuildImported,
  migrateLegacyStorage,
  nextBuildName,
  uniqueBuildName,
  nextMilestoneName,
  nextVariantCopyName,
  normalizeSavedBuild,
  pickMilestoneToPromote,
  promoteMilestoneToDefault,
  reorderBuildsInList,
  reorderVariantsInEntry,
  touchSavedBuild,
  updateSavedBuildInList,
  type SavedBuild,
  LIBRARY_STORAGE_KEY,
} from "@/store/savedBuilds";
import type { DecodedBuildPackage } from "@/engine/buildCodec";

function recompute(data: AppData, build: BuildState): ComputedBuild {
  return computeBuild(data.game, build);
}

function syncActiveEntryBuild(
  savedBuilds: SavedBuild[],
  activeBuildId: string,
  build: BuildState,
): SavedBuild[] {
  return updateSavedBuildInList(savedBuilds, activeBuildId, build);
}

function getActiveBuildFromPackage(decoded: DecodedBuildPackage): BuildState {
  if (!decoded.shared || decoded.shared.activeVariantIndex === 0) {
    return decoded.build;
  }

  return decoded.shared.milestones[decoded.shared.activeVariantIndex - 1]?.build ?? decoded.build;
}

function createSavedBuildFromPackage(
  game: AppData["game"],
  decoded: DecodedBuildPackage,
  name: string,
): SavedBuild {
  const { defaultVariantName, milestones, activeVariantIndex } = decoded.shared!;
  const milestoneEntries = milestones.map((milestone) =>
    createMilestone(
      milestone.name,
      reconcileBuild(game, migrateBuildState(milestone.build)),
    ),
  );
  const defaultBuild = reconcileBuild(game, migrateBuildState(decoded.build));
  const activeMilestoneId =
    activeVariantIndex > 0 ? milestoneEntries[activeVariantIndex - 1]?.id ?? null : null;

  return normalizeSavedBuild({
    ...createSavedBuild(name, defaultBuild, milestoneEntries, defaultVariantName),
    activeMilestoneId,
  });
}

interface BuildStore {
  gameData: AppData | null;
  build: BuildState;
  savedBuilds: SavedBuild[];
  activeBuildId: string;
  computed: ComputedBuild | null;
  init: (data: AppData) => void;
  setRace: (raceId: string) => void;
  setBirthsign: (birthsignId: string) => void;
  setDeity: (deityId: string) => void;
  setCharacterOptionChoice: (optionId: string, choiceId: string) => void;
  toggleTrait: (traitId: string) => void;
  toggleMajorSkill: (skillId: string) => void;
  toggleMinorSkill: (skillId: string) => void;
  adjustAttribute: (stat: keyof Attributes, delta: number) => void;
  setPlayerLevel: (level: number) => void;
  ensurePlayerLevel: () => void;
  setSkillLevel: (skillId: string, level: number) => void;
  setSkillTrainingRange: (skillId: string, tierIndex: number, count: number) => void;
  togglePerk: (perkId: string) => void;
  tryTakePerk: (perkId: string) => boolean;
  allocatePerk: (perkId: string) => boolean;
  removePerk: (perkId: string) => void;
  resetSkillPerks: (skillId: string) => void;
  resetSkillTraining: (skillId: string) => void;
  resetAllPerks: () => void;
  setDescription: (description: string) => void;
  loadBuild: (build: BuildState) => void;
  loadSharedBuild: (decoded: DecodedBuildPackage) => void;
  importSharedBuild: (decoded: DecodedBuildPackage) => void;
  resetBuild: () => void;
  createSavedBuildSlot: (name?: string) => void;
  deleteSavedBuildSlot: (id: string) => void;
  renameSavedBuildSlot: (id: string, name: string) => void;
  selectSavedBuildSlot: (id: string) => void;
  importBuildAsSlot: (
    build: BuildState,
    name?: string,
    milestones?: Array<{ name: string; build: BuildState }>,
    defaultVariantName?: string,
  ) => void;
  importBuildLibrary: (
    entries: Array<{
      name: string;
      build: BuildState;
      milestones?: Array<{ name: string; build: BuildState }>;
      defaultVariantName?: string;
      updatedAt?: number;
    }>,
  ) => void;
  reorderSavedBuildSlot: (fromIndex: number, toIndex: number) => void;
  selectMilestone: (milestoneId: string | null) => void;
  createVariant: (name?: string) => void;
  copyVariant: (variantId: string | null) => void;
  importVariant: (build: BuildState, name?: string) => void;
  deleteActiveVariant: () => void;
  renameActiveVariant: (name: string) => void;
  deleteVariant: (variantId: string | null) => void;
  renameVariant: (variantId: string | null, name: string) => void;
  reorderVariants: (fromIndex: number, toIndex: number) => void;
}

function getActiveEntry(savedBuilds: SavedBuild[], activeBuildId: string): SavedBuild | undefined {
  const entry = savedBuilds.find((b) => b.id === activeBuildId);
  return entry ? normalizeSavedBuild(entry) : undefined;
}

function updateActiveEntry(
  savedBuilds: SavedBuild[],
  activeBuildId: string,
  updater: (entry: SavedBuild) => SavedBuild,
): SavedBuild[] {
  return savedBuilds.map((entry) =>
    entry.id === activeBuildId ? updater(normalizeSavedBuild(entry)) : normalizeSavedBuild(entry),
  );
}

function commitBuild(
  set: (partial: Partial<BuildStore>) => void,
  get: () => BuildStore,
  nextBuild: BuildState,
): void {
  const { gameData, savedBuilds, activeBuildId } = get();
  if (!gameData) return;

  set({
    build: nextBuild,
    savedBuilds: updateSavedBuildInList(savedBuilds, activeBuildId, nextBuild),
    computed: recompute(gameData, nextBuild),
  });
}

function commitMainBuild(
  set: (partial: Partial<BuildStore>) => void,
  get: () => BuildStore,
  nextBuild: BuildState,
): void {
  const { gameData, savedBuilds, activeBuildId } = get();
  if (!gameData) return;

  const syncedBuilds = syncActiveEntryBuild(savedBuilds, activeBuildId, get().build);
  const nextBuilds = updateActiveEntry(syncedBuilds, activeBuildId, (entry) => ({
    ...touchSavedBuild({ ...entry, activeMilestoneId: null }, nextBuild),
    activeMilestoneId: null,
  }));

  set({
    build: nextBuild,
    savedBuilds: nextBuilds,
    computed: recompute(gameData, nextBuild),
  });
}

function activateBuild(
  set: (partial: Partial<BuildStore>) => void,
  get: () => BuildStore,
  buildId: string,
  savedBuilds: SavedBuild[],
): void {
  const { gameData } = get();
  const entry = getActiveEntry(savedBuilds, buildId);
  if (!entry || !gameData) return;

  const build = getActiveSavedBuildBuild(entry);
  set({
    activeBuildId: buildId,
    build,
    savedBuilds: savedBuilds.map((item) => normalizeSavedBuild(item)),
    computed: recompute(gameData, build),
  });
}

export const useBuildStore = create<BuildStore>()(
  persist(
    (set, get) => {
      const initialLibrary = migrateLegacyStorage() ?? createInitialLibrary();
      const activeEntry =
        initialLibrary.savedBuilds.find((b) => b.id === initialLibrary.activeBuildId) ??
        initialLibrary.savedBuilds[0];

      return {
        gameData: null,
        build: activeEntry?.build ?? createInitialBuildState(),
        savedBuilds: initialLibrary.savedBuilds,
        activeBuildId: activeEntry?.id ?? initialLibrary.activeBuildId,
        computed: null,

        init: (data) => {
          const { build } = get();
          const baseLevel = data.game.mechanics.leveling.baseLevel;
          const migratedBuild = reconcileBuild(data.game, migrateBuildState({
            ...build,
            playerLevel: build.playerLevel ?? baseLevel,
            characterOptionChoices: build.characterOptionChoices ?? {},
          }));
          set({ gameData: data, build: migratedBuild, computed: recompute(data, migratedBuild) });
        },

        setRace: (raceId) => {
          const { gameData, build } = get();
          if (!gameData) return;
          const previous = reconcileBuild(gameData.game, build);
          const candidate = { ...previous, raceId };
          const preserved = preserveSkillPointAllocations(gameData.game, previous, candidate);
          const reconciled = reconcileBuild(gameData.game, preserved);
          const leveled = ensurePlayerLevelForBuild(gameData.game, reconciled, {
            ensureMinimumPlayerLevel: true,
          });
          commitBuild(set, get, leveled);
        },

        setBirthsign: (birthsignId) => {
          const { build } = get();
          commitBuild(set, get, { ...build, birthsignId });
        },

        setDeity: (deityId) => {
          const { build } = get();
          commitBuild(set, get, { ...build, deityId });
        },

        setCharacterOptionChoice: (optionId, choiceId) => {
          const { gameData, build } = get();
          if (!gameData) return;

          const option = gameData.game.characterOptions.find((entry) => entry.id === optionId);
          if (!option || !option.choices.some((choice) => choice.id === choiceId)) return;

          const characterOptionChoices = {
            ...build.characterOptionChoices,
            [optionId]: choiceId,
          };

          commitBuild(
            set,
            get,
            reconcileBuild(gameData.game, { ...build, characterOptionChoices }),
          );
        },

        toggleTrait: (traitId) => {
          const { gameData, build } = get();
          if (!gameData) return;

          let traitIds = [...build.traitIds];
          if (traitIds.includes(traitId)) {
            traitIds = traitIds.filter((id) => id !== traitId);
          } else if (canSelectTrait(gameData.game, build, traitId)) {
            traitIds.push(traitId);
          }

          commitBuild(
            set,
            get,
            reconcileBuild(gameData.game, { ...build, traitIds }),
          );
        },

        toggleMajorSkill: (skillId) => {
          const { gameData, build } = get();
          if (!gameData) return;

          let majorSkillIds = [...build.majorSkillIds];
          if (majorSkillIds.includes(skillId)) {
            majorSkillIds = majorSkillIds.filter((id) => id !== skillId);
          } else if (canSelectMajorSkill(gameData.game, build, skillId)) {
            majorSkillIds.push(skillId);
          }

          // Keep absolute skill levels — major/minor only changes the floor bonus, not invested levels.
          const previous = reconcileBuild(gameData.game, build);
          const candidate = { ...previous, majorSkillIds };
          const preserved = preserveSkillPointAllocations(gameData.game, previous, candidate);
          const reconciled = reconcileBuild(gameData.game, preserved);
          const leveled = ensurePlayerLevelForBuild(gameData.game, reconciled, {
            ensureMinimumPlayerLevel: true,
          });
          commitBuild(set, get, leveled);
        },

        toggleMinorSkill: (skillId) => {
          const { gameData, build } = get();
          if (!gameData) return;

          let minorSkillIds = [...build.minorSkillIds];
          if (minorSkillIds.includes(skillId)) {
            minorSkillIds = minorSkillIds.filter((id) => id !== skillId);
          } else if (canSelectMinorSkill(gameData.game, build, skillId)) {
            minorSkillIds.push(skillId);
          }

          const previous = reconcileBuild(gameData.game, build);
          const candidate = { ...previous, minorSkillIds };
          const preserved = preserveSkillPointAllocations(gameData.game, previous, candidate);
          const reconciled = reconcileBuild(gameData.game, preserved);
          const leveled = ensurePlayerLevelForBuild(gameData.game, reconciled, {
            ensureMinimumPlayerLevel: true,
          });
          commitBuild(set, get, leveled);
        },

        adjustAttribute: (stat, delta) => {
          const { gameData, build } = get();
          if (!gameData) return;

          const current = build.attributeBonus[stat];
          const nextValue = current + delta;
          if (nextValue < 0) return;

          const totalUsed =
            build.attributeBonus.health +
            build.attributeBonus.magicka +
            build.attributeBonus.stamina -
            current +
            nextValue;
          if (totalUsed > getEarnedAttributeChoices(gameData.game, build)) return;

          commitBuild(set, get, {
            ...build,
            attributeBonus: { ...build.attributeBonus, [stat]: nextValue },
          });
        },

        setPlayerLevel: (level) => {
          const { gameData, build } = get();
          if (!gameData) return;

          const playerLevel = clampPlayerLevel(gameData.game, level);
          const nextBuild = reconcileBuild(gameData.game, { ...build, playerLevel });
          commitBuild(set, get, nextBuild);
        },

        ensurePlayerLevel: () => {
          const { gameData, build } = get();
          if (!gameData) return;

          const nextBuild = ensurePlayerLevelForBuild(gameData.game, build, {
            ensureMinimumPlayerLevel: true,
          });
          commitBuild(set, get, nextBuild);
        },

        setSkillLevel: (skillId, level) => {
          const { gameData, build } = get();
          if (!gameData) return;

          const nextBuild = applySkillLevelChange(gameData.game, build, skillId, level);
          commitBuild(set, get, nextBuild);
        },

        setSkillTrainingRange: (skillId, tierIndex, count) => {
          const { gameData, build } = get();
          if (!gameData) return;

          const nextBuild = applySkillTrainingRangeChange(
            gameData.game,
            build,
            skillId,
            tierIndex,
            count,
          );
          commitBuild(set, get, nextBuild);
        },

        togglePerk: (perkId) => {
          const { gameData, build } = get();
          if (!gameData) return;

          const next = togglePerkSelection(gameData.game, build, perkId);
          if (next) {
            commitBuild(set, get, next);
          }
        },

        tryTakePerk: (perkId) => {
          const { gameData, build } = get();
          if (!gameData) return false;

          const next = tryTakePerkInBuild(gameData.game, build, perkId);
          if (!next) return false;

          commitBuild(set, get, next);
          return true;
        },

        allocatePerk: (perkId) => {
          const { gameData, build } = get();
          if (!gameData) return false;

          const next = allocatePerkInBuild(gameData.game, build, perkId);
          if (!next) return false;

          commitBuild(set, get, next);
          return true;
        },

        removePerk: (perkId) => {
          const { gameData, build } = get();
          if (!gameData) return;

          commitBuild(set, get, removePerkFromBuild(gameData.game, build, perkId));
        },

        resetSkillPerks: (skillId) => {
          const { gameData, build } = get();
          if (!gameData) return;

          const tree = gameData.game.perkTrees[skillId];
          if (!tree) return;

          const floor = getSkillFloor(gameData.game, build, skillId);
          const skillPerkIds = new Set(tree.perks.map((p) => p.id));
          const selectedPerkIds = build.selectedPerkIds.filter((id) => !skillPerkIds.has(id));
          const skillTrainingRanges = { ...build.skillTrainingRanges };
          delete skillTrainingRanges[skillId];
          commitBuild(
            set,
            get,
            reconcileBuild(gameData.game, {
              ...build,
              selectedPerkIds,
              skillLevels: { ...build.skillLevels, [skillId]: floor },
              skillTrainingRanges,
            }),
          );
        },

        resetSkillTraining: (skillId) => {
          const { gameData, build } = get();
          if (!gameData) return;

          const skillTrainingRanges = { ...build.skillTrainingRanges };
          delete skillTrainingRanges[skillId];

          commitBuild(
            set,
            get,
            reconcileBuild(gameData.game, {
              ...build,
              skillTrainingRanges,
            }),
          );
        },

        resetAllPerks: () => {
          const { gameData, build } = get();
          if (!gameData) return;

          const skillLevels = { ...build.skillLevels };
          const skillTrainingRanges = { ...build.skillTrainingRanges };
          for (const skillId of gameData.game.manifest.skills) {
            if (!isAllocatableSkill(gameData.game, skillId)) continue;
            skillLevels[skillId] = getSkillFloor(gameData.game, build, skillId);
            delete skillTrainingRanges[skillId];
          }

          commitBuild(
            set,
            get,
            reconcileBuild(gameData.game, {
              ...build,
              selectedPerkIds: [],
              skillLevels,
              skillTrainingRanges,
            }),
          );
        },

        setDescription: (description) => {
          const { build } = get();
          commitBuild(set, get, { ...build, description });
        },

        loadBuild: (build) => {
          const { gameData } = get();
          if (!gameData) return;
          commitMainBuild(set, get, reconcileBuild(gameData.game, migrateBuildState(build)));
        },

        loadSharedBuild: (decoded) => {
          const { gameData, savedBuilds, activeBuildId } = get();
          if (!gameData) return;

          if (!decoded.shared) {
            get().loadBuild(decoded.build);
            return;
          }

          const activeBuild = getActiveBuildFromPackage(decoded);
          const entryName = decoded.shared.name.trim();
          const nextBuilds = savedBuilds.map((entry) => {
            if (entry.id !== activeBuildId) return normalizeSavedBuild(entry);
            return {
              ...createSavedBuildFromPackage(
                gameData.game,
                decoded,
                entryName || entry.name,
              ),
              id: entry.id,
              updatedAt: Date.now(),
            };
          });

          set({
            savedBuilds: nextBuilds,
            build: reconcileBuild(gameData.game, migrateBuildState(activeBuild)),
            computed: recompute(
              gameData,
              reconcileBuild(gameData.game, migrateBuildState(activeBuild)),
            ),
          });
        },

        importSharedBuild: (decoded) => {
          const { gameData, savedBuilds, build, activeBuildId } = get();
          if (!gameData) return;

          if (!decoded.shared) {
            get().importBuildAsSlot(decoded.build);
            return;
          }

          const syncedBuilds = updateSavedBuildInList(savedBuilds, activeBuildId, build);
          const activeBuild = getActiveBuildFromPackage(decoded);
          const newEntry = markSavedBuildImported(
            createSavedBuildFromPackage(
              gameData.game,
              decoded,
              uniqueBuildName(decoded.shared.name, syncedBuilds),
            ),
          );

          set({
            savedBuilds: [...syncedBuilds, newEntry],
            activeBuildId: newEntry.id,
            build: reconcileBuild(gameData.game, migrateBuildState(activeBuild)),
            computed: recompute(
              gameData,
              reconcileBuild(gameData.game, migrateBuildState(activeBuild)),
            ),
          });
        },

        resetBuild: () => {
          commitMainBuild(set, get, createInitialBuildState());
        },

        createSavedBuildSlot: (name) => {
          const { savedBuilds, build, activeBuildId, gameData } = get();
          if (!gameData) return;

          const syncedBuilds = updateSavedBuildInList(savedBuilds, activeBuildId, build);
          const freshBuild = createInitialBuildState();
          const newEntry = createSavedBuild(name?.trim() || nextBuildName(syncedBuilds), freshBuild);

          set({
            savedBuilds: [...syncedBuilds, newEntry],
            activeBuildId: newEntry.id,
            build: freshBuild,
            computed: recompute(gameData, freshBuild),
          });
        },

        deleteSavedBuildSlot: (id) => {
          const { savedBuilds, activeBuildId, build, gameData } = get();
          if (!gameData || savedBuilds.length <= 1) return;

          const syncedBuilds = updateSavedBuildInList(savedBuilds, activeBuildId, build);
          const remaining = syncedBuilds.filter((entry) => entry.id !== id);
          if (remaining.length === 0) return;

          const nextActive =
            id === activeBuildId ? remaining[0] : remaining.find((entry) => entry.id === activeBuildId)!;

          set({
            savedBuilds: remaining,
            activeBuildId: nextActive.id,
            build: nextActive.build,
            computed: recompute(gameData, nextActive.build),
          });
        },

        renameSavedBuildSlot: (id, name) => {
          const trimmed = name.trim();
          if (!trimmed) return;

          const { savedBuilds } = get();
          set({
            savedBuilds: savedBuilds.map((entry) =>
              entry.id === id ? { ...entry, name: trimmed, updatedAt: Date.now() } : entry,
            ),
          });
        },

        selectSavedBuildSlot: (id) => {
          const { savedBuilds, activeBuildId, build } = get();
          if (id === activeBuildId) return;

          const syncedBuilds = updateSavedBuildInList(savedBuilds, activeBuildId, build);
          activateBuild(set, get, id, syncedBuilds);
        },

        importBuildAsSlot: (importedBuild, name, importedMilestones = [], defaultVariantName) => {
          const { savedBuilds, build, activeBuildId, gameData } = get();
          if (!gameData) return;

          const syncedBuilds = updateSavedBuildInList(savedBuilds, activeBuildId, build);
          const milestones = importedMilestones.map((entry) =>
            createMilestone(entry.name, reconcileBuild(gameData.game, entry.build)),
          );
          const newEntry = markSavedBuildImported(
            createSavedBuild(
              uniqueBuildName(name ?? "", syncedBuilds),
              importedBuild,
              milestones,
              defaultVariantName,
            ),
          );

          set({
            savedBuilds: [...syncedBuilds, newEntry],
            activeBuildId: newEntry.id,
            build: importedBuild,
            computed: recompute(gameData, importedBuild),
          });
        },

        importBuildLibrary: (entries) => {
          const { gameData } = get();
          if (!gameData || entries.length === 0) return;

          const imported = entries.map((entry) => {
            const milestones = (entry.milestones ?? []).map((milestone) =>
              createMilestone(
                milestone.name,
                reconcileBuild(gameData.game, milestone.build),
              ),
            );
            return createSavedBuild(
              entry.name,
              entry.build,
              milestones,
              entry.defaultVariantName,
            );
          });
          for (let i = 0; i < imported.length; i += 1) {
            if (entries[i]?.defaultVariantName) {
              imported[i] = {
                ...imported[i],
                defaultVariantName: entries[i].defaultVariantName!.trim() || imported[i].defaultVariantName,
              };
            }
            if (entries[i]?.updatedAt) {
              imported[i] = { ...imported[i], updatedAt: entries[i].updatedAt! };
            }
          }

          const active = imported[0];
          set({
            savedBuilds: imported,
            activeBuildId: active.id,
            build: active.build,
            computed: recompute(gameData, active.build),
          });
        },

        reorderSavedBuildSlot: (fromIndex, toIndex) => {
          const { savedBuilds, activeBuildId, build } = get();
          const syncedBuilds = updateSavedBuildInList(savedBuilds, activeBuildId, build);
          set({ savedBuilds: reorderBuildsInList(syncedBuilds, fromIndex, toIndex) });
        },

        selectMilestone: (milestoneId) => {
          const { gameData, savedBuilds, activeBuildId, build } = get();
          if (!gameData) return;

          const syncedBuilds = syncActiveEntryBuild(savedBuilds, activeBuildId, build);
          const entry = getActiveEntry(syncedBuilds, activeBuildId);
          if (!entry) return;

          if (milestoneId && !entry.milestones.some((m) => m.id === milestoneId)) return;

          const nextEntry: SavedBuild = {
            ...entry,
            activeMilestoneId: milestoneId,
          };
          const nextBuild = getActiveSavedBuildBuild(nextEntry);
          const nextBuilds = updateActiveEntry(syncedBuilds, activeBuildId, () => nextEntry);

          set({
            savedBuilds: nextBuilds,
            build: nextBuild,
            computed: recompute(gameData, nextBuild),
          });
        },

        createVariant: (name) => {
          const { gameData, savedBuilds, activeBuildId, build } = get();
          if (!gameData) return;

          const syncedBuilds = syncActiveEntryBuild(savedBuilds, activeBuildId, build);
          const entry = getActiveEntry(syncedBuilds, activeBuildId);
          if (!entry) return;

          const freshBuild = reconcileBuild(gameData.game, createInitialBuildState());
          const milestoneName =
            name?.trim() ||
            nextMilestoneName(
              entry.milestones,
              freshBuild.playerLevel,
              getDefaultVariantName(entry),
            );
          const milestone = createMilestone(milestoneName, freshBuild);

          const nextEntry: SavedBuild = acknowledgeSavedBuildEdits({
            ...entry,
            milestones: [...entry.milestones, milestone],
            activeMilestoneId: milestone.id,
            updatedAt: Date.now(),
          });
          const nextBuilds = updateActiveEntry(syncedBuilds, activeBuildId, () => nextEntry);

          set({
            savedBuilds: nextBuilds,
            build: milestone.build,
            computed: recompute(gameData, milestone.build),
          });
        },

        copyVariant: (variantId) => {
          const { gameData, savedBuilds, activeBuildId, build } = get();
          if (!gameData) return;

          const syncedBuilds = syncActiveEntryBuild(savedBuilds, activeBuildId, build);
          const entry = getActiveEntry(syncedBuilds, activeBuildId);
          if (!entry) return;

          const sourceName = getVariantName(entry, variantId);
          const milestoneName = nextVariantCopyName(sourceName, entry);
          const milestone = createMilestone(
            milestoneName,
            reconcileBuild(gameData.game, getVariantBuild(entry, variantId)),
          );

          const nextEntry: SavedBuild = acknowledgeSavedBuildEdits({
            ...entry,
            milestones: [...entry.milestones, milestone],
            activeMilestoneId: milestone.id,
            updatedAt: Date.now(),
          });
          const nextBuilds = updateActiveEntry(syncedBuilds, activeBuildId, () => nextEntry);

          set({
            savedBuilds: nextBuilds,
            build: milestone.build,
            computed: recompute(gameData, milestone.build),
          });
        },

        importVariant: (importedBuild, name) => {
          const { gameData, savedBuilds, activeBuildId, build } = get();
          if (!gameData) return;

          const syncedBuilds = syncActiveEntryBuild(savedBuilds, activeBuildId, build);
          const entry = getActiveEntry(syncedBuilds, activeBuildId);
          if (!entry) return;

          const reconciled = reconcileBuild(gameData.game, importedBuild);
          const milestoneName =
            name?.trim() ||
            nextMilestoneName(
              entry.milestones,
              reconciled.playerLevel,
              getDefaultVariantName(entry),
            );
          const milestone = createMilestone(milestoneName, reconciled);

          const nextEntry: SavedBuild = acknowledgeSavedBuildEdits({
            ...entry,
            milestones: [...entry.milestones, milestone],
            activeMilestoneId: milestone.id,
            updatedAt: Date.now(),
          });
          const nextBuilds = updateActiveEntry(syncedBuilds, activeBuildId, () => nextEntry);

          set({
            savedBuilds: nextBuilds,
            build: milestone.build,
            computed: recompute(gameData, milestone.build),
          });
        },

        deleteActiveVariant: () => {
          const { savedBuilds, activeBuildId } = get();
          const entry = getActiveEntry(savedBuilds, activeBuildId);
          if (!entry) return;
          get().deleteVariant(entry.activeMilestoneId);
        },

        renameActiveVariant: (name) => {
          const { savedBuilds, activeBuildId } = get();
          const entry = getActiveEntry(savedBuilds, activeBuildId);
          if (!entry) return;
          get().renameVariant(entry.activeMilestoneId, name);
        },

        deleteVariant: (variantId) => {
          const { gameData, savedBuilds, activeBuildId, build } = get();
          if (!gameData) return;

          const syncedBuilds = syncActiveEntryBuild(savedBuilds, activeBuildId, build);
          const entry = getActiveEntry(syncedBuilds, activeBuildId);
          if (!entry || getVariantCount(entry) <= 1) return;

          let nextEntry: SavedBuild;

          if (variantId === null) {
            const toPromote = pickMilestoneToPromote(entry.milestones);
            if (!toPromote) return;
            nextEntry = acknowledgeSavedBuildEdits({
              ...promoteMilestoneToDefault(entry, toPromote.id),
              updatedAt: Date.now(),
            });
          } else {
            const wasActive = entry.activeMilestoneId === variantId;
            nextEntry = acknowledgeSavedBuildEdits({
              ...entry,
              milestones: entry.milestones.filter((m) => m.id !== variantId),
              activeMilestoneId: wasActive ? null : entry.activeMilestoneId,
              updatedAt: Date.now(),
            });
          }

          const nextBuilds = updateActiveEntry(syncedBuilds, activeBuildId, () => nextEntry);
          const activeChanged =
            (variantId === null && entry.activeMilestoneId === null) ||
            (variantId !== null && entry.activeMilestoneId === variantId);

          if (activeChanged) {
            const nextBuild = getActiveSavedBuildBuild(nextEntry);
            set({
              savedBuilds: nextBuilds,
              build: nextBuild,
              computed: recompute(gameData, nextBuild),
            });
            return;
          }

          set({ savedBuilds: nextBuilds });
        },

        renameVariant: (variantId, name) => {
          const trimmed = name.trim();
          if (!trimmed) return;

          const { savedBuilds, activeBuildId } = get();
          set({
            savedBuilds: updateActiveEntry(savedBuilds, activeBuildId, (current) => {
              if (variantId === null) {
                return acknowledgeSavedBuildEdits({
                  ...current,
                  defaultVariantName: trimmed,
                  updatedAt: Date.now(),
                });
              }

              return acknowledgeSavedBuildEdits({
                ...current,
                milestones: current.milestones.map((milestone) =>
                  milestone.id === variantId ? { ...milestone, name: trimmed } : milestone,
                ),
                updatedAt: Date.now(),
              });
            }),
          });
        },

        reorderVariants: (fromIndex, toIndex) => {
          const { savedBuilds, activeBuildId, build } = get();
          const syncedBuilds = syncActiveEntryBuild(savedBuilds, activeBuildId, build);

          set({
            savedBuilds: updateActiveEntry(syncedBuilds, activeBuildId, (entry) => ({
              ...reorderVariantsInEntry(entry, fromIndex, toIndex),
              updatedAt: Date.now(),
            })),
          });
        },
      };
    },
    {
      name: LIBRARY_STORAGE_KEY,
      partialize: (state) => ({
        build: state.build,
        savedBuilds: state.savedBuilds,
        activeBuildId: state.activeBuildId,
      }),
      onRehydrateStorage: () => (state) => {
        if (!state?.gameData) return;
        state.savedBuilds = state.savedBuilds.map((entry) => {
          const normalized = normalizeSavedBuild(entry);
          return {
            ...normalized,
            build: migrateBuildState(normalized.build),
            milestones: normalized.milestones.map((milestone) => ({
              ...milestone,
              build: migrateBuildState(milestone.build),
            })),
          };
        });
        if (state.build.raceId === null) {
          state.build = { ...state.build, raceId: "none" };
        }
        const baseLevel = state.gameData.game.mechanics.leveling.baseLevel;
        if (state.build.playerLevel == null || Number.isNaN(state.build.playerLevel)) {
          state.build = { ...state.build, playerLevel: baseLevel };
        }
        const activeEntry = getActiveEntry(state.savedBuilds, state.activeBuildId);
        if (activeEntry) {
          state.build = getActiveSavedBuildBuild(activeEntry);
        }
        state.build = reconcileBuild(state.gameData.game, migrateBuildState(state.build));
        state.computed = recompute(state.gameData, state.build);
      },
    },
  ),
);
