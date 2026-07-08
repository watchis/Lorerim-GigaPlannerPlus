export const variantSelectItemClassName =
  "min-h-0 min-w-0 flex-1 overflow-hidden py-2 pl-8 pr-2 text-sm leading-snug focus:bg-[var(--color-surface)]";

interface VariantOptionProps {
  name: string;
  levelText: string;
}

export function VariantOption({ name, levelText }: VariantOptionProps) {
  return (
    <span className="grid w-full min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
      <span className="truncate font-medium">{name}</span>
      <span
        data-variant-level-chip
        className="shrink-0 rounded-[var(--radius-sm)] bg-[var(--color-background)]/70 px-1.5 py-0.5 font-mono text-xs tabular-nums text-[var(--color-muted)]"
      >
        {levelText}
      </span>
    </span>
  );
}
