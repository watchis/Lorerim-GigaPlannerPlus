import { type ReactNode } from "react";
import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ResetPerksButtonProps {
  children: ReactNode;
  onClick: () => void;
  className?: string;
}

export function ResetPerksButton({ children, onClick, className }: ResetPerksButtonProps) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className={cn(
        "h-6 min-w-0 gap-1.5 px-2 text-xs font-normal text-[var(--color-foreground)] hover:bg-[var(--color-surface-elevated)]/60",
        className,
      )}
      onClick={onClick}
    >
      <RotateCcw className="h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden />
      <span>{children}</span>
    </Button>
  );
}
