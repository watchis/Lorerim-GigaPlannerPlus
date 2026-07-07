import { HardDrive } from "lucide-react";
import { useEffect, useState } from "react";
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

interface StorageMonitorProps {
  className?: string;
}

export function StorageMonitor({ className }: StorageMonitorProps) {
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
    <div
      className={cn(
        "rounded-[var(--radius-md)] border border-[var(--color-border)]/70 bg-[var(--color-surface-elevated)]/30 px-3 py-2.5",
        className,
      )}
      aria-label={usageLabel}
    >
      <div className="flex items-center gap-2">
        <HardDrive className="h-3.5 w-3.5 shrink-0 text-[var(--color-muted)]" aria-hidden />
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-2">
            <p className="text-xs font-medium text-[var(--color-foreground)]">
              {labels.storageMonitorTitle}
            </p>
            <p className="shrink-0 font-mono text-[11px] tabular-nums text-[var(--color-muted)]">
              {usageLabel}
            </p>
          </div>
          <div
            className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-[var(--color-border)]/60"
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
                "mt-1 text-[11px] leading-snug",
                usage.level === "critical"
                  ? "text-[var(--color-error)]"
                  : "text-[var(--color-accent)]",
              )}
            >
              {usage.level === "critical" ? labels.storageUsageCritical : labels.storageUsageWarning}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
