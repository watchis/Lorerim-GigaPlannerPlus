import { useEffect } from "react";
import { LevelBar } from "@/components/LevelBar";
import { LayoutRenderer } from "@/layout/LayoutRenderer";
import { decodeBuild, getBuildFromUrl } from "@/engine/buildCodec";
import { useBuildStore } from "@/store/buildStore";

export function PlannerPage() {
  const layout = useBuildStore((s) => s.gameData?.ui.layout);
  const game = useBuildStore((s) => s.gameData?.game);
  const loadBuild = useBuildStore((s) => s.loadBuild);

  useEffect(() => {
    const urlBuild = getBuildFromUrl();
    if (!urlBuild || !game) return;

    try {
      loadBuild(decodeBuild(urlBuild, game));
    } catch {
      // ignore invalid URL build codes
    }
  }, [game, loadBuild]);
  if (!layout) return null;

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <LevelBar />
      <LayoutRenderer layout={layout} />
    </div>
  );
}
