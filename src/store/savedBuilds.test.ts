import { describe, expect, it } from "vitest";
import { createTestBuildState } from "@/test/helpers";
import {
  createMilestone,
  createSavedBuild,
  getVariantIdAtIndex,
  getVariantIndex,
  getVariantNotes,
  mergeVariantNotesFromEntry,
  normalizeSavedBuild,
  setVariantNotesOnEntry,
} from "@/store/savedBuilds";

describe("savedBuilds variant notes", () => {
  const build = createTestBuildState();

  it("reads and writes notes on the default variant", () => {
    const entry = createSavedBuild("Tank", build);
    const updated = setVariantNotesOnEntry(entry, null, "Default notes");

    expect(getVariantNotes(updated, null)).toBe("Default notes");
  });

  it("reads and writes notes on milestone variants", () => {
    const milestone = createMilestone("Level 25", build, "Old notes");
    const entry = createSavedBuild("Tank", build, [milestone]);
    const updated = setVariantNotesOnEntry(entry, milestone.id, "Updated notes");

    expect(getVariantNotes(updated, milestone.id)).toBe("Updated notes");
    expect(getVariantNotes(updated, null)).toBe("");
  });

  it("survives JSON serialization like localStorage persistence", () => {
    const milestone = createMilestone("Level 25", build, "Milestone notes");
    const entry = setVariantNotesOnEntry(
      createSavedBuild("Tank", build, [milestone]),
      null,
      "Default notes",
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
    );
    const incoming = createSavedBuild("Tank", build, [
      createMilestone("Level 25", build, ""),
    ]);

    const merged = mergeVariantNotesFromEntry(existing, incoming);

    expect(merged.defaultVariantNotes).toBe("Local default note");
    expect(merged.milestones[0]?.notes).toBe("Local milestone note");
  });

  it("prefers incoming notes when the shared build includes them", () => {
    const existing = setVariantNotesOnEntry(createSavedBuild("Tank", build), null, "Old note");
    const incoming = setVariantNotesOnEntry(createSavedBuild("Tank", build), null, "Shared note");

    const merged = mergeVariantNotesFromEntry(existing, incoming);

    expect(merged.defaultVariantNotes).toBe("Shared note");
  });

  it("stores independent notes on each milestone variant", () => {
    const milestoneA = createMilestone("Level 20", build, "");
    const milestoneB = createMilestone("Level 40", build, "");
    let entry = createSavedBuild("Tank", build, [milestoneA, milestoneB]);

    entry = setVariantNotesOnEntry(entry, null, "Default note");
    entry = setVariantNotesOnEntry(entry, milestoneA.id, "Milestone A note");
    entry = setVariantNotesOnEntry(entry, milestoneB.id, "Milestone B note");

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
    const updated = setVariantNotesOnEntry(entry, "missing-id", "Orphan note");

    expect(updated).toEqual(normalizeSavedBuild(entry));
    expect(getVariantNotes(updated, null)).toBe("");
  });
});
