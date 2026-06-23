import type { Trait } from "@/data/schemas";
import { DetailSection } from "@/components/option-details/DetailSection";
import { hasDisplayText, stripLeadingPunctuation } from "@/lib/utils";

interface TraitDetailContentProps {
  trait: Trait;
  labels: {
    bonuses: string;
  };
  hideHeader?: boolean;
}

export function TraitDetailContent({ trait, labels, hideHeader }: TraitDetailContentProps) {
  const description = hasDisplayText(trait.description) ? trait.description : "";
  const bonus = trait.bonus?.trim() ? stripLeadingPunctuation(trait.bonus) : "";

  return (
    <div className="space-y-4">
      {!hideHeader && (
        <div>
          <h3 className="font-[family-name:var(--font-heading)] text-base font-semibold text-[var(--color-accent)]">
            {trait.name}
          </h3>
          {description && (
            <p className="mt-2 text-xs leading-relaxed text-[var(--color-muted)]">{description}</p>
          )}
        </div>
      )}
      {hideHeader && description && (
        <p className="text-sm leading-relaxed text-[var(--color-muted)]">{description}</p>
      )}

      {bonus && (
        <DetailSection title={labels.bonuses}>
          <div className="rounded-[var(--radius-md)] border border-[var(--color-border)]/50 bg-[var(--color-surface-elevated)]/35 px-3 py-2">
            <p className="text-sm leading-relaxed text-[var(--color-foreground)]">{bonus}</p>
          </div>
        </DetailSection>
      )}
    </div>
  );
}
