import { useBuildStore } from "@/store/buildStore";
import {
  getActiveSavedBuild,
  getVariantIdAtIndex,
  getVariantNotes,
} from "@/store/savedBuilds";

export function persistPendingVariantNotes(
  activePane: "manage" | "notes",
  variantIndex: number,
  draft: string,
): void {
  if (activePane !== "notes") return;

  const { savedBuilds, activeBuildId, setVariantNotes } = useBuildStore.getState();
  const entry = getActiveSavedBuild(savedBuilds, activeBuildId);
  if (!entry) return;

  const variantId = getVariantIdAtIndex(entry, variantIndex);
  const persisted = getVariantNotes(entry, variantId);
  if (draft !== persisted) {
    setVariantNotes(variantId, draft);
  }
}
