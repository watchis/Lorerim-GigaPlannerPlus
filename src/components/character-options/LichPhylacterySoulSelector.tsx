import { cn } from "@/lib/utils";
import { Minus, Plus } from "lucide-react";

interface LichPhylacterySoulSelectorProps {
  souls: number;
  maxSouls: number;
  label: string;
  onChange: (souls: number) => void;
}

export function LichPhylacterySoulSelector({
  souls,
  maxSouls,
  label,
  onChange,
}: LichPhylacterySoulSelectorProps) {
  const clamped = Math.min(maxSouls, Math.max(0, souls));

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-muted)]">
          {label}
        </p>
        <p className="text-xs font-semibold tabular-nums text-[var(--color-accent)]">
          {clamped} / {maxSouls}
        </p>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          aria-label="Decrease phylactery souls"
          disabled={clamped <= 0}
          onClick={() => onChange(clamped - 1)}
          className={cn(
            "flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--radius-md)] border border-[var(--color-border)]/70 text-[var(--color-foreground)] transition-colors",
            clamped <= 0
              ? "cursor-not-allowed opacity-40"
              : "hover:border-[var(--color-accent)]/40 hover:bg-[var(--color-accent)]/10 hover:text-[var(--color-accent)]",
          )}
        >
          <Minus className="h-3.5 w-3.5" />
        </button>

        <input
          type="range"
          min={0}
          max={maxSouls}
          step={1}
          value={clamped}
          aria-label={label}
          onChange={(event) => onChange(Number.parseInt(event.target.value, 10))}
          className="h-2 w-full cursor-pointer appearance-none rounded-full bg-[var(--color-border)]/60 accent-[var(--color-accent)]"
        />

        <button
          type="button"
          aria-label="Increase phylactery souls"
          disabled={clamped >= maxSouls}
          onClick={() => onChange(clamped + 1)}
          className={cn(
            "flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--radius-md)] border border-[var(--color-border)]/70 text-[var(--color-foreground)] transition-colors",
            clamped >= maxSouls
              ? "cursor-not-allowed opacity-40"
              : "hover:border-[var(--color-accent)]/40 hover:bg-[var(--color-accent)]/10 hover:text-[var(--color-accent)]",
          )}
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
