import {
  getVariantIndex,
  getVariantNotes,
  type SavedBuild,
} from "@/store/savedBuilds";

export interface NotesPaneState {
  variantIndex: number;
  draft: string;
  editing: boolean;
}

export function shouldStartNotesEditing(content: string): boolean {
  return content.trim() === "";
}

export function createNotesPaneState(
  entry: SavedBuild | undefined,
  variantId: string | null,
): NotesPaneState {
  if (!entry) {
    return { variantIndex: 0, draft: "", editing: true };
  }

  const variantIndex = getVariantIndex(entry, variantId);
  const draft = getVariantNotes(entry, variantId);
  return {
    variantIndex,
    draft,
    editing: shouldStartNotesEditing(draft),
  };
}

export function getInitialNotesState(
  initialPane: "manage" | "notes",
  initialVariantId: string | null,
  entry: SavedBuild | undefined,
): NotesPaneState {
  if (initialPane !== "notes") {
    return { variantIndex: 0, draft: "", editing: false };
  }

  return createNotesPaneState(entry, initialVariantId);
}
