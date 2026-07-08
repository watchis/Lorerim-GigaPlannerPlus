import { describe, expect, it } from "vitest";
import { createTestBuildState } from "@/test/helpers";
import {
  acknowledgeSavedBuildEdits,
  createMilestone,
  createSavedBuild,
  getVariantIdAtIndex,
  getVariantIndex,
  getVariantNotes,
  isSavedBuildImported,
  markSavedBuildImported,
  mergeVariantNotesFromEntry,
  normalizeSavedBuild,
  setVariantNotesOnEntry,
  touchSavedBuild,
  uniqueBuildName,
  updateSavedBuildInList,
} from "@/store/savedBuilds";

describe("savedBuilds variant notes", () => {
  const build = createTestBuildState();
  const modpackVersion = "5.0.4.2";

  it("reads and writes notes on the default variant", () => {
    const entry = createSavedBuild("Tank", build);
    const updated = setVariantNotesOnEntry(entry, null, "Default notes", modpackVersion);

    expect(getVariantNotes(updated, null)).toBe("Default notes");
  });

  it("reads and writes notes on milestone variants", () => {
    const milestone = createMilestone("Level 25", build, "Old notes");
    const entry = createSavedBuild("Tank", build, [milestone]);
    const updated = setVariantNotesOnEntry(entry, milestone.id, "Updated notes", modpackVersion);

    expect(getVariantNotes(updated, milestone.id)).toBe("Updated notes");
    expect(getVariantNotes(updated, null)).toBe("");
  });

  it("survives JSON serialization like localStorage persistence", () => {
    const milestone = createMilestone("Level 25", build, "Milestone notes");
    const entry = setVariantNotesOnEntry(
      createSavedBuild("Tank", build, [milestone]),
      null,
      "Default notes",
      modpackVersion,
    );

    const restored = JSON.parse(JSON.stringify(entry)) as typeof entry;

    expect(getVariantNotes(restored, null)).toBe("Default notes");
    expect(getVariantNotes(restored, milestone.id)).toBe("Milestone notes");
  });

  it("keeps local notes when incoming shared build has none", () => {
    const milestone = createMilestone("Level 25", build, "Local milestone note");
    const existing = setVariantNotesOnEntry(
      createSavedBuild("Tank", build, [milestone]),
      null,
      "Local default note",
      modpackVersion,
    );
    const incoming = createSavedBuild("Tank", build, [
      createMilestone("Level 25", build, ""),
    ]);

    const merged = mergeVariantNotesFromEntry(existing, incoming);

    expect(merged.defaultVariantNotes).toBe("Local default note");
    expect(merged.milestones[0]?.notes).toBe("Local milestone note");
  });

  it("prefers incoming notes when the shared build includes them", () => {
    const existing = setVariantNotesOnEntry(createSavedBuild("Tank", build), null, "Old note", modpackVersion);
    const incoming = setVariantNotesOnEntry(createSavedBuild("Tank", build), null, "Shared note", modpackVersion);

    const merged = mergeVariantNotesFromEntry(existing, incoming);

    expect(merged.defaultVariantNotes).toBe("Shared note");
  });

  it("stores independent notes on each milestone variant", () => {
    const milestoneA = createMilestone("Level 20", build, "");
    const milestoneB = createMilestone("Level 40", build, "");
    let entry = createSavedBuild("Tank", build, [milestoneA, milestoneB]);

    entry = setVariantNotesOnEntry(entry, null, "Default note", modpackVersion);
    entry = setVariantNotesOnEntry(entry, milestoneA.id, "Milestone A note", modpackVersion);
    entry = setVariantNotesOnEntry(entry, milestoneB.id, "Milestone B note", modpackVersion);

    expect(getVariantNotes(entry, null)).toBe("Default note");
    expect(getVariantNotes(entry, milestoneA.id)).toBe("Milestone A note");
    expect(getVariantNotes(entry, milestoneB.id)).toBe("Milestone B note");
  });

  it("resolves variant ids by stable index", () => {
    const milestoneA = createMilestone("Level 20", build, "A");
    const milestoneB = createMilestone("Level 40", build, "B");
    const entry = createSavedBuild("Tank", build, [milestoneA, milestoneB]);

    expect(getVariantIndex(entry, null)).toBe(0);
    expect(getVariantIndex(entry, milestoneA.id)).toBe(1);
    expect(getVariantIndex(entry, milestoneB.id)).toBe(2);
    expect(getVariantIdAtIndex(entry, 0)).toBeNull();
    expect(getVariantIdAtIndex(entry, 1)).toBe(milestoneA.id);
    expect(getVariantIdAtIndex(entry, 2)).toBe(milestoneB.id);
  });

  it("ignores notes writes for unknown milestone ids", () => {
    const entry = createSavedBuild("Tank", build);
    const updated = setVariantNotesOnEntry(entry, "missing-id", "Orphan note", modpackVersion);

    expect(updated).toEqual(normalizeSavedBuild(entry));
    expect(getVariantNotes(updated, null)).toBe("");
  });
});

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
  const oldModpackVersion = "4.9.0.1";
  const newModpackVersion = "5.0.4.2";

  it("marks and detects imported builds", () => {
    const entry = markSavedBuildImported({
      ...createSavedBuild("Imported", build),
      modpackVersion: oldModpackVersion,
    });
    expect(isSavedBuildImported(entry)).toBe(true);
    expect(entry.importedAt).toBeTypeOf("number");
  });

  it("clears the imported marker when build content changes", () => {
    const entry = markSavedBuildImported({
      ...createSavedBuild("Imported", build),
      modpackVersion: oldModpackVersion,
    });
    const edited = touchSavedBuild(
      entry,
      { ...build, description: "Edited locally" },
      newModpackVersion,
    );

    expect(isSavedBuildImported(edited)).toBe(false);
    expect(edited.importedAt).toBeNull();
    expect(edited.build.description).toBe("Edited locally");
    expect(edited.modpackVersion).toBe(newModpackVersion);
  });

  it("keeps the imported marker when build content is unchanged", () => {
    const entry = markSavedBuildImported({
      ...createSavedBuild("Imported", build),
      modpackVersion: oldModpackVersion,
    });
    const synced = touchSavedBuild(entry, build, newModpackVersion);

    expect(synced).toBe(entry);
    expect(isSavedBuildImported(synced)).toBe(true);
    expect(synced.modpackVersion).toBe(oldModpackVersion);
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
  const oldModpackVersion = "4.9.0.1";
  const newModpackVersion = "5.0.4.2";

  it("keeps the imported marker when syncing unchanged build content", () => {
    const imported = markSavedBuildImported({
      ...createSavedBuild("Imported", build),
      modpackVersion: oldModpackVersion,
    });
    const synced = updateSavedBuildInList([imported], imported.id, build, newModpackVersion)[0]!;

    expect(isSavedBuildImported(synced)).toBe(true);
    expect(synced.importedAt).toBe(imported.importedAt);
    expect(synced.modpackVersion).toBe(oldModpackVersion);
  });

  it("clears the imported marker when synced build content changes", () => {
    const imported = markSavedBuildImported({
      ...createSavedBuild("Imported", build),
      modpackVersion: oldModpackVersion,
    });
    const synced = updateSavedBuildInList(
      [imported],
      imported.id,
      { ...build, deityId: "arkay" },
      newModpackVersion,
    )[0]!;

    expect(isSavedBuildImported(synced)).toBe(false);
    expect(synced.build.deityId).toBe("arkay");
    expect(synced.modpackVersion).toBe(newModpackVersion);
  });

  it("keeps the imported marker for unchanged active milestone builds", () => {
    const milestoneBuild = createTestBuildState({ description: "Milestone" });
    const milestone = createMilestone("Level 25", milestoneBuild);
    const imported = markSavedBuildImported(
      {
        ...createSavedBuild("Imported", build, [milestone]),
        modpackVersion: oldModpackVersion,
      },
    );
    imported.activeMilestoneId = milestone.id;

    const synced = updateSavedBuildInList([imported], imported.id, milestoneBuild, newModpackVersion)[0]!;

    expect(isSavedBuildImported(synced)).toBe(true);
    expect(synced.modpackVersion).toBe(oldModpackVersion);
  });
});
