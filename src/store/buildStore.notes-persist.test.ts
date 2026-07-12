import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { encodeSavedBuild } from "@/engine/buildCodec";
import { getTestAppData } from "@/test/helpers";
import { getVariantNotes, LIBRARY_STORAGE_KEY } from "@/store/savedBuilds";

function createLocalStorageMock(): Storage {
  const store = new Map<string, string>();
  return {
    get length() {
      return store.size;
    },
    clear: () => store.clear(),
    getItem: (key: string) => store.get(key) ?? null,
    key: (index: number) => [...store.keys()][index] ?? null,
    removeItem: (key: string) => {
      store.delete(key);
    },
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
  };
}

async function importBuildStore() {
  const storage = createLocalStorageMock();
  vi.stubGlobal("localStorage", storage);
  vi.stubGlobal("window", { localStorage: storage });
  const { useBuildStore } = await import("@/store/buildStore");
  return { useBuildStore, storage };
}

describe("buildStore variant notes persistence", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it("persists variant notes to localStorage after setVariantNotes", async () => {
    const { useBuildStore } = await importBuildStore();
    const appData = getTestAppData();

    useBuildStore.getState().init(appData);
    useBuildStore.getState().setVariantNotes(null, "Saved default note");

    const stored = window.localStorage.getItem(LIBRARY_STORAGE_KEY);
    expect(stored).toBeTruthy();

    const parsed = JSON.parse(stored!) as {
      state: {
        savedBuilds: Array<{ id: string; defaultVariantNotes?: string }>;
        activeBuildId: string;
      };
    };

    const activeEntry = parsed.state.savedBuilds.find(
      (entry) => entry.id === parsed.state.activeBuildId,
    );
    expect(activeEntry?.defaultVariantNotes).toBe("Saved default note");
  });

  it("keeps variant notes after reload", async () => {
    const storage = createLocalStorageMock();
    vi.stubGlobal("localStorage", storage);
    vi.stubGlobal("window", { localStorage: storage });

    const { useBuildStore } = await import("@/store/buildStore");
    const appData = getTestAppData();

    useBuildStore.getState().init(appData);
    const { activeBuildId } = useBuildStore.getState();
    useBuildStore.getState().setVariantNotes(null, "Note survives reload");

    vi.resetModules();
    vi.stubGlobal("localStorage", storage);
    vi.stubGlobal("window", { localStorage: storage });

    const { useBuildStore: reloadedStore } = await import("@/store/buildStore");
    reloadedStore.getState().init(appData);

    const entry = reloadedStore
      .getState()
      .savedBuilds.find((item) => item.id === activeBuildId);

    expect(entry?.defaultVariantNotes).toBe("Note survives reload");
  });

  it("does not drop notes when commitBuild runs after setVariantNotes", async () => {
    const { useBuildStore } = await importBuildStore();
    const appData = getTestAppData();

    useBuildStore.getState().init(appData);
    useBuildStore.getState().setVariantNotes(null, "Note with perk change");
    useBuildStore.getState().toggleTrait(appData.game.traits[0]!.id);

    const entry = useBuildStore
      .getState()
      .savedBuilds.find((item) => item.id === useBuildStore.getState().activeBuildId);

    expect(entry?.defaultVariantNotes).toBe("Note with perk change");
  });

  it("keeps local notes when loadSharedBuild applies a URL code without notes", async () => {
    const { useBuildStore } = await importBuildStore();
    const appData = getTestAppData();

    useBuildStore.getState().init(appData);

    const entryBeforeNotes = useBuildStore
      .getState()
      .savedBuilds.find((item) => item.id === useBuildStore.getState().activeBuildId);
    expect(entryBeforeNotes).toBeTruthy();

    const sharedCode = encodeSavedBuild(entryBeforeNotes!, appData.game);
    const { decodeBuildPackage } = await import("@/engine/buildCodec");

    useBuildStore.getState().setVariantNotes(null, "Local planner note");
    useBuildStore.getState().loadSharedBuild(decodeBuildPackage(sharedCode, appData.game));

    const updated = useBuildStore
      .getState()
      .savedBuilds.find((item) => item.id === useBuildStore.getState().activeBuildId);

    expect(updated?.defaultVariantNotes).toBe("Local planner note");
  });

  it("stores separate notes for default and milestone variants", async () => {
    const { useBuildStore } = await importBuildStore();
    const appData = getTestAppData();

    useBuildStore.getState().init(appData);
    useBuildStore.getState().createVariant("Level 20");

    const { savedBuilds, activeBuildId } = useBuildStore.getState();
    const entry = savedBuilds.find((item) => item.id === activeBuildId);
    const milestoneId = entry?.activeMilestoneId;
    expect(milestoneId).toBeTruthy();
    if (!milestoneId) return;

    useBuildStore.getState().setVariantNotes(null, "Default variant note");
    useBuildStore.getState().setVariantNotes(milestoneId, "Milestone variant note");

    const updated = useBuildStore
      .getState()
      .savedBuilds.find((item) => item.id === activeBuildId);

    expect(updated?.defaultVariantNotes).toBe("Default variant note");
    expect(updated?.milestones.find((item) => item.id === milestoneId)?.notes).toBe(
      "Milestone variant note",
    );
  });

  it("does not clear default notes when milestone notes are saved afterward", async () => {
    const { useBuildStore } = await importBuildStore();
    const appData = getTestAppData();

    useBuildStore.getState().init(appData);
    useBuildStore.getState().createVariant("Milestone 1");
    const milestone1Id = useBuildStore.getState().savedBuilds.find(
      (item) => item.id === useBuildStore.getState().activeBuildId,
    )?.activeMilestoneId;
    expect(milestone1Id).toBeTruthy();
    if (!milestone1Id) return;

    useBuildStore.getState().createVariant("Milestone 2");
    const milestone2Id = useBuildStore
      .getState()
      .savedBuilds.find((item) => item.id === useBuildStore.getState().activeBuildId)?.activeMilestoneId;
    expect(milestone2Id).toBeTruthy();
    if (!milestone2Id) return;

    useBuildStore.getState().setVariantNotes(null, "Default note");
    useBuildStore.getState().setVariantNotes(milestone1Id, "Milestone 1 note");
    useBuildStore.getState().setVariantNotes(milestone2Id, "Milestone 2 note");

    const entry = useBuildStore
      .getState()
      .savedBuilds.find((item) => item.id === useBuildStore.getState().activeBuildId);

    expect(getVariantNotes(entry!, null)).toBe("Default note");
    expect(getVariantNotes(entry!, milestone1Id)).toBe("Milestone 1 note");
    expect(getVariantNotes(entry!, milestone2Id)).toBe("Milestone 2 note");
  });

  it("keeps default note when saved before milestones are created", async () => {
    const storage = createLocalStorageMock();
    vi.stubGlobal("localStorage", storage);
    vi.stubGlobal("window", { localStorage: storage });

    const { useBuildStore } = await import("@/store/buildStore");
    const appData = getTestAppData();

    useBuildStore.getState().init(appData);
    const { activeBuildId } = useBuildStore.getState();

    useBuildStore.getState().setVariantNotes(null, "Default note first");
    useBuildStore.getState().createVariant("Milestone 1");
    const milestone1Id = useBuildStore.getState().savedBuilds.find(
      (item) => item.id === activeBuildId,
    )?.activeMilestoneId;
    expect(milestone1Id).toBeTruthy();
    if (!milestone1Id) return;

    useBuildStore.getState().createVariant("Milestone 2");
    const milestone2Id = useBuildStore
      .getState()
      .savedBuilds.find((item) => item.id === activeBuildId)?.activeMilestoneId;
    expect(milestone2Id).toBeTruthy();
    if (!milestone2Id) return;

    useBuildStore.getState().setVariantNotes(milestone1Id, "Milestone 1 note");
    useBuildStore.getState().setVariantNotes(milestone2Id, "Milestone 2 note");

    vi.resetModules();
    vi.stubGlobal("localStorage", storage);
    vi.stubGlobal("window", { localStorage: storage });

    const { useBuildStore: reloadedStore } = await import("@/store/buildStore");
    reloadedStore.getState().init(appData);

    const afterReload = reloadedStore
      .getState()
      .savedBuilds.find((item) => item.id === activeBuildId);

    expect(getVariantNotes(afterReload!, null)).toBe("Default note first");
    expect(getVariantNotes(afterReload!, milestone1Id)).toBe("Milestone 1 note");
    expect(getVariantNotes(afterReload!, milestone2Id)).toBe("Milestone 2 note");
  });

  it("keeps all three variant notes after saves, commits, and reload", async () => {
    const storage = createLocalStorageMock();
    vi.stubGlobal("localStorage", storage);
    vi.stubGlobal("window", { localStorage: storage });

    const { useBuildStore } = await import("@/store/buildStore");
    const appData = getTestAppData();

    useBuildStore.getState().init(appData);
    useBuildStore.getState().createVariant("Milestone 1");
    const milestone1Id = useBuildStore.getState().savedBuilds.find(
      (item) => item.id === useBuildStore.getState().activeBuildId,
    )?.activeMilestoneId;
    expect(milestone1Id).toBeTruthy();
    if (!milestone1Id) return;

    useBuildStore.getState().createVariant("Milestone 2");
    const entry = useBuildStore
      .getState()
      .savedBuilds.find((item) => item.id === useBuildStore.getState().activeBuildId);
    const milestone2Id = entry?.activeMilestoneId;
    expect(milestone2Id).toBeTruthy();
    if (!milestone2Id) return;

    // Simulate user saving notes on each variant while milestones stay active.
    useBuildStore.getState().setVariantNotes(null, "Default note");
    useBuildStore.getState().setVariantNotes(milestone1Id, "Milestone 1 note");
    useBuildStore.getState().setVariantNotes(milestone2Id, "Milestone 2 note");
    useBuildStore.getState().toggleTrait(appData.game.traits[0]!.id);

    const beforeReload = useBuildStore
      .getState()
      .savedBuilds.find((item) => item.id === useBuildStore.getState().activeBuildId);
    expect(getVariantNotes(beforeReload!, null)).toBe("Default note");
    expect(getVariantNotes(beforeReload!, milestone1Id)).toBe("Milestone 1 note");
    expect(getVariantNotes(beforeReload!, milestone2Id)).toBe("Milestone 2 note");

    const stored = window.localStorage.getItem(LIBRARY_STORAGE_KEY);
    expect(stored).toContain("Default note");
    expect(stored).toContain("Milestone 1 note");
    expect(stored).toContain("Milestone 2 note");

    vi.resetModules();
    vi.stubGlobal("localStorage", storage);
    vi.stubGlobal("window", { localStorage: storage });

    const { useBuildStore: reloadedStore } = await import("@/store/buildStore");
    reloadedStore.getState().init(appData);

    const afterReload = reloadedStore
      .getState()
      .savedBuilds.find((item) => item.id === useBuildStore.getState().activeBuildId);

    expect(getVariantNotes(afterReload!, null)).toBe("Default note");
    expect(getVariantNotes(afterReload!, milestone1Id)).toBe("Milestone 1 note");
    expect(getVariantNotes(afterReload!, milestone2Id)).toBe("Milestone 2 note");
  });
});
