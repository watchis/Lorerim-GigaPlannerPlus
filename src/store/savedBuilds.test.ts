import { describe, expect, it } from "vitest";
import { createTestBuildState } from "@/test/helpers";
import {
  createMilestone,
  createSavedBuild,
  getVariantNotes,
  mergeVariantNotesFromEntry,
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
});
