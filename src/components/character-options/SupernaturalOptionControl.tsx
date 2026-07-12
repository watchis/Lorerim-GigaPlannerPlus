import { Moon, X } from "lucide-react";
import type { CharacterOptionControlProps } from "@/extension-api";
import { SupernaturalDetailContent } from "@/components/option-details/SupernaturalDetailContent";
import { SkillIcon } from "@/components/SkillIcon";
import { cn } from "@/lib/utils";
import {
  DEFAULT_VAMPIRE_STAGE,
  getActiveVampireStage,
  getVampireRacialBonus,
  getWerewolfForm,
  getWerewolfRacialBonus,
  isSupernaturalOptionBlocked,
  isVampireStageId,
  SUPERNATURAL_CLAIMED_CHOICE,
  VAMPIRE_OPTION_ID,
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

  const isVampire = optionId === VAMPIRE_OPTION_ID;
  const checked = selectedChoiceId !== option.defaultChoice;
  const blocked = isSupernaturalOptionBlocked(gameData.game, build, optionId);
  const description = option.descriptionLabel ? labels[option.descriptionLabel] : undefined;
  const blockedHint = labels.supernaturalBlockedHint;
  const vampireStage = isVampire ? getActiveVampireStage(gameData.game, build) : undefined;
  const form = isVampire ? vampireStage : getWerewolfForm(gameData.game);
  const racialBonus = isVampire
    ? getVampireRacialBonus(gameData.game, build)
    : getWerewolfRacialBonus(gameData.game, build);
  const hasRace = Boolean(build.raceId && build.raceId !== "none");
  const detailLabels = {
    bonuses: labels.bonuses ?? "Bonuses",
    racialBonus: labels.racialBonus ?? "Racial ability",
    detriments: labels.detriments ?? "Detriments",
  };
  const stageChoices = option.choices.filter((choice) => isVampireStageId(choice.id));
  const claimedChoice =
    option.choices.find((choice) => choice.id !== option.defaultChoice)?.id ??
    SUPERNATURAL_CLAIMED_CHOICE;

  return (
    <article
      className={cn(
        "rounded-[var(--radius-md)] border p-3.5 transition-colors",
        checked
          ? "border-[var(--color-accent)]/40 bg-[var(--color-accent)]/[0.06] shadow-[var(--shadow-glow)]"
          : "border-[var(--color-border)]/70 bg-[var(--color-background)]/40",
        blocked && !checked && "opacity-60",
      )}
    >
      <div className="mb-3 flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-start gap-2.5">
          <span
            className={cn(
              "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--radius-md)] border",
              checked
                ? "border-[var(--color-accent)]/35 bg-[var(--color-accent)]/12 text-[var(--color-accent)]"
                : "border-[var(--color-border)]/60 bg-[var(--color-surface-elevated)]/40 text-[var(--color-muted)]",
            )}
          >
            {isVampire ? (
              <Moon className="h-4 w-4" aria-hidden />
            ) : (
              <SkillIcon skillId="werewolf" className="h-4 w-4" />
            )}
          </span>
          <div className="min-w-0 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm font-semibold text-[var(--color-foreground)]">
                {labels[option.titleLabel] ?? option.titleLabel}
              </h3>
              {checked && (
                <span className="inline-flex rounded-full border border-[var(--color-accent)]/30 bg-[var(--color-accent)]/10 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-[var(--color-accent)]">
                  {labels.curseActiveBadge ?? "Active"}
                </span>
              )}
            </div>
            {description && (
              <p className="text-xs leading-relaxed text-[var(--color-muted)]">{description}</p>
            )}
            {blocked && !checked && blockedHint && (
              <p className="text-xs leading-relaxed text-[var(--color-muted)]">{blockedHint}</p>
            )}
          </div>
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

      {isVampire ? (
        <>
          <label
            className={cn(
              "flex cursor-pointer items-center gap-3 rounded-[var(--radius-md)] border px-3 py-2.5 transition-colors",
              checked
                ? "border-[var(--color-accent)]/45 bg-[var(--color-accent)]/10"
                : "border-[var(--color-border)]/70 bg-[var(--color-surface-elevated)]/25 hover:border-[var(--color-accent-muted)]/40 hover:bg-[var(--color-surface-elevated)]/40",
              blocked && !checked && "cursor-not-allowed",
            )}
          >
            <input
              type="checkbox"
              checked={checked}
              disabled={blocked && !checked}
              onChange={(event) =>
                onSelect(
                  event.target.checked
                    ? isVampireStageId(selectedChoiceId)
                      ? selectedChoiceId
                      : DEFAULT_VAMPIRE_STAGE
                    : option.defaultChoice,
                )
              }
              className="h-4 w-4 rounded border-[var(--color-border)] text-[var(--color-accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]/50 disabled:cursor-not-allowed"
            />
            <span className="text-sm font-medium text-[var(--color-foreground)]">
              {checked
                ? (vampireStage?.name ?? labels.supernaturalVampire ?? "Vampire")
                : (labels[option.choices.find((choice) => choice.id === option.defaultChoice)?.label ?? "none"] ??
                  "Inactive")}
            </span>
          </label>

          {checked && stageChoices.length > 0 && (
            <div className="mt-3 space-y-2">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-muted)]">
                {labels.vampireStageLabel ?? "Hunger stage"}
              </p>
              <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
                {stageChoices.map((choice) => (
                  <button
                    key={choice.id}
                    type="button"
                    onClick={() => onSelect(choice.id)}
                    className={cn(
                      "rounded-[var(--radius-md)] border px-2 py-2 text-left text-xs font-medium transition-colors",
                      selectedChoiceId === choice.id
                        ? "border-[var(--color-accent)]/45 bg-[var(--color-accent)]/12 text-[var(--color-accent)]"
                        : "border-[var(--color-border)]/70 bg-[var(--color-surface-elevated)]/25 text-[var(--color-foreground)] hover:border-[var(--color-accent-muted)]/40",
                    )}
                  >
                    {labels[choice.label] ?? choice.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </>
      ) : (
        <label
          className={cn(
            "flex cursor-pointer items-center gap-3 rounded-[var(--radius-md)] border px-3 py-2.5 transition-colors",
            checked
              ? "border-[var(--color-accent)]/45 bg-[var(--color-accent)]/10"
              : "border-[var(--color-border)]/70 bg-[var(--color-surface-elevated)]/25 hover:border-[var(--color-accent-muted)]/40 hover:bg-[var(--color-surface-elevated)]/40",
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
      )}

      {checked && form && (
        <div className="mt-3 space-y-3 border-t border-[var(--color-border)]/50 pt-3">
          <SupernaturalDetailContent
            form={form}
            racialBonus={racialBonus}
            labels={detailLabels}
            hideHeader
          />
          {!hasRace && (
            <p className="text-xs leading-relaxed text-[var(--color-muted)]">
              {labels.selectRaceForRacialAbility ??
                "Select a race in Character Setup to see your racial curse ability."}
            </p>
          )}
        </div>
      )}
    </article>
  );
}
