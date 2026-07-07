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
});
