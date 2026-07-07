import { describe, expect, it } from "vitest";
import { createInitialBuildState } from "@/engine/buildEngine";
import {
  createMilestone,
  createSavedBuild,
  getVariantIndex,
  getVariantNotes,
  setVariantNotesOnEntry,
} from "@/store/savedBuilds";

function getInitialNotesState(
  initialPane: "manage" | "notes",
  initialVariantId: string | null,
  entry: ReturnType<typeof createSavedBuild> | undefined,
): { variantIndex: number; draft: string } {
  if (initialPane !== "notes") {
    return { variantIndex: 0, draft: "" };
  }
  if (!entry) {
    return { variantIndex: 0, draft: "" };
  }
  const variantIndex = getVariantIndex(entry, initialVariantId);
  const draft = getVariantNotes(entry, initialVariantId);
  return { variantIndex, draft };
}

describe("variant notes pane initial state", () => {
  it("opens milestone notes without starting from an empty default draft", () => {
    const build = createInitialBuildState();
    const milestone = createMilestone("Milestone 1", build, "Milestone note");
    const entry = setVariantNotesOnEntry(
      createSavedBuild("Tank", build, [milestone]),
      null,
      "Default note",
    );

    const initial = getInitialNotesState("notes", milestone.id, entry);

    expect(initial.variantIndex).toBe(1);
    expect(initial.draft).toBe("Milestone note");
    expect(initial.variantIndex).not.toBe(0);
    expect(initial.draft).not.toBe("");
  });

  it("documents the stale default wipe when index 0 and empty draft are persisted", () => {
    const build = createInitialBuildState();
    const milestone = createMilestone("Milestone 1", build);
    const entry = setVariantNotesOnEntry(createSavedBuild("Tank", build, [milestone]), null, "Default note");

    const buggyPersist = setVariantNotesOnEntry(entry, null, "");
    expect(getVariantNotes(buggyPersist, null)).toBe("");
  });
});
