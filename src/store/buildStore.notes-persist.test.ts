import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { encodeSavedBuild } from "@/engine/buildCodec";
import { getTestAppData } from "@/test/helpers";
import { LIBRARY_STORAGE_KEY } from "@/store/savedBuilds";

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
  return import("@/store/buildStore");
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
});
