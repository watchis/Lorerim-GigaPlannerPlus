import { describe, expect, it } from "vitest";
import { createTestBuildState } from "@/test/helpers";
import {
  createMilestone,
  createSavedBuild,
  getVariantNotes,
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
});
