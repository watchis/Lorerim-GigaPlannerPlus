import { DetailStatRow } from "@/components/option-details/DetailSection";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CursorTooltip } from "@/components/ui/tooltip";
import {
  formatBonusSourceValue,
  formatTrackedStatValue,
  resolveBonusSourceName,
  type BonusSource,
  type TrackedStatEntry,
} from "@/lib/trackedStats";
import { useBuildStore } from "@/store/buildStore";
import { usePanelLabels } from "@/theme/ThemeProvider";

interface DerivedStatsPanelProps {
  embedded?: boolean;
}

function groupByCategory<T extends { category: string }>(entries: T[]): [string, T[]][] {
  const groups = new Map<string, T[]>();
  for (const entry of entries) {
    const list = groups.get(entry.category) ?? [];
    list.push(entry);
    groups.set(entry.category, list);
  }
  return [...groups.entries()];
}

function BonusSourcesTooltipContent({
  label,
  value,
  sources,
  labels,
}: {
  label: string;
  value: string;
  sources: BonusSource[];
  labels: Record<string, string>;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between gap-4 border-b border-[var(--color-border)]/50 pb-2">
        <span className="text-xs font-semibold text-[var(--color-foreground)]">{label}</span>
        <span className="shrink-0 font-mono text-xs font-semibold tabular-nums text-[var(--color-foreground)]">
          {value}
        </span>
      </div>
      <ul className="space-y-1 text-xs leading-relaxed">
        {sources.map((source, index) => (
          <li key={`${source.name}-${source.labelKey ?? index}`} className="flex items-baseline justify-between gap-4">
            <span className="text-[var(--color-muted)]">{resolveBonusSourceName(source, labels)}</span>
            <span className="shrink-0 font-mono tabular-nums text-[var(--color-foreground)]">
              {formatBonusSourceValue(source)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function BonusStatRow({
  bonus,
  label,
  labels,
}: {
  bonus: TrackedStatEntry;
  label: string;
  labels: Record<string, string>;
}) {
  const row = (
    <DetailStatRow label={label} value={formatTrackedStatValue(bonus)} />
  );

  if (bonus.sources.length === 0) {
    return row;
  }

  return (
    <CursorTooltip
      content={
        <BonusSourcesTooltipContent
          label={label}
          value={formatTrackedStatValue(bonus)}
          sources={bonus.sources}
          labels={labels}
        />
      }
      className="cursor-default"
    >
      {row}
    </CursorTooltip>
  );
}

function ConditionalBonusRow({ text, source }: { text: string; source: string }) {
  return (
    <div className="flex items-start justify-between gap-3 px-2 py-1 text-xs">
      <span className="min-w-0 flex-1 leading-relaxed text-[var(--color-muted)]">{text}</span>
      <span className="shrink-0 text-[var(--color-foreground)]">{source}</span>
    </div>
  );
}

export function DerivedStatsPanel({ embedded = false }: DerivedStatsPanelProps) {
  const labels = usePanelLabels("derived-stats");
  const characterOptionLabels = usePanelLabels("character-options");
  const gameData = useBuildStore((s) => s.gameData);
  const computed = useBuildStore((s) => s.computed);

  if (!computed || !gameData) return null;

  const sourceLabels = { ...characterOptionLabels, ...labels };
  const categoryLabels = new Map(
    gameData.game.stats.categories.map((category) => [category.id, category.label]),
  );
  const groupedBonuses = groupByCategory(computed.appliedBonuses);
  const conditionalBonuses = computed.conditionalBonuses;

  const bonusRows =
    groupedBonuses.length > 0 || conditionalBonuses.length > 0 ? (
      <div className="space-y-4">
        {groupedBonuses.map(([categoryId, bonuses]) => (
          <section key={categoryId} className="space-y-1.5">
            <h4 className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-accent-muted)]">
              {labels[`category.${categoryId}`] ?? categoryLabels.get(categoryId) ?? categoryId}
            </h4>
            <div className="divide-y divide-[var(--color-border)]/50 overflow-hidden rounded-[var(--radius-md)] border border-[var(--color-border)]/50 bg-[var(--color-surface-elevated)]/30">
              {bonuses.map((bonus) => (
                <BonusStatRow
                  key={bonus.id}
                  bonus={bonus}
                  label={labels[bonus.id] ?? bonus.label}
                  labels={sourceLabels}
                />
              ))}
            </div>
          </section>
        ))}
        {conditionalBonuses.length > 0 && (
          <section className="space-y-1.5">
            <h4 className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-accent-muted)]">
              {labels["category.conditional"] ?? "Conditional"}
            </h4>
            <div className="divide-y divide-[var(--color-border)]/50 overflow-hidden rounded-[var(--radius-md)] border border-[var(--color-border)]/50 bg-[var(--color-surface-elevated)]/30">
              {conditionalBonuses.map((entry, index) => (
                <ConditionalBonusRow
                  key={`${entry.source}-${index}`}
                  text={entry.text}
                  source={entry.source}
                />
              ))}
            </div>
          </section>
        )}
      </div>
    ) : (
      <p className="text-sm text-[var(--color-muted)]">{labels.empty ?? "No bonuses applied"}</p>
    );

  if (embedded) {
    return bonusRows;
  }

  return (
    <Card className="min-h-0 flex-1">
      <CardHeader>
        <CardTitle>{labels.title}</CardTitle>
      </CardHeader>
      <CardContent>{bonusRows}</CardContent>
    </Card>
  );
}
