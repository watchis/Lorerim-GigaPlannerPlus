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
import { createExportedBuild, createExportedLibrary } from "@/lib/buildIO";
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

  it("importSharedBuild preserves the source modpack version from cross-patch share codes", () => {
    const importedBuild = createTestBuildState({
      raceId: "breton",
      description: "Cross-patch shared build",
    });
    const olderGame = {
      ...game,
      manifest: { ...game.manifest, version: "5.0.3.6" },
    };
    const decoded = decodeBuildPackage(encodeBuild(importedBuild, olderGame), game);

    useBuildStore.getState().importSharedBuild(decoded);

    const importedSlot = useBuildStore
      .getState()
      .savedBuilds.find((entry) => entry.id === useBuildStore.getState().activeBuildId);

    expect(importedSlot?.modpackVersion).toBe("5.0.3.6");
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

  it("keeps the imported marker on the imported slot after switching away", () => {
    const localBuild = createTestBuildState({ description: "Local build" });
    const localEntry = createSavedBuild("Local Build", localBuild);
    const importedBuild = createTestBuildState({ description: "Imported build" });
    const importedEntry = markSavedBuildImported(createSavedBuild("Imported Build", importedBuild));
    const importedId = importedEntry.id;

    useBuildStore.setState({
      savedBuilds: [localEntry, importedEntry],
      activeBuildId: importedId,
      build: importedBuild,
    });

    useBuildStore.getState().selectSavedBuildSlot(localEntry.id);

    const importedSlot = useBuildStore.getState().savedBuilds.find((entry) => entry.id === importedId);
    expect(useBuildStore.getState().activeBuildId).toBe(localEntry.id);
    expect(isSavedBuildImported(importedSlot!)).toBe(true);
  });

  it("importBuildAsSlot marks the new slot imported and deduplicates the name", () => {
    const importedBuild = createTestBuildState({
      raceId: "breton",
      description: "File import",
    });

    useBuildStore.getState().importBuildAsSlot(importedBuild, "My Build");

    const state = useBuildStore.getState();
    const importedSlot = state.savedBuilds.find((entry) => entry.name === "My Build copy");

    expect(importedSlot).toBeDefined();
    expect(isSavedBuildImported(importedSlot!)).toBe(true);
    expect(state.activeBuildId).toBe(importedSlot?.id);
    expect(state.build.description).toBe("File import");
  });

  it("importSharedBuild without shared metadata marks the new slot imported", () => {
    const importedBuild = createTestBuildState({
      raceId: "breton",
      description: "Plain codec import",
    });
    const decoded = decodeBuildPackage(encodeBuild(importedBuild, game), game);

    useBuildStore.getState().importSharedBuild(decoded);

    const activeEntry = useBuildStore
      .getState()
      .savedBuilds.find((entry) => entry.id === useBuildStore.getState().activeBuildId);
    expect(activeEntry?.build.description).toBe("Plain codec import");
    expect(isSavedBuildImported(activeEntry!)).toBe(true);
  });

  it("loadSharedBuild replaces the active slot without marking it imported", () => {
    const importedBuild = createTestBuildState({
      raceId: "breton",
      description: "Replaced active build",
    });
    const decoded = decodeBuildPackage(encodeBuild(importedBuild, game), game);
    const previousActiveId = useBuildStore.getState().activeBuildId;

    useBuildStore.getState().loadSharedBuild(decoded);

    const activeEntry = useBuildStore
      .getState()
      .savedBuilds.find((entry) => entry.id === previousActiveId);
    expect(activeEntry?.build.description).toBe("Replaced active build");
    expect(isSavedBuildImported(activeEntry!)).toBe(false);
  });

  it("renameSavedBuildSlot does not clear the imported marker", () => {
    const importedBuild = createTestBuildState({ description: "Imported build" });
    const importedEntry = markSavedBuildImported(createSavedBuild("Imported Build", importedBuild));

    useBuildStore.setState({
      savedBuilds: [importedEntry],
      activeBuildId: importedEntry.id,
      build: importedBuild,
    });

    useBuildStore.getState().renameSavedBuildSlot(importedEntry.id, "Renamed Import");

    const renamed = useBuildStore.getState().savedBuilds.find((entry) => entry.id === importedEntry.id);
    expect(renamed?.name).toBe("Renamed Import");
    expect(isSavedBuildImported(renamed!)).toBe(true);
  });

  it("clears the imported marker after planner edits such as changing race", () => {
    const importedBuild = createTestBuildState({
      raceId: "nord",
      description: "Imported build",
    });
    const importedEntry = createSavedBuild("Imported Build", importedBuild);
    const sharedDecoded = decodeBuildPackage(encodeSavedBuild(importedEntry, game), game);

    useBuildStore.getState().importSharedBuild(sharedDecoded);
    useBuildStore.getState().setRace("breton");

    const activeEntry = useBuildStore
      .getState()
      .savedBuilds.find((entry) => entry.id === useBuildStore.getState().activeBuildId);
    expect(activeEntry?.build.raceId).toBe("breton");
    expect(isSavedBuildImported(activeEntry!)).toBe(false);
  });

  it("importBuildLibrary preserves per-build modpackVersion from exported backups", () => {
    const buildA = createTestBuildState({ description: "Build A" });
    const buildB = createTestBuildState({ description: "Build B" });

    const entryA = {
      ...createSavedBuild("Exported A", buildA),
      modpackVersion: "4.9.0.1",
    };
    const entryB = {
      ...createSavedBuild("Exported B", buildB),
      modpackVersion: "5.0.4.2",
    };

    const exported = createExportedLibrary([entryA, entryB], appData.game.manifest.version);

    useBuildStore.getState().importBuildLibrary(exported.savedBuilds, exported.modpackVersion);

    const state = useBuildStore.getState();
    const restoredA = state.savedBuilds.find((e) => e.name === "Exported A")!;
    const restoredB = state.savedBuilds.find((e) => e.name === "Exported B")!;

    expect(restoredA.modpackVersion).toBe("4.9.0.1");
    expect(restoredB.modpackVersion).toBe("5.0.4.2");
  });

  it("importBuildAsSlot preserves exported modpackVersion", () => {
    const importedBuild = createTestBuildState({ description: "Imported build slot" });
    const entry = {
      ...createSavedBuild("Imported Slot", importedBuild),
      modpackVersion: "4.9.0.1",
    };

    const exported = createExportedBuild(
      entry.name,
      entry.build,
      entry.modpackVersion!,
      [],
      entry.defaultVariantName,
      entry.defaultVariantNotes,
    );

    useBuildStore.getState().importBuildAsSlot(
      exported.build,
      exported.name,
      exported.milestones,
      exported.defaultVariantName,
      exported.defaultVariantNotes,
      exported.modpackVersion,
    );

    const state = useBuildStore.getState();
    const restored = state.savedBuilds.find((e) => e.name === "Imported Slot")!;
    expect(restored.modpackVersion).toBe("4.9.0.1");
  });
});

describe("buildStore supernatural character options", () => {
  const appData = getTestAppData();

  beforeAll(async () => {
    ({ useBuildStore } = await import("@/store/buildStore"));
  });

  beforeEach(() => {
    localStorageMock.clear();
    const initialBuild = createTestBuildState();
    const activeEntry = createSavedBuild("Curse build", initialBuild);
    useBuildStore.setState({
      gameData: appData,
      build: initialBuild,
      savedBuilds: [activeEntry],
      activeBuildId: activeEntry.id,
      computed: null,
    });
  });

  it("updates build synchronously when activating a supernatural curse", () => {
    useBuildStore.getState().setCharacterOptionChoice("vampire", "stage-1");

    const state = useBuildStore.getState();
    expect(state.build.characterOptionChoices.vampire).toBe("stage-1");
  });

  it("activates vampire with stage selection and strips conflicting werewolf perks", async () => {
    useBuildStore.getState().setCharacterOptionChoice("werewolf", "claimed");
    useBuildStore.getState().togglePerk("werewolf-animal-vigor");

    useBuildStore.getState().setCharacterOptionChoice("vampire", "stage-3");
    await Promise.resolve();

    const state = useBuildStore.getState();
    expect(state.build.characterOptionChoices.vampire).toBe("stage-3");
    expect(state.build.characterOptionChoices.werewolf).toBe("none");
    expect(state.build.selectedPerkIds).not.toContain("werewolf-animal-vigor");
    expect(state.computed).not.toBeNull();
  });

  it("updates computed after vampire hunger stage change without full reconcile churn", async () => {
    useBuildStore.getState().setCharacterOptionChoice("vampire", "stage-1");
    await Promise.resolve();

    useBuildStore.getState().setCharacterOptionChoice("vampire", "stage-4");
    await Promise.resolve();

    const state = useBuildStore.getState();
    expect(state.build.characterOptionChoices.vampire).toBe("stage-4");
    expect(state.computed?.attributes.health).toBeGreaterThan(0);
  });

  it("imports supernatural curse builds from share codes", async () => {
    const curseBuild = createTestBuildState({
      characterOptionChoices: { vampire: "stage-2", werewolf: "none" },
      selectedPerkIds: ["vampire-scion"],
      description: "Imported vampire",
    });
    const decoded = decodeBuildPackage(encodeBuild(curseBuild, appData.game), appData.game);

    useBuildStore.getState().importSharedBuild(decoded);
    await Promise.resolve();

    const state = useBuildStore.getState();
    expect(state.build.characterOptionChoices.vampire).toBe("stage-2");
    expect(state.build.characterOptionChoices.werewolf).toBe("none");
    expect(state.build.selectedPerkIds).toContain("vampire-scion");
  });

  it("imports supernatural curse builds from JSON backups", () => {
    const curseBuild = createTestBuildState({
      characterOptionChoices: { vampire: "none", werewolf: "claimed" },
      selectedPerkIds: ["werewolf-animal-vigor"],
    });
    const exported = createExportedBuild("Werewolf backup", curseBuild, appData.game.manifest.version);

    useBuildStore.getState().importBuildAsSlot(
      exported.build,
      exported.name,
      exported.milestones,
      exported.defaultVariantName,
      exported.defaultVariantNotes,
      exported.modpackVersion,
    );

    const state = useBuildStore.getState();
    expect(state.build.characterOptionChoices.werewolf).toBe("claimed");
    expect(state.build.characterOptionChoices.vampire).toBe("none");
    expect(state.build.selectedPerkIds).toEqual(["werewolf-animal-vigor"]);
  });

  it("init reconciles stale lich claimed choices across library variants", () => {
    const milestone = {
      id: "ms-1",
      name: "Level 25",
      build: createTestBuildState({
        characterOptionChoices: { lich: "claimed" },
        playerLevel: 25,
      }),
    };
    const staleEntry = {
      ...createSavedBuild(
        "Stale Lich",
        createTestBuildState({
          characterOptionChoices: { lich: "claimed" },
        }),
        [milestone],
      ),
      activeMilestoneId: milestone.id,
    };

    useBuildStore.setState({
      gameData: null,
      build: staleEntry.build,
      savedBuilds: [staleEntry],
      activeBuildId: staleEntry.id,
      computed: null,
    });

    useBuildStore.getState().init(appData);

    const state = useBuildStore.getState();
    expect(state.build.characterOptionChoices.lich).toBe("0");
    expect(state.savedBuilds[0]?.build.characterOptionChoices.lich).toBe("0");
    expect(state.savedBuilds[0]?.milestones[0]?.build.characterOptionChoices.lich).toBe("0");
    expect(() =>
      encodeSavedBuild(state.savedBuilds[0]!, appData.game),
    ).not.toThrow();
  });

  it("init repairs a library with a corrupt slot without wiping other builds", () => {
    const healthy = createSavedBuild(
      "Healthy",
      createTestBuildState({ raceId: "nord", description: "keep me" }),
    );
    const corrupt = {
      id: "corrupt-1",
      name: "Corrupt",
      build: null,
      milestones: { nope: true },
    } as unknown as ReturnType<typeof createSavedBuild>;

    useBuildStore.setState({
      gameData: null,
      build: healthy.build,
      savedBuilds: [healthy, corrupt],
      activeBuildId: healthy.id,
      computed: null,
    });

    useBuildStore.getState().init(appData);

    const state = useBuildStore.getState();
    expect(state.savedBuilds).toHaveLength(2);
    expect(state.savedBuilds.find((entry) => entry.id === healthy.id)?.build.description).toBe(
      "keep me",
    );
    const repaired = state.savedBuilds.find((entry) => entry.id === "corrupt-1");
    expect(repaired?.name).toBe("Corrupt");
    expect(repaired?.build.selectedPerkIds).toEqual([]);
    expect(state.activeBuildId).toBe(healthy.id);
  });
});
