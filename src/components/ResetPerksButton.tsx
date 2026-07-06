import { type ReactNode } from "react";
import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ResetPerksButtonProps {
  children: ReactNode;
  onClick: () => void;
  className?: string;
  iconOnly?: boolean;
  ariaLabel?: string;
}

export function ResetPerksButton({
  children,
  onClick,
  className,
  iconOnly = false,
  ariaLabel,
}: ResetPerksButtonProps) {
  const label = ariaLabel ?? (typeof children === "string" ? children : undefined);

  return (
    <Button
      type="button"
      variant="ghost"
      size={iconOnly ? "icon" : "sm"}
      className={cn(
        iconOnly
          ? "h-7 w-7 shrink-0 text-[var(--color-foreground)] hover:bg-[var(--color-surface-elevated)]/60"
          : "h-6 min-w-0 gap-1.5 px-2 text-xs font-normal text-[var(--color-foreground)] hover:bg-[var(--color-surface-elevated)]/60",
        className,
      )}
      onClick={onClick}
      aria-label={iconOnly ? label : undefined}
      title={iconOnly ? label : undefined}
    >
      <RotateCcw className={cn("shrink-0 opacity-70", iconOnly ? "h-4 w-4" : "h-3.5 w-3.5")} aria-hidden />
      {!iconOnly && <span className="truncate">{children}</span>}
    </Button>
  );
}
