import { Download } from "lucide-react";
import { cn } from "@/lib/utils";

interface ImportedBuildBadgeProps {
  label: string;
  className?: string;
}

export function ImportedBuildBadge({ label, className }: ImportedBuildBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full border border-[var(--color-border)] bg-[var(--color-surface-elevated)] px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-[var(--color-muted)]",
        className,
      )}
    >
      <Download className="h-3 w-3" aria-hidden />
      {label}
    </span>
  );
}
