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
import { createSavedBuild, isSavedBuildImported, markSavedBuildImported } from "@/store/savedBuilds";

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
    expect(
      isSavedBuildImported(state.savedBuilds.find((entry) => entry.id === state.activeBuildId)!),
    ).toBe(true);
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

  it("importSharedBuild renames imported builds that collide with existing names", () => {
    const importedBuild = createTestBuildState({
      raceId: "breton",
      description: "Imported duplicate name",
    });
    const importedEntry = createSavedBuild("My Build", importedBuild);
    const sharedDecoded = decodeBuildPackage(encodeSavedBuild(importedEntry, game), game);

    useBuildStore.getState().importSharedBuild(sharedDecoded);

    const state = useBuildStore.getState();
    const names = state.savedBuilds.map((entry) => entry.name);

    expect(names.filter((name) => name === "My Build")).toHaveLength(1);
    expect(names).toContain("My Build copy");
    expect(state.activeBuildId).toBe(
      state.savedBuilds.find((entry) => entry.name === "My Build copy")?.id,
    );
  });

  it("clears the imported marker after the first local build edit", () => {
    const importedBuild = createTestBuildState({
      raceId: "breton",
      description: "Imported duplicate name",
    });
    const importedEntry = createSavedBuild("Imported Build", importedBuild);
    const sharedDecoded = decodeBuildPackage(encodeSavedBuild(importedEntry, game), game);

    useBuildStore.getState().importSharedBuild(sharedDecoded);
    expect(
      isSavedBuildImported(
        useBuildStore.getState().savedBuilds.find(
          (entry) => entry.id === useBuildStore.getState().activeBuildId,
        )!,
      ),
    ).toBe(true);

    useBuildStore.getState().setDescription("Edited after import");

    const activeEntry = useBuildStore
      .getState()
      .savedBuilds.find((entry) => entry.id === useBuildStore.getState().activeBuildId);
    expect(isSavedBuildImported(activeEntry!)).toBe(false);
  });

  it("keeps the imported marker when switching away and back without edits", () => {
    const localBuild = createTestBuildState({
      raceId: "nord",
      description: "Local build",
    });
    const localEntry = createSavedBuild("Local Build", localBuild);
    const importedBuild = createTestBuildState({
      raceId: "breton",
      description: "Imported build",
    });
    const importedEntry = markSavedBuildImported(createSavedBuild("Imported Build", importedBuild));
    const importedId = importedEntry.id;

    useBuildStore.setState({
      savedBuilds: [localEntry, importedEntry],
      activeBuildId: importedId,
      build: importedBuild,
    });

    useBuildStore.getState().selectSavedBuildSlot(localEntry.id);
    useBuildStore.getState().selectSavedBuildSlot(importedId);

    const importedSlot = useBuildStore.getState().savedBuilds.find((entry) => entry.id === importedId);
    expect(isSavedBuildImported(importedSlot!)).toBe(true);
  });
});
