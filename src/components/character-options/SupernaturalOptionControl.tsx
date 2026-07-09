import { X } from "lucide-react";
import type { CharacterOptionControlProps } from "@/extension-api";
import { cn } from "@/lib/utils";
import {
  isSupernaturalOptionBlocked,
  SUPERNATURAL_CLAIMED_CHOICE,
} from "@/lib/supernatural";
import { useBuildStore } from "@/store/buildStore";

interface SupernaturalOptionControlProps extends CharacterOptionControlProps {
  optionId: string;
}

export function SupernaturalOptionControl({
  option,
  optionId,
  selectedChoiceId,
  labels,
  onSelect,
}: SupernaturalOptionControlProps) {
  const gameData = useBuildStore((s) => s.gameData);
  const build = useBuildStore((s) => s.build);

  if (!gameData) return null;

  const claimedChoice =
    option.choices.find((choice) => choice.id !== option.defaultChoice)?.id ??
    SUPERNATURAL_CLAIMED_CHOICE;
  const checked = selectedChoiceId !== option.defaultChoice;
  const blocked = isSupernaturalOptionBlocked(gameData.game, build, optionId);
  const description = option.descriptionLabel ? labels[option.descriptionLabel] : undefined;
  const blockedHint = labels.supernaturalBlockedHint;

  return (
    <section
      className={cn(
        "rounded-[var(--radius-md)] border p-3.5 transition-colors",
        checked
          ? "border-[var(--color-accent)]/35 bg-[var(--color-accent)]/[0.04]"
          : "border-[var(--color-border)]/70 bg-[var(--color-surface-elevated)]/35",
        blocked && !checked && "opacity-60",
      )}
    >
      <div className="mb-3 flex items-start justify-between gap-2">
        <div className="min-w-0 space-y-1">
          <h3 className="text-sm font-semibold text-[var(--color-foreground)]">
            {labels[option.titleLabel] ?? option.titleLabel}
          </h3>
          {description && (
            <p className="text-xs leading-relaxed text-[var(--color-muted)]">{description}</p>
          )}
          {blocked && !checked && blockedHint && (
            <p className="text-xs leading-relaxed text-[var(--color-muted)]">{blockedHint}</p>
          )}
        </div>
        {checked && (
          <button
            type="button"
            onClick={() => onSelect(option.defaultChoice)}
            aria-label={`${labels.clearSelection ?? "Clear"} ${labels[option.titleLabel] ?? option.titleLabel}`}
            className="flex shrink-0 items-center gap-1 rounded-[var(--radius-md)] border border-[var(--color-border)]/70 px-2 py-1 text-[10px] font-medium text-[var(--color-muted)] transition-colors hover:border-[var(--color-accent)]/35 hover:bg-[var(--color-accent)]/8 hover:text-[var(--color-accent)]"
          >
            <X className="h-3 w-3" />
            {labels.clearSelection}
          </button>
        )}
      </div>

      <label
        className={cn(
          "flex cursor-pointer items-center gap-3 rounded-[var(--radius-md)] border px-3 py-2.5 transition-colors",
          checked
            ? "border-[var(--color-accent)]/40 bg-[var(--color-accent)]/8"
            : "border-[var(--color-border)]/70 bg-[var(--color-background)]/45",
          blocked && !checked && "cursor-not-allowed",
        )}
      >
        <input
          type="checkbox"
          checked={checked}
          disabled={blocked && !checked}
          onChange={(event) =>
            onSelect(event.target.checked ? claimedChoice : option.defaultChoice)
          }
          className="h-4 w-4 rounded border-[var(--color-border)] text-[var(--color-accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]/50 disabled:cursor-not-allowed"
        />
        <span className="text-sm font-medium text-[var(--color-foreground)]">
          {checked
            ? (labels[option.choices.find((choice) => choice.id === claimedChoice)?.label ?? "claimed"] ??
              "Active")
            : (labels[option.choices.find((choice) => choice.id === option.defaultChoice)?.label ?? "none"] ??
              "Inactive")}
        </span>
      </label>
    </section>
  );
}
