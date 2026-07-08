import { describe, expect, it } from "vitest";
import { createInitialBuildState } from "@/engine/buildEngine";
import {
  createMilestone,
  createSavedBuild,
  setVariantNotesOnEntry,
} from "@/store/savedBuilds";
import {
  createNotesPaneState,
  getInitialNotesState,
  shouldStartNotesEditing,
} from "@/panels/variantNotesState";

describe("variantNotesState", () => {
  const build = createInitialBuildState();
  const modpackVersion = "5.0.4.2";

  it("opens milestone notes without starting from an empty default draft", () => {
    const milestone = createMilestone("Milestone 1", build, "Milestone note");
    const entry = setVariantNotesOnEntry(
      createSavedBuild("Tank", build, [milestone]),
      null,
      "Default note",
      modpackVersion,
    );

    const initial = getInitialNotesState("notes", milestone.id, entry);

    expect(initial).toEqual({
      variantIndex: 1,
      draft: "Milestone note",
      editing: false,
    });
  });

  it("starts editing when opening notes for an empty variant", () => {
    const entry = createSavedBuild("Tank", build);

    expect(createNotesPaneState(entry, null)).toEqual({
      variantIndex: 0,
      draft: "",
      editing: true,
    });
    expect(shouldStartNotesEditing("   ")).toBe(true);
    expect(shouldStartNotesEditing("Existing note")).toBe(false);
  });

  it("returns a neutral manage-pane state", () => {
    expect(getInitialNotesState("manage", null, undefined)).toEqual({
      variantIndex: 0,
      draft: "",
      editing: false,
    });
  });
});
