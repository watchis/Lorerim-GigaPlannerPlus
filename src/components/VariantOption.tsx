export const variantSelectItemClassName =
  "min-h-0 py-2 pl-8 pr-2 text-sm leading-snug focus:bg-[var(--color-surface)]";

interface VariantOptionProps {
  name: string;
  levelText: string;
}

export function VariantOption({ name, levelText }: VariantOptionProps) {
  return (
    <span className="flex w-full min-w-0 items-center justify-between gap-2">
      <span className="min-w-0 truncate font-medium">{name}</span>
      <span className="shrink-0 rounded-[var(--radius-sm)] bg-[var(--color-background)]/70 px-1.5 py-0.5 font-mono text-xs tabular-nums text-[var(--color-muted)]">
        {levelText}
      </span>
    </span>
  );
}
