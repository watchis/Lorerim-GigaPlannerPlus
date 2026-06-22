import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { AppData } from "@/data/schemas";
import {
  allocatePerk as allocatePerkInBuild,
  canSelectMajorSkill,
  canSelectMinorSkill,
  canSelectTrait,
  computeBuild,
  createInitialBuildState,
  createSkillReqConflict,
  clampPlayerLevel,
  getPerksDroppedBelowSkillRequirement,
  getSkillFloor,
  isAllocatableSkill,
  reconcileBuild,
  removePerk as removePerkFromBuild,
  tryTakePerk as tryTakePerkInBuild,
  togglePerkSelection,
  type Attributes,
  type BuildState,
  type ComputedBuild,
  type SkillReqConflict,
} from "@/engine/buildEngine";
import { useUiStore } from "@/store/uiStore";
import {
  createInitialLibrary,
  createSavedBuild,
  migrateLegacyStorage,
  nextBuildName,
  reorderBuildsInList,
  updateSavedBuildInList,
  type SavedBuild,
  LIBRARY_STORAGE_KEY,
} from "@/store/savedBuilds";

interface BuildStore {
  gameData: AppData | null;
  build: BuildState;
  savedBuilds: SavedBuild[];
  activeBuildId: string;
  computed: ComputedBuild | null;
  skillReqConflict: SkillReqConflict | null;
  init: (data: AppData) => void;
  setRace: (raceId: string) => void;
  setStandingStone: (stoneId: string) => void;
  setBlessing: (blessingId: string) => void;
  toggleTrait: (traitId: string) => void;
  toggleMajorSkill: (skillId: string) => void;
  toggleMinorSkill: (skillId: string) => void;
  adjustAttribute: (stat: keyof Attributes, delta: number) => void;
  setPlayerLevel: (level: number) => void;
  setSkillLevel: (skillId: string, level: number) => void;
  togglePerk: (perkId: string) => void;
  tryTakePerk: (perkId: string) => boolean;
  allocatePerk: (perkId: string) => boolean;
  removePerk: (perkId: string) => void;
  resetSkillPerks: (skillId: string) => void;
  resetAllPerks: () => void;
  setDescription: (description: string) => void;
  loadBuild: (build: BuildState) => void;
  resetBuild: () => void;
  createSavedBuildSlot: (name?: string) => void;
  deleteSavedBuildSlot: (id: string) => void;
  renameSavedBuildSlot: (id: string, name: string) => void;
  selectSavedBuildSlot: (id: string) => void;
  importBuildAsSlot: (build: BuildState, name?: string) => void;
  importBuildLibrary: (entries: Array<{ name: string; build: BuildState; updatedAt?: number }>) => void;
  reorderSavedBuildSlot: (fromIndex: number, toIndex: number) => void;
  clearSkillReqConflict: () => void;
}

function recompute(data: AppData, build: BuildState): ComputedBuild {
  return computeBuild(data.game, build);
}

function commitBuild(
  set: (partial: Partial<BuildStore>) => void,
  get: () => BuildStore,
  nextBuild: BuildState,
  skillReqConflict?: SkillReqConflict | null,
): void {
  const { gameData, savedBuilds, activeBuildId } = get();
  if (!gameData) return;

  set({
    build: nextBuild,
    savedBuilds: updateSavedBuildInList(savedBuilds, activeBuildId, nextBuild),
    computed: recompute(gameData, nextBuild),
    ...(skillReqConflict !== undefined ? { skillReqConflict } : {}),
  });
}

function focusSkillReqConflict(conflict: SkillReqConflict): void {
  const { setMiddleView, setActiveSkillTreeId } = useUiStore.getState();
  setMiddleView("skill-trees");
  setActiveSkillTreeId(conflict.skillId);
}

function resolveSkillReqConflict(
  game: AppData["game"],
  previousBuild: BuildState,
  nextBuild: BuildState,
): SkillReqConflict | null {
  const dropped = getPerksDroppedBelowSkillRequirement(game, previousBuild, nextBuild);
  const conflict = createSkillReqConflict(game, nextBuild, dropped);
  if (conflict) {
    focusSkillReqConflict(conflict);
  }
  return conflict;
}

function activateBuild(
  set: (partial: Partial<BuildStore>) => void,
  get: () => BuildStore,
  buildId: string,
  savedBuilds: SavedBuild[],
): void {
  const { gameData } = get();
  const entry = savedBuilds.find((b) => b.id === buildId);
  if (!entry || !gameData) return;

  set({
    activeBuildId: buildId,
    build: entry.build,
    savedBuilds,
    computed: recompute(gameData, entry.build),
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
        skillReqConflict: null,

        init: (data) => {
          const { build } = get();
          const baseLevel = data.game.mechanics.leveling.baseLevel;
          const migratedBuild = reconcileBuild(data.game, {
            ...build,
            playerLevel: build.playerLevel ?? baseLevel,
          });
          set({ gameData: data, build: migratedBuild, computed: recompute(data, migratedBuild) });
        },

        setRace: (raceId) => {
          const { gameData, build } = get();
          if (!gameData) return;
          commitBuild(set, get, reconcileBuild(gameData.game, { ...build, raceId }));
        },

        setStandingStone: (stoneId) => {
          const { build } = get();
          commitBuild(set, get, { ...build, standingStoneId: stoneId });
        },

        setBlessing: (blessingId) => {
          const { build } = get();
          commitBuild(set, get, { ...build, blessingId });
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

          commitBuild(set, get, reconcileBuild(gameData.game, { ...build, majorSkillIds }));
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

          commitBuild(set, get, reconcileBuild(gameData.game, { ...build, minorSkillIds }));
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
          if (totalUsed > gameData.game.manifest.limits.initialAttributePoints) return;

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
          const conflict = resolveSkillReqConflict(gameData.game, build, nextBuild);

          commitBuild(set, get, nextBuild, conflict);
        },

        setSkillLevel: (skillId, level) => {
          const { gameData, build } = get();
          if (!gameData) return;

          const skillLevels = {
            ...build.skillLevels,
            [skillId]: level,
          };

          const nextBuild = reconcileBuild(gameData.game, { ...build, skillLevels });
          const conflict = resolveSkillReqConflict(gameData.game, build, nextBuild);

          commitBuild(set, get, nextBuild, conflict);
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
          commitBuild(
            set,
            get,
            reconcileBuild(gameData.game, {
              ...build,
              selectedPerkIds,
              skillLevels: { ...build.skillLevels, [skillId]: floor },
            }),
          );
        },

        resetAllPerks: () => {
          const { gameData, build } = get();
          if (!gameData) return;

          const skillLevels = { ...build.skillLevels };
          for (const skillId of gameData.game.manifest.skills) {
            if (!isAllocatableSkill(gameData.game, skillId)) continue;
            skillLevels[skillId] = getSkillFloor(gameData.game, build, skillId);
          }

          commitBuild(
            set,
            get,
            reconcileBuild(gameData.game, { ...build, selectedPerkIds: [], skillLevels }),
          );
        },

        setDescription: (description) => {
          const { build } = get();
          commitBuild(set, get, { ...build, description });
        },

        loadBuild: (build) => {
          commitBuild(set, get, build);
        },

        resetBuild: () => {
          commitBuild(set, get, createInitialBuildState());
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

        importBuildAsSlot: (importedBuild, name) => {
          const { savedBuilds, build, activeBuildId, gameData } = get();
          if (!gameData) return;

          const syncedBuilds = updateSavedBuildInList(savedBuilds, activeBuildId, build);
          const newEntry = createSavedBuild(
            name?.trim() || nextBuildName(syncedBuilds),
            importedBuild,
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

          const imported = entries.map((entry) =>
            createSavedBuild(entry.name, entry.build),
          );
          for (let i = 0; i < imported.length; i += 1) {
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

        clearSkillReqConflict: () => set({ skillReqConflict: null }),
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
        if (state.build.raceId === null) {
          state.build = { ...state.build, raceId: "none" };
        }
        const baseLevel = state.gameData.game.mechanics.leveling.baseLevel;
        if (state.build.playerLevel == null || Number.isNaN(state.build.playerLevel)) {
          state.build = { ...state.build, playerLevel: baseLevel };
        }
        state.build = reconcileBuild(state.gameData.game, state.build);
        state.computed = recompute(state.gameData, state.build);
      },
    },
  ),
);
