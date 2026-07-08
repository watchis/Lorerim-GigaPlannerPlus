import { ChevronRight, X } from "lucide-react";
import type { CharacterOptionControlProps } from "@/extension-api";
import { SkillIcon } from "@/components/SkillIcon";
import { getOghmaSkillLimit } from "@/lib/oghmaInfinium";
import { cn } from "@/lib/utils";
import { useBuildStore } from "@/store/buildStore";
import { usePanelLabels } from "@/theme/ThemeProvider";

function SelectionChip({
  id,
  label,
  onRemove,
}: {
  id: string;
  label: string;
  onRemove?: () => void;
}) {
  return (
    <span
      role={onRemove ? "button" : undefined}
      tabIndex={onRemove ? 0 : undefined}
      onClick={onRemove}
      onKeyDown={(event) => {
        if (!onRemove) return;
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onRemove();
        }
      }}
      className={cn(
        "group inline-flex max-w-full items-center gap-1.5 rounded-md border border-[var(--color-border)]/50",
        "bg-[var(--color-surface-elevated)]/40 px-2 py-0.5 text-[11px] font-medium leading-tight text-[var(--color-foreground)]",
        onRemove &&
          "cursor-pointer hover:border-[var(--color-accent)]/35 hover:bg-[var(--color-accent)]/8 hover:text-[var(--color-accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]/50",
      )}
    >
      <SkillIcon
        skillId={id}
        className="h-3.5 w-3.5 shrink-0 text-[var(--color-accent-muted)] group-hover:text-[var(--color-accent)]"
      />
      <span className="truncate">{label}</span>
      {onRemove && (
        <X className="h-3 w-3 shrink-0 text-[var(--color-muted)] opacity-50 group-hover:text-[var(--color-accent)] group-hover:opacity-100" />
      )}
    </span>
  );
}

export function OghmaInfiniumControl({
  option,
  selectedChoiceId,
  labels,
  onSelect,
  onOpenOghmaSkillsPicker,
}: CharacterOptionControlProps) {
  const setupLabels = usePanelLabels("character-setup");
  const gameData = useBuildStore((s) => s.gameData);
  const build = useBuildStore((s) => s.build);
  const toggleOghmaSkill = useBuildStore((s) => s.toggleOghmaSkill);

  if (!gameData) return null;

  const { game } = gameData;
  const claimedChoice =
    option.choices.find((choice) => choice.id !== option.defaultChoice)?.id ?? "claimed";
  const checked = selectedChoiceId !== option.defaultChoice;
  const description = option.descriptionLabel ? labels[option.descriptionLabel] : undefined;
  const remaining = getOghmaSkillLimit(game) - build.oghmaSkillIds.length;
  const selectedItems = build.oghmaSkillIds.map((skillId) => {
    const skill = game.skills.find((entry) => entry.id === skillId);
    return { id: skillId, label: skill?.name ?? skillId };
  });

  return (
    <section
      className={cn(
        "rounded-[var(--radius-md)] border p-3.5 transition-colors",
        checked
          ? "border-[var(--color-accent)]/35 bg-[var(--color-accent)]/[0.04]"
          : "border-[var(--color-border)]/70 bg-[var(--color-surface-elevated)]/35",
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
          "flex cursor-pointer items-start gap-3 rounded-[var(--radius-md)] border px-3 py-2.5 transition-colors",
          checked
            ? "border-[var(--color-accent)]/30 bg-[var(--color-accent)]/[0.06]"
            : "border-[var(--color-border)]/60 bg-[var(--color-background)]/40 hover:border-[var(--color-accent-muted)]/50 hover:bg-[var(--color-surface-elevated)]/50",
        )}
      >
        <input
          type="checkbox"
          checked={checked}
          onChange={(event) =>
            onSelect(event.target.checked ? claimedChoice : option.defaultChoice)
          }
          className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--color-accent)]"
        />
        <div className="min-w-0 flex-1">
          <span className="text-sm font-medium text-[var(--color-foreground)]">
            {checked
              ? (labels[claimedChoice] ?? labels.oghmaClaimed ?? "Used")
              : (labels.oghmaNone ?? "Not used")}
          </span>
        </div>
      </label>

      {checked && (
        <div className="mt-3 space-y-1">
          <button
            type="button"
            onClick={() => onOpenOghmaSkillsPicker?.()}
            className="group flex min-h-12 w-full items-center gap-2.5 rounded-[var(--radius-md)] border px-3 py-2.5 text-left transition-colors border-[var(--color-border)]/70 bg-[var(--color-surface-elevated)]/40 hover:border-[var(--color-accent-muted)]/60 hover:bg-[var(--color-surface-elevated)]"
          >
            <div className="min-w-0 flex-1">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-muted)]">
                {labels.oghmaSkills ?? "Oghma Skills"}
                <span className="ml-1.5 font-normal normal-case tracking-normal text-[var(--color-muted)]">
                  ({remaining} left)
                </span>
              </div>
              {selectedItems.length === 0 && (
                <div className="truncate text-sm font-medium text-[var(--color-muted)]">
                  {setupLabels.none ?? "None"}
                </div>
              )}
            </div>
            <ChevronRight className="h-4 w-4 shrink-0 text-[var(--color-muted)] transition-colors group-hover:text-[var(--color-accent)]" />
          </button>
          {selectedItems.length > 0 && (
            <div className="flex flex-wrap gap-1.5 px-0.5">
              {selectedItems.map((item) => (
                <SelectionChip
                  key={item.id}
                  id={item.id}
                  label={item.label}
                  onRemove={() => toggleOghmaSkill(item.id)}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
