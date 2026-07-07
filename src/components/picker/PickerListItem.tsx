import type { ReactNode } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface PickerListItemProps {
  name: string;
  isSelected: boolean;
  isPreview?: boolean;
  isEnabled?: boolean;
  onSelect: () => void;
  onPreview?: () => void;
  /** When true, row tap previews instead of selecting (touch layouts). */
  touchPreviewOnly?: boolean;
  leading?: ReactNode;
}

export function PickerListItem({
  name,
  isSelected,
  isPreview = false,
  isEnabled = true,
  onSelect,
  onPreview,
  touchPreviewOnly = false,
  leading,
}: PickerListItemProps) {
  const handleClick = () => {
    if (touchPreviewOnly && onPreview) {
      onPreview();
      return;
    }
    onSelect();
  };

  return (
    <button
      type="button"
      disabled={!isEnabled && !isSelected}
      onMouseEnter={touchPreviewOnly ? undefined : onPreview}
      onFocus={touchPreviewOnly ? undefined : onPreview}
      onClick={handleClick}
      className={cn(
        "flex w-full min-w-0 max-w-full items-center gap-2 rounded-[var(--radius-md)] border px-3 py-2.5 text-left transition-colors max-md:min-h-12",
        isSelected
          ? "border-[var(--color-accent)]/35 bg-[var(--color-accent)]/8"
          : isPreview
            ? "border-[var(--color-accent-muted)]/50 bg-[var(--color-surface-elevated)]"
            : "border-[var(--color-border)]/40 hover:border-[var(--color-border)] hover:bg-[var(--color-surface-elevated)]/70",
        !isEnabled && !isSelected && "cursor-not-allowed opacity-45",
      )}
    >
      {leading}
      <span
        className={cn(
          "min-w-0 flex-1 truncate text-sm font-medium",
          isSelected ? "text-[var(--color-accent)]" : "text-[var(--color-foreground)]",
        )}
      >
        {name}
      </span>
      {isSelected && <Check className="h-3.5 w-3.5 shrink-0 text-[var(--color-accent)]" />}
    </button>
  );
}

interface PickerOptionTileProps {
  name: string;
  isSelected: boolean;
  isEnabled?: boolean;
  onSelect: () => void;
  leading?: ReactNode;
}

export function PickerOptionTile({
  name,
  isSelected,
  isEnabled = true,
  onSelect,
  leading,
}: PickerOptionTileProps) {
  return (
    <button
      type="button"
      disabled={!isEnabled && !isSelected}
      onClick={onSelect}
      className={cn(
        "flex items-center gap-2 rounded-[var(--radius-md)] border px-3 py-2.5 text-left transition-colors max-md:min-h-12",
        isSelected
          ? "border-[var(--color-accent)]/40 bg-[var(--color-accent)]/8"
          : isEnabled
            ? "border-[var(--color-border)]/70 bg-[var(--color-surface-elevated)]/50 hover:border-[var(--color-accent-muted)] hover:bg-[var(--color-surface-elevated)]"
            : "cursor-not-allowed border-[var(--color-border)]/50 opacity-45",
      )}
    >
      {leading}
      <span
        className={cn(
          "min-w-0 flex-1 truncate text-sm font-medium",
          isSelected ? "text-[var(--color-accent)]" : "text-[var(--color-foreground)]",
        )}
      >
        {name}
      </span>
      {isSelected && <Check className="h-3.5 w-3.5 shrink-0 text-[var(--color-accent)]" />}
    </button>
  );
}

export function PickerListPanel({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "flex min-h-0 min-w-0 flex-col gap-2 rounded-[var(--radius-md)] border border-[var(--color-border)]/70 bg-[var(--color-surface)]/40 p-2",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function PickerDetailPanel({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-[var(--radius-md)] border border-[var(--color-border)]/70 bg-[var(--color-background)]/50",
        className,
      )}
    >
      {children}
    </div>
  );
}
