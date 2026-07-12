import { AlertCircle, AlertTriangle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  formatImportedBuildVersionWarning,
  type ImportedBuildVersionMismatch,
} from "@/lib/modpackVersion";
import { cn } from "@/lib/utils";

interface ImportedBuildVersionWarningProps {
  mismatch: ImportedBuildVersionMismatch;
  warningLabel: string;
  errorLabel: string;
  dismissLabel: string;
  onDismiss: () => void;
  className?: string;
}

export function ImportedBuildVersionWarning({
  mismatch,
  warningLabel,
  errorLabel,
  dismissLabel,
  onDismiss,
  className,
}: ImportedBuildVersionWarningProps) {
  const isError = mismatch.level === "error";
  const message = formatImportedBuildVersionWarning(
    isError ? errorLabel : warningLabel,
    mismatch,
  );
  const Icon = isError ? AlertCircle : AlertTriangle;

  return (
    <div
      role="alert"
      className={cn(
        "flex items-start gap-3 rounded-[var(--radius-md)] border px-3 py-2.5 text-sm leading-snug",
        isError
          ? "border-[var(--color-error)]/50 bg-[var(--color-error)]/10 text-[var(--color-error)]"
          : "border-[var(--color-accent)]/40 bg-[var(--color-accent)]/10 text-[var(--color-foreground)]",
        className,
      )}
    >
      <Icon
        className={cn(
          "mt-0.5 h-4 w-4 shrink-0",
          isError ? "text-[var(--color-error)]" : "text-[var(--color-accent)]",
        )}
        aria-hidden
      />
      <p className="min-w-0 flex-1">{message}</p>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className={cn(
          "h-7 w-7 shrink-0",
          isError
            ? "text-[var(--color-error)] hover:bg-[var(--color-error)]/15 hover:text-[var(--color-error)]"
            : "text-[var(--color-muted)] hover:bg-[var(--color-accent)]/15 hover:text-[var(--color-foreground)]",
        )}
        aria-label={dismissLabel}
        onClick={onDismiss}
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}
