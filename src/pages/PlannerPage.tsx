import { useEffect, useState } from "react";
import { BugReportButton } from "@/components/BugReportButton";
import { ImportedBuildVersionWarning } from "@/components/ImportedBuildVersionWarning";
import { LevelBar } from "@/components/LevelBar";
import { LayoutRenderer } from "@/layout/LayoutRenderer";
import { applyUrlBuildImport } from "@/lib/urlBuildImport";
import type { ImportedBuildVersionMismatch } from "@/lib/modpackVersion";
import { useBuildStore } from "@/store/buildStore";
import { useThemeConfig } from "@/theme/ThemeProvider";

export function PlannerPage() {
  const { labels } = useThemeConfig();
  const buildLibraryLabels = labels.panels["build-library"];
  const layout = useBuildStore((s) => s.gameData?.ui.layout);
  const game = useBuildStore((s) => s.gameData?.game);
  const importSharedBuild = useBuildStore((s) => s.importSharedBuild);
  const [importVersionWarning, setImportVersionWarning] =
    useState<ImportedBuildVersionMismatch | null>(null);

  useEffect(() => {
    if (!game) return;
    const result = applyUrlBuildImport(game, importSharedBuild);
    if (result.status === "imported" && result.versionMismatch) {
      setImportVersionWarning(result.versionMismatch);
    }
  }, [game, importSharedBuild]);
  if (!layout) return null;

  return (
    <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
      <LevelBar />
      {importVersionWarning && (
        <div className="shrink-0 border-b border-[var(--color-border)]/60 bg-[var(--color-surface)] px-4 py-2 sm:px-6">
          <ImportedBuildVersionWarning
            mismatch={importVersionWarning}
            warningLabel={buildLibraryLabels.importedVersionWarning}
            errorLabel={buildLibraryLabels.importedVersionMismatchError}
            dismissLabel={buildLibraryLabels.dismissImportedVersionWarning}
            onDismiss={() => setImportVersionWarning(null)}
          />
        </div>
      )}
      <LayoutRenderer layout={layout} />
      <BugReportButton />
    </div>
  );
}
