import type { SupernaturalRacialBonus } from "@/data/schemas";
import { DetailSection } from "@/components/option-details/DetailSection";

interface SupernaturalRaceDetailProps {
  racialBonus?: SupernaturalRacialBonus;
  curseLabel: string;
  racialBonusLabel: string;
  selectRaceHint?: string;
}

export function SupernaturalRaceDetail({
  racialBonus,
  curseLabel,
  racialBonusLabel,
  selectRaceHint,
}: SupernaturalRaceDetailProps) {
  if (!racialBonus && !selectRaceHint) return null;

  return (
    <div className="space-y-4 border-t border-[var(--color-border)]/50 pt-4">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-accent-muted)]">
        {curseLabel}
      </p>
      {racialBonus ? (
        <DetailSection title={racialBonusLabel}>
          <div className="rounded-[var(--radius-md)] border border-[var(--color-accent)]/20 bg-[var(--color-accent)]/[0.04] px-3 py-2">
            <p className="text-sm font-medium text-[var(--color-foreground)]">{racialBonus.name}</p>
            <p className="mt-1 text-xs leading-relaxed text-[var(--color-muted)]">
              {racialBonus.description}
            </p>
          </div>
        </DetailSection>
      ) : (
        selectRaceHint && (
          <p className="text-xs leading-relaxed text-[var(--color-muted)]">{selectRaceHint}</p>
        )
      )}
    </div>
  );
}
