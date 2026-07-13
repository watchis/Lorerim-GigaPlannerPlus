import { Moon, X } from "lucide-react";
import { useOptimistic, type ChangeEventHandler, type ReactNode } from "react";
import type { CharacterOptionControlProps } from "@/extension-api";
import { SupernaturalDetailContent } from "@/components/option-details/SupernaturalDetailContent";
import { SkillIcon } from "@/components/SkillIcon";
import { LichPhylacterySoulSelector } from "@/components/character-options/LichPhylacterySoulSelector";
import { VampireStageSelector } from "@/components/character-options/VampireStageSelector";
import { cn } from "@/lib/utils";
import {
  DEFAULT_LICH_SOULS,
  formatLichPerSoulSummary,
  formatLichPhylacteryNextUnlockSubtitle,
  getLichPhylactery,
  getUnlockedLichThresholds,
  isLichSoulChoiceId,
  lichSoulChoiceId,
  parseLichSoulCount,
} from "@/lib/lichPhylactery";
import {
  DEFAULT_VAMPIRE_STAGE,
  getLichForm,
  getLichRacialBonusForRace,
  getVampireRacialBonusForRace,
  getVampireStage,
  getWerewolfForm,
  getWerewolfRacialBonusForRace,
  isVampireStageId,
  LICH_OPTION_ID,
  SUPERNATURAL_CLAIMED_CHOICE,
  VAMPIRE_OPTION_ID,
  WEREWOLF_OPTION_ID,
} from "@/lib/supernatural";
import { useBuildStore } from "@/store/buildStore";
import {
  DetailBulletList,
  DetailSection,
} from "@/components/option-details/DetailSection";

interface SupernaturalOptionControlProps extends CharacterOptionControlProps {
  optionId: string;
}

function CurseToggleRow({
  checked,
  onChange,
  className,
  labelText,
}: {
  checked: boolean;
  onChange: ChangeEventHandler<HTMLInputElement>;
  className?: string;
  labelText: ReactNode;
}) {
  return (
    <label
      className={cn(
        "flex cursor-pointer items-center gap-3 rounded-[var(--radius-md)] border px-3 py-2.5 transition-colors",
        className,
      )}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="h-4 w-4 shrink-0 rounded border-[var(--color-border)] text-[var(--color-accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]/50"
      />
      <span className="text-sm font-medium text-[var(--color-foreground)]">{labelText}</span>
    </label>
  );
}

export function SupernaturalOptionControl({
  option,
  optionId,
  selectedChoiceId,
  labels,
  onSelect,
}: SupernaturalOptionControlProps) {
  const game = useBuildStore((s) => s.gameData?.game);
  const raceId = useBuildStore((s) => s.build.raceId);
  const [displayChoiceId, setDisplayChoiceId] = useOptimistic(selectedChoiceId);

  if (!game) return null;

  const isVampire = optionId === VAMPIRE_OPTION_ID;
  const isWerewolf = optionId === WEREWOLF_OPTION_ID;
  const isLich = optionId === LICH_OPTION_ID;
  const checked = displayChoiceId !== option.defaultChoice;
  const description = option.descriptionLabel ? labels[option.descriptionLabel] : undefined;
  const vampireStage =
    isVampire && isVampireStageId(displayChoiceId)
      ? getVampireStage(game, displayChoiceId)
      : undefined;
  const form = isVampire
    ? vampireStage
    : checked
      ? isLich
        ? getLichForm(game)
        : getWerewolfForm(game)
      : undefined;
  const resolvedRaceId = raceId && raceId !== "none" ? raceId : null;
  const racialBonus = resolvedRaceId
    ? checked
      ? isVampire
        ? getVampireRacialBonusForRace(game, resolvedRaceId)
        : isWerewolf
          ? getWerewolfRacialBonusForRace(game, resolvedRaceId)
          : getLichRacialBonusForRace(game, resolvedRaceId)
      : undefined
    : undefined;
  const detailLabels = {
    bonuses: labels.bonuses ?? "Bonuses",
    racialBonus: labels.racialBonus ?? "Racial ability",
    detriments: labels.detriments ?? "Other Effects",
  };
  const claimedChoice =
    option.choices.find((choice) => choice.id !== option.defaultChoice)?.id ??
    SUPERNATURAL_CLAIMED_CHOICE;
  const phylactery = isLich ? getLichPhylactery(game) : undefined;
  const lichSouls =
    isLich && phylactery
      ? (parseLichSoulCount(displayChoiceId, phylactery.maxSouls) ?? DEFAULT_LICH_SOULS)
      : DEFAULT_LICH_SOULS;
  const unlockedThresholds =
    phylactery && checked ? getUnlockedLichThresholds(phylactery, lichSouls) : [];
  const nextUnlock =
    phylactery && checked
      ? formatLichPhylacteryNextUnlockSubtitle(
          phylactery,
          lichSouls,
          labels.lichPhylacteryNext ?? "Next unlock at {count} souls: {name}",
        )
      : null;
  const inactiveLabel =
    labels[option.choices.find((choice) => choice.id === option.defaultChoice)?.label ?? "none"] ??
    "Inactive";
  const activeLabel = isVampire
    ? (labels.supernaturalVampire ?? "Vampire")
    : isLich
      ? (labels.supernaturalLich ?? "Lich")
      : (labels[option.choices.find((choice) => choice.id === claimedChoice)?.label ?? "claimed"] ??
        "Active");

  const selectChoice = (choiceId: string) => {
    setDisplayChoiceId(choiceId);
    onSelect(choiceId);
  };

  return (
    <article
      className={cn(
        "rounded-[var(--radius-md)] border p-3.5 transition-colors",
        checked
          ? "border-[var(--color-accent)]/40 bg-[var(--color-accent)]/[0.06] shadow-[var(--shadow-glow)]"
          : "border-[var(--color-border)]/70 bg-[var(--color-background)]/40",
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
              <SkillIcon skillId={isLich ? "lich" : "werewolf"} className="h-4 w-4" />
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
          </div>
        </div>
        {checked && (
          <button
            type="button"
            onClick={() => selectChoice(option.defaultChoice)}
            aria-label={`${labels.clearSelection ?? "Clear"} ${labels[option.titleLabel] ?? option.titleLabel}`}
            className="flex shrink-0 items-center gap-1 rounded-[var(--radius-md)] border border-[var(--color-border)]/70 px-2 py-1 text-[10px] font-medium text-[var(--color-muted)] transition-colors hover:border-[var(--color-accent)]/35 hover:bg-[var(--color-accent)]/8 hover:text-[var(--color-accent)]"
          >
            <X className="h-3 w-3" />
            {labels.clearSelection}
          </button>
        )}
      </div>

      {isVampire ? (
        <div className="space-y-3">
          <CurseToggleRow
            checked={checked}
            className={cn(
              checked
                ? "border-[var(--color-accent)]/45 bg-[var(--color-accent)]/10"
                : "border-[var(--color-border)]/70 bg-[var(--color-surface-elevated)]/25 hover:border-[var(--color-accent-muted)]/40 hover:bg-[var(--color-surface-elevated)]/40",
            )}
            onChange={(event) =>
              selectChoice(
                event.target.checked
                  ? isVampireStageId(displayChoiceId)
                    ? displayChoiceId
                    : DEFAULT_VAMPIRE_STAGE
                  : option.defaultChoice,
              )
            }
            labelText={checked ? activeLabel : inactiveLabel}
          />

          {checked && (
            <VampireStageSelector
              option={option}
              selectedChoiceId={displayChoiceId}
              stageLabel={labels.vampireStageLabel ?? "Hunger stage"}
              labels={labels}
              onSelect={selectChoice}
            />
          )}
        </div>
      ) : isLich && phylactery ? (
        <div className="space-y-3">
          <CurseToggleRow
            checked={checked}
            className={cn(
              checked
                ? "border-[var(--color-accent)]/45 bg-[var(--color-accent)]/10"
                : "border-[var(--color-border)]/70 bg-[var(--color-surface-elevated)]/25 hover:border-[var(--color-accent-muted)]/40 hover:bg-[var(--color-surface-elevated)]/40",
            )}
            onChange={(event) =>
              selectChoice(
                event.target.checked
                  ? isLichSoulChoiceId(displayChoiceId, phylactery.maxSouls)
                    ? displayChoiceId
                    : lichSoulChoiceId(DEFAULT_LICH_SOULS)
                  : option.defaultChoice,
              )
            }
            labelText={checked ? activeLabel : inactiveLabel}
          />

          {checked && (
            <LichPhylacterySoulSelector
              souls={lichSouls}
              maxSouls={phylactery.maxSouls}
              label={labels.lichPhylacterySoulsLabel ?? "Phylactery souls"}
              onChange={(souls) => selectChoice(lichSoulChoiceId(souls))}
            />
          )}
        </div>
      ) : (
        <CurseToggleRow
          checked={checked}
          className={cn(
            checked
              ? "border-[var(--color-accent)]/45 bg-[var(--color-accent)]/10"
              : "border-[var(--color-border)]/70 bg-[var(--color-surface-elevated)]/25 hover:border-[var(--color-accent-muted)]/40 hover:bg-[var(--color-surface-elevated)]/40",
          )}
          onChange={(event) =>
            selectChoice(event.target.checked ? claimedChoice : option.defaultChoice)
          }
          labelText={checked ? activeLabel : inactiveLabel}
        />
      )}

      {checked && form && (
        <div className="mt-3 space-y-3 border-t border-[var(--color-border)]/50 pt-3">
          <SupernaturalDetailContent
            form={form}
            racialBonus={racialBonus}
            labels={detailLabels}
            hideHeader
          />

          {isLich && phylactery && (
            <>
              {lichSouls > 0 && (
                <DetailSection title={labels.lichPhylacteryPerSoul ?? "Per-soul bonuses"}>
                  <DetailBulletList items={formatLichPerSoulSummary(phylactery, lichSouls)} />
                </DetailSection>
              )}

              {unlockedThresholds.length > 0 && (
                <DetailSection title={labels.lichPhylacteryUnlocked ?? "Unlocked thresholds"}>
                  <div className="space-y-2">
                    {unlockedThresholds.map((threshold) => (
                      <div
                        key={threshold.souls}
                        className="rounded-[var(--radius-md)] border border-[var(--color-border)]/50 bg-[var(--color-surface-elevated)]/35 px-3 py-2"
                      >
                        <p className="text-xs font-semibold text-[var(--color-accent)]">
                          {threshold.souls} — {threshold.name}
                        </p>
                        <p className="mt-1 text-xs leading-relaxed text-[var(--color-muted)]">
                          {threshold.description}
                        </p>
                      </div>
                    ))}
                  </div>
                </DetailSection>
              )}

              {nextUnlock && (
                <p className="text-xs leading-relaxed text-[var(--color-muted)]">{nextUnlock}</p>
              )}
            </>
          )}

          {!resolvedRaceId && Boolean(racialBonus || isVampire || isWerewolf) && (
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
