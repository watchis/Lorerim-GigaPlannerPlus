import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const localStorageMock = vi.hoisted(() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
});

vi.stubGlobal("localStorage", localStorageMock);

import { decodeBuildPackage, encodeBuild, encodeSavedBuild } from "@/engine/buildCodec";
import { createTestBuildState, getTestAppData } from "@/test/helpers";
import { createSavedBuild } from "@/store/savedBuilds";

type BuildStoreModule = typeof import("@/store/buildStore");
let useBuildStore: BuildStoreModule["useBuildStore"];

describe("buildStore shared build import", () => {
  const appData = getTestAppData();
  const game = appData.game;

  beforeAll(async () => {
    ({ useBuildStore } = await import("@/store/buildStore"));
  });

  beforeEach(() => {
    localStorageMock.clear();

    const initialBuild = createTestBuildState({
      raceId: "nord",
      description: "Original active build",
    });
    const activeEntry = createSavedBuild("My Build", initialBuild);

    useBuildStore.setState({
      gameData: appData,
      build: initialBuild,
      savedBuilds: [activeEntry],
      activeBuildId: activeEntry.id,
      computed: null,
    });
  });

  it("importSharedBuild adds a new slot and preserves the previous active build", () => {
    const importedBuild = createTestBuildState({
      raceId: "breton",
      description: "Imported shared build",
    });
    const previousActiveId = useBuildStore.getState().activeBuildId;
    const previousBuildCount = useBuildStore.getState().savedBuilds.length;
    const decoded = decodeBuildPackage(encodeBuild(importedBuild, game), game);

    useBuildStore.getState().importSharedBuild(decoded);

    const state = useBuildStore.getState();
    const previousEntry = state.savedBuilds.find((entry) => entry.id === previousActiveId);

    expect(state.savedBuilds).toHaveLength(previousBuildCount + 1);
    expect(previousEntry?.build.description).toBe("Original active build");
    expect(state.activeBuildId).not.toBe(previousActiveId);
    expect(state.build.description).toBe("Imported shared build");
    expect(state.build.raceId).toBe("breton");
  });

  it("loadSharedBuild overwrites the active slot instead of creating a new one", () => {
    const importedBuild = createTestBuildState({
      raceId: "breton",
      description: "Imported shared build",
    });
    const previousActiveId = useBuildStore.getState().activeBuildId;
    const previousBuildCount = useBuildStore.getState().savedBuilds.length;
    const decoded = decodeBuildPackage(encodeBuild(importedBuild, game), game);

    useBuildStore.getState().loadSharedBuild(decoded);

    const state = useBuildStore.getState();
    const activeEntry = state.savedBuilds.find((entry) => entry.id === previousActiveId);

    expect(state.savedBuilds).toHaveLength(previousBuildCount);
    expect(state.activeBuildId).toBe(previousActiveId);
    expect(activeEntry?.build.description).toBe("Imported shared build");
    expect(state.build.description).toBe("Imported shared build");
  });

  it("importSharedBuild imports saved build metadata as a new slot", () => {
    const defaultBuild = createTestBuildState({
      raceId: "nord",
      description: "Baseline",
      playerLevel: 10,
    });
    const importedEntry = createSavedBuild("Shared Tank", defaultBuild);
    const previousActiveId = useBuildStore.getState().activeBuildId;
    const decoded = decodeBuildPackage(encodeSavedBuild(importedEntry, game), game);

    useBuildStore.getState().importSharedBuild(decoded);

    const state = useBuildStore.getState();
    const previousEntry = state.savedBuilds.find((entry) => entry.id === previousActiveId);
    const importedSlot = state.savedBuilds.find((entry) => entry.name === "Shared Tank");

    expect(previousEntry?.build.description).toBe("Original active build");
    expect(importedSlot).toBeDefined();
    expect(state.activeBuildId).toBe(importedSlot?.id);
    expect(state.build.description).toBe("Baseline");
  });
});
