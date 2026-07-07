import { describe, expect, it } from "vitest";
import { createTestBuildState } from "@/test/helpers";
import {
  acknowledgeSavedBuildEdits,
  createMilestone,
  createSavedBuild,
  isSavedBuildImported,
  markSavedBuildImported,
  normalizeSavedBuild,
  touchSavedBuild,
  uniqueBuildName,
  updateSavedBuildInList,
} from "@/store/savedBuilds";

describe("uniqueBuildName", () => {
  const build = createTestBuildState();

  it("returns the desired name when it is unused", () => {
    const builds = [createSavedBuild("Existing", build)];
    expect(uniqueBuildName("Imported", builds)).toBe("Imported");
  });

  it("falls back to the next default name when desired name is blank", () => {
    const builds = [createSavedBuild("Build 1", build)];
    expect(uniqueBuildName("", builds)).toBe("Build 2");
  });

  it("appends copy when the desired name already exists", () => {
    const builds = [createSavedBuild("Tank", build)];
    expect(uniqueBuildName("Tank", builds)).toBe("Tank copy");
  });

  it("increments the copy suffix until the name is unique", () => {
    const builds = [
      createSavedBuild("Tank", build),
      createSavedBuild("Tank copy", build),
    ];
    expect(uniqueBuildName("Tank", builds)).toBe("Tank copy 2");
  });
});

describe("imported build markers", () => {
  const build = createTestBuildState();

  it("marks and detects imported builds", () => {
    const entry = markSavedBuildImported(createSavedBuild("Imported", build));
    expect(isSavedBuildImported(entry)).toBe(true);
    expect(entry.importedAt).toBeTypeOf("number");
  });

  it("clears the imported marker when build content changes", () => {
    const entry = markSavedBuildImported(createSavedBuild("Imported", build));
    const edited = touchSavedBuild(entry, { ...build, description: "Edited locally" });

    expect(isSavedBuildImported(edited)).toBe(false);
    expect(edited.importedAt).toBeNull();
    expect(edited.build.description).toBe("Edited locally");
  });

  it("keeps the imported marker when build content is unchanged", () => {
    const entry = markSavedBuildImported(createSavedBuild("Imported", build));
    const synced = touchSavedBuild(entry, build);

    expect(synced).toBe(entry);
    expect(isSavedBuildImported(synced)).toBe(true);
  });

  it("acknowledgeSavedBuildEdits is a no-op for non-imported builds", () => {
    const entry = createSavedBuild("Local", build);
    expect(acknowledgeSavedBuildEdits(entry)).toBe(entry);
  });

  it("createSavedBuild can mark a new slot as imported", () => {
    const entry = createSavedBuild("Imported", build, [], undefined, { imported: true });
    expect(isSavedBuildImported(entry)).toBe(true);
  });

  it("normalizeSavedBuild defaults importedAt to null for legacy entries", () => {
    const legacy = {
      ...createSavedBuild("Legacy", build),
      importedAt: undefined as unknown as null,
    };
    expect(normalizeSavedBuild(legacy).importedAt).toBeNull();
  });
});

describe("updateSavedBuildInList imported markers", () => {
  const build = createTestBuildState({ description: "Baseline" });

  it("keeps the imported marker when syncing unchanged build content", () => {
    const imported = markSavedBuildImported(createSavedBuild("Imported", build));
    const synced = updateSavedBuildInList([imported], imported.id, build)[0]!;

    expect(isSavedBuildImported(synced)).toBe(true);
    expect(synced.importedAt).toBe(imported.importedAt);
  });

  it("clears the imported marker when synced build content changes", () => {
    const imported = markSavedBuildImported(createSavedBuild("Imported", build));
    const synced = updateSavedBuildInList(
      [imported],
      imported.id,
      { ...build, deityId: "arkay" },
    )[0]!;

    expect(isSavedBuildImported(synced)).toBe(false);
    expect(synced.build.deityId).toBe("arkay");
  });

  it("keeps the imported marker for unchanged active milestone builds", () => {
    const milestoneBuild = createTestBuildState({ description: "Milestone" });
    const milestone = createMilestone("Level 25", milestoneBuild);
    const imported = markSavedBuildImported(
      createSavedBuild("Imported", build, [milestone]),
    );
    imported.activeMilestoneId = milestone.id;

    const synced = updateSavedBuildInList([imported], imported.id, milestoneBuild)[0]!;

    expect(isSavedBuildImported(synced)).toBe(true);
  });
});
