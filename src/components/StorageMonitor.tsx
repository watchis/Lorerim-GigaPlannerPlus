import { HardDrive } from "lucide-react";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  formatStorageSize,
  getAppLocalStorageUsage,
  type LocalStorageUsage,
  type StorageUsageLevel,
} from "@/lib/localStorageUsage";
import { cn } from "@/lib/utils";
import { useBuildStore } from "@/store/buildStore";
import { usePanelLabels } from "@/theme/ThemeProvider";

function formatLabel(template: string, values: Record<string, string | number>): string {
  return Object.entries(values).reduce(
    (result, [key, value]) => result.replace(`{${key}}`, String(value)),
    template,
  );
}

function progressBarClassName(level: StorageUsageLevel): string {
  switch (level) {
    case "critical":
      return "bg-[var(--color-error)]";
    case "warning":
      return "bg-[var(--color-accent)]";
    default:
      return "bg-[var(--color-accent-muted)]";
  }
}

export function StorageMonitor() {
  const labels = usePanelLabels("build-library");
  const savedBuilds = useBuildStore((state) => state.savedBuilds);
  const activeBuildId = useBuildStore((state) => state.activeBuildId);
  const build = useBuildStore((state) => state.build);
  const [usage, setUsage] = useState<LocalStorageUsage>(() => getAppLocalStorageUsage());

  useEffect(() => {
    setUsage(getAppLocalStorageUsage());
  }, [savedBuilds, activeBuildId, build]);

  const usageLabel = formatLabel(labels.storageUsage, {
    used: formatStorageSize(usage.usedBytes),
    quota: formatStorageSize(usage.quotaBytes),
  });

  return (
    <Card className="min-w-0 overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-accent)]/10 text-[var(--color-accent)]">
            <HardDrive className="h-4 w-4" aria-hidden />
          </div>
          <div className="min-w-0">
            <CardTitle className="text-base">{labels.storageMonitorTitle}</CardTitle>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-2">
          <div className="flex min-w-0 items-baseline justify-between gap-2">
            <p className="text-[11px] font-medium uppercase tracking-wide text-[var(--color-muted)]">
              {labels.storageUsageLabel}
            </p>
            <p className="shrink-0 font-mono text-xs tabular-nums text-[var(--color-foreground)]">
              {usageLabel}
            </p>
          </div>
          <div
            className="h-2 overflow-hidden rounded-full bg-[var(--color-border)]/60"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={usage.quotaBytes}
            aria-valuenow={usage.usedBytes}
            aria-label={usageLabel}
          >
            <div
              className={cn("h-full rounded-full transition-[width]", progressBarClassName(usage.level))}
              style={{ width: `${usage.percentUsed}%` }}
            />
          </div>
          {usage.level !== "normal" && (
            <p
              className={cn(
                "text-xs leading-relaxed",
                usage.level === "critical"
                  ? "text-[var(--color-error)]"
                  : "text-[var(--color-accent)]",
              )}
            >
              {usage.level === "critical" ? labels.storageUsageCritical : labels.storageUsageWarning}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
