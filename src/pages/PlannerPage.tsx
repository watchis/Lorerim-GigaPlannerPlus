import { useEffect } from "react";
import { BugReportButton } from "@/components/BugReportButton";
import { LevelBar } from "@/components/LevelBar";
import { LayoutRenderer } from "@/layout/LayoutRenderer";
import { decodeBuildPackage, getBuildFromUrl } from "@/engine/buildCodec";
import { useBuildStore } from "@/store/buildStore";
import { LIBRARY_STORAGE_KEY } from "@/store/savedBuilds";

export function PlannerPage() {
  const layout = useBuildStore((s) => s.gameData?.ui.layout);
  const game = useBuildStore((s) => s.gameData?.game);
  const loadSharedBuild = useBuildStore((s) => s.loadSharedBuild);

  useEffect(() => {
    const urlBuild = getBuildFromUrl();
    if (!urlBuild || !game) return;

    // A persisted library is the source of truth on refresh. Re-applying the URL
    // build would replace the active slot with the share code (often without notes).
    if (localStorage.getItem(LIBRARY_STORAGE_KEY)) return;

    try {
      loadSharedBuild(decodeBuildPackage(urlBuild, game));
    } catch {
      // ignore invalid URL build codes
    }
  }, [game, loadSharedBuild]);

  if (!layout) return null;

  return (
    <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
      <LevelBar />
      <LayoutRenderer layout={layout} />
      <BugReportButton />
    </div>
  );
}
