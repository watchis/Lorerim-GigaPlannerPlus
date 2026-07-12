import { cn } from "@/lib/utils";
import type { CharacterOptionControlProps } from "@/extension-api";
import { AU_NATUREL_ARMOR_SLOTS } from "@/lib/auNaturel";

export function AuNaturelGearControl({
  option,
  selectedChoiceId,
  labels,
  onSelect,
}: CharacterOptionControlProps) {
  const title = labels[option.titleLabel] ?? option.titleLabel;
  const hint = option.descriptionLabel ? labels[option.descriptionLabel] : undefined;

  return (
    <section className="rounded-[var(--radius-md)] border border-[var(--color-border)]/70 bg-[var(--color-surface-elevated)]/35 px-3 py-2.5">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold text-[var(--color-foreground)]">{title}</h3>
          {hint && (
            <p className="text-[11px] leading-snug text-[var(--color-muted)]">{hint}</p>
          )}
        </div>
        <div
          className="inline-flex shrink-0 rounded-[var(--radius-md)] border border-[var(--color-border)]/70 bg-[var(--color-background)]/45 p-0.5"
          role="group"
          aria-label={title}
        >
          {Array.from({ length: AU_NATUREL_ARMOR_SLOTS + 1 }, (_, value) => {
            const choiceId = String(value);
            const selected = selectedChoiceId === choiceId;
            return (
              <button
                key={choiceId}
                type="button"
                onClick={() => onSelect(choiceId)}
                aria-pressed={selected}
                className={cn(
                  "min-w-8 rounded-[calc(var(--radius-md)-2px)] px-2 py-1 text-xs font-semibold tabular-nums transition-colors",
                  selected
                    ? "bg-[var(--color-accent)]/15 text-[var(--color-accent)]"
                    : "text-[var(--color-muted)] hover:bg-[var(--color-surface-elevated)]/80 hover:text-[var(--color-foreground)]",
                )}
              >
                {value}
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
