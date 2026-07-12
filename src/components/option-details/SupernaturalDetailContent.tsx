import type { SupernaturalForm, SupernaturalRacialBonus } from "@/data/schemas";
import {
  DetailBulletList,
  DetailSection,
} from "@/components/option-details/DetailSection";

interface SupernaturalDetailContentProps {
  form: SupernaturalForm;
  racialBonus?: SupernaturalRacialBonus;
  labels: {
    bonuses: string;
    racialBonus: string;
    detriments: string;
  };
  hideHeader?: boolean;
}

export function SupernaturalDetailContent({
  form,
  racialBonus,
  labels,
  hideHeader,
}: SupernaturalDetailContentProps) {
  if (form.id === "none") return null;

  return (
    <div className="space-y-4">
      {!hideHeader && (
        <div>
          <h3 className="font-[family-name:var(--font-heading)] text-base font-semibold text-[var(--color-accent)]">
            {form.name}
          </h3>
          {form.description && (
            <p className="mt-2 text-xs leading-relaxed text-[var(--color-muted)]">{form.description}</p>
          )}
        </div>
      )}
      {hideHeader && form.description && (
        <p className="text-sm leading-relaxed text-[var(--color-muted)]">{form.description}</p>
      )}

      {form.bonus && (
        <DetailSection title={labels.bonuses}>
          <div className="rounded-[var(--radius-md)] border border-[var(--color-border)]/50 bg-[var(--color-surface-elevated)]/35 px-3 py-2">
            <p className="text-sm leading-relaxed text-[var(--color-foreground)]">{form.bonus}</p>
          </div>
        </DetailSection>
      )}

      {form.bonusDetails && form.bonusDetails.length > 0 && (
        <DetailSection title={labels.detriments}>
          <DetailBulletList items={form.bonusDetails} />
        </DetailSection>
      )}

      {racialBonus && (
        <DetailSection title={labels.racialBonus}>
          <div className="rounded-[var(--radius-md)] border border-[var(--color-border)]/50 bg-[var(--color-surface-elevated)]/35 px-3 py-2">
            <p className="text-sm font-medium text-[var(--color-foreground)]">{racialBonus.name}</p>
            <p className="mt-1 text-xs leading-relaxed text-[var(--color-muted)]">
              {racialBonus.description}
            </p>
          </div>
        </DetailSection>
      )}
    </div>
  );
}
