import { create } from "zustand";

export type SetupPicker =
  | "race"
  | "birthsign"
  | "deity"
  | "traits"
  | "major-skills"
  | "minor-skills";

export type MiddleWorkspaceView = "character-info" | "skill-trees";

export function isSkillTreeOpenInMiddlePane(state: {
  middleView: MiddleWorkspaceView;
  setupPicker: SetupPicker | null;
  characterOptionsOpen: boolean;
  variantsManagerOpen: boolean;
}): boolean {
  return (
    state.middleView === "skill-trees" &&
    state.setupPicker === null &&
    !state.characterOptionsOpen &&
    !state.variantsManagerOpen
  );
}

export type SkillWorkspaceMode = "perks" | "training";

const MIN_PERK_TREE_ZOOM = 0.5;
const MAX_PERK_TREE_ZOOM = 2.5;

function clampPerkTreeZoom(value: number): number {
  return Math.min(MAX_PERK_TREE_ZOOM, Math.max(MIN_PERK_TREE_ZOOM, value));
}

interface UiStore {
  setupPicker: SetupPicker | null;
  characterOptionsOpen: boolean;
  variantsManagerOpen: boolean;
  middleView: MiddleWorkspaceView;
  activeSkillTreeId: string | null;
  skillWorkspaceMode: SkillWorkspaceMode;
  showPerkSkillRequirements: boolean;
  perkTreeZoom: number;
  perkTreePanOffsets: Record<string, { x: number; y: number }>;
  setSetupPicker: (picker: SetupPicker | null) => void;
  toggleSetupPicker: (picker: SetupPicker) => void;
  openCharacterOptions: () => void;
  closeCharacterOptions: () => void;
  toggleCharacterOptions: () => void;
  openVariantsManager: () => void;
  closeVariantsManager: () => void;
  setMiddleView: (view: MiddleWorkspaceView) => void;
  setActiveSkillTreeId: (skillId: string | null) => void;
  openSkillTree: (skillId: string) => void;
  setSkillWorkspaceMode: (mode: SkillWorkspaceMode) => void;
  setShowPerkSkillRequirements: (show: boolean) => void;
  setPerkTreeZoom: (zoom: number) => void;
  setPerkTreePanOffset: (skillId: string, offset: { x: number; y: number }) => void;
  clearPerkTreePanOffset: (skillId: string) => void;
}

export const useUiStore = create<UiStore>((set, get) => ({
  setupPicker: null,
  characterOptionsOpen: false,
  variantsManagerOpen: false,
  middleView: "character-info",
  activeSkillTreeId: null,
  skillWorkspaceMode: "perks",
  showPerkSkillRequirements: true,
  perkTreeZoom: 1,
  perkTreePanOffsets: {},
  setSetupPicker: (picker) =>
    set({ setupPicker: picker, characterOptionsOpen: false, variantsManagerOpen: false }),
  toggleSetupPicker: (picker) => {
    const current = get().setupPicker;
    set({
      setupPicker: current === picker ? null : picker,
      characterOptionsOpen: false,
      variantsManagerOpen: false,
      middleView: "character-info",
    });
  },
  openCharacterOptions: () =>
    set({
      characterOptionsOpen: true,
      setupPicker: null,
      variantsManagerOpen: false,
      middleView: "character-info",
    }),
  closeCharacterOptions: () => set({ characterOptionsOpen: false }),
  toggleCharacterOptions: () => {
    const open = get().characterOptionsOpen;
    if (open) {
      set({ characterOptionsOpen: false });
      return;
    }
    set({
      characterOptionsOpen: true,
      setupPicker: null,
      variantsManagerOpen: false,
      middleView: "character-info",
    });
  },
  openVariantsManager: () => {
    set({
      variantsManagerOpen: true,
      setupPicker: null,
      characterOptionsOpen: false,
    });
    requestAnimationFrame(() => {
      document.getElementById("middle-workspace")?.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
    });
  },
  closeVariantsManager: () => set({ variantsManagerOpen: false }),
  setMiddleView: (view) =>
    set({
      middleView: view,
      ...(view === "skill-trees"
        ? {
            setupPicker: null,
            characterOptionsOpen: false,
            variantsManagerOpen: false,
          }
        : { skillWorkspaceMode: "perks" }),
    }),
  setActiveSkillTreeId: (skillId) => set({ activeSkillTreeId: skillId }),
  openSkillTree: (skillId) => {
    const state = get();
    if (isSkillTreeOpenInMiddlePane(state) && state.activeSkillTreeId === skillId) {
      set({ middleView: "character-info", activeSkillTreeId: null, skillWorkspaceMode: "perks" });
      return;
    }
    set({
      middleView: "skill-trees",
      activeSkillTreeId: skillId,
      setupPicker: null,
      characterOptionsOpen: false,
      variantsManagerOpen: false,
    });
  },
  setSkillWorkspaceMode: (mode) => set({ skillWorkspaceMode: mode }),
  setShowPerkSkillRequirements: (show) => set({ showPerkSkillRequirements: show }),
  setPerkTreeZoom: (zoom) => set({ perkTreeZoom: clampPerkTreeZoom(zoom) }),
  setPerkTreePanOffset: (skillId, offset) =>
    set((state) => ({
      perkTreePanOffsets: { ...state.perkTreePanOffsets, [skillId]: offset },
    })),
  clearPerkTreePanOffset: (skillId) =>
    set((state) => {
      const next = { ...state.perkTreePanOffsets };
      delete next[skillId];
      return { perkTreePanOffsets: next };
    }),
}));
