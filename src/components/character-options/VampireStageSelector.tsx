import { cn } from "@/lib/utils";
import { isVampireStageId } from "@/lib/supernatural";
import type { CharacterOption } from "@/data/schemas";

interface VampireStageSelectorProps {
  option: CharacterOption;
  selectedChoiceId: string;
  stageLabel: string;
  labels: Record<string, string>;
  onSelect: (choiceId: string) => void;
}

export function VampireStageSelector({
  option,
  selectedChoiceId,
  stageLabel,
  labels,
  onSelect,
}: VampireStageSelectorProps) {
  const stageChoices = option.choices.filter((choice) => isVampireStageId(choice.id));
  if (stageChoices.length === 0) return null;

  return (
    <div className="space-y-1.5">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-muted)]">
        {stageLabel}
      </p>
      <div
        role="radiogroup"
        aria-label={stageLabel}
        className="grid grid-cols-2 gap-1 rounded-[var(--radius-md)] border border-[var(--color-border)]/60 bg-[var(--color-surface-elevated)]/20 p-1 sm:grid-cols-4"
      >
        {stageChoices.map((choice, index) => {
          const selected = selectedChoiceId === choice.id;
          const shortLabel = labels[`${choice.label}Short`] ?? labels[choice.label] ?? choice.label;

          return (
            <button
              key={choice.id}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onSelect(choice.id)}
              className={cn(
                "flex min-w-0 flex-col items-center gap-0.5 rounded-[var(--radius-sm)] px-1.5 py-2 text-center transition-colors",
                selected
                  ? "bg-[var(--color-accent)]/14 text-[var(--color-accent)] shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--color-accent)_35%,transparent)]"
                  : "text-[var(--color-foreground)] hover:bg-[var(--color-surface-elevated)]/50",
              )}
            >
              <span
                className={cn(
                  "text-[9px] font-semibold uppercase tracking-wider",
                  selected ? "text-[var(--color-accent)]" : "text-[var(--color-muted)]",
                )}
              >
                {index + 1}
              </span>
              <span className="w-full truncate text-xs font-medium leading-tight">{shortLabel}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
