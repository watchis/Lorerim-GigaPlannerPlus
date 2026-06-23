import type { Birthsign } from "@/data/schemas";
import { DetailSection } from "@/components/option-details/DetailSection";

interface BirthsignDetailContentProps {
  birthsign: Birthsign;
  labels: {
    bonuses: string;
  };
  hideHeader?: boolean;
}

export function BirthsignDetailContent({ birthsign, labels, hideHeader }: BirthsignDetailContentProps) {
  if (birthsign.id === "none") return null;

  return (
    <div className="space-y-4">
      {!hideHeader && (
        <div>
          <h3 className="font-[family-name:var(--font-heading)] text-base font-semibold text-[var(--color-accent)]">
            {birthsign.name}
          </h3>
          {birthsign.group && (
            <p className="mt-1 text-[10px] italic leading-relaxed text-[var(--color-muted)]">
              {birthsign.group}
            </p>
          )}
          {birthsign.description && (
            <p className="mt-2 text-xs leading-relaxed text-[var(--color-muted)]">
              {birthsign.description}
            </p>
          )}
        </div>
      )}
      {hideHeader && (
        <>
          {birthsign.group && (
            <p className="text-xs italic leading-relaxed text-[var(--color-muted)]">{birthsign.group}</p>
          )}
          {birthsign.description && (
            <p className="text-sm leading-relaxed text-[var(--color-muted)]">{birthsign.description}</p>
          )}
        </>
      )}

      {birthsign.bonus && (
        <DetailSection title={labels.bonuses}>
          <div className="rounded-[var(--radius-md)] border border-[var(--color-border)]/50 bg-[var(--color-surface-elevated)]/35 px-3 py-2">
            <p className="text-sm leading-relaxed text-[var(--color-foreground)]">{birthsign.bonus}</p>
          </div>
        </DetailSection>
      )}
    </div>
  );
}
