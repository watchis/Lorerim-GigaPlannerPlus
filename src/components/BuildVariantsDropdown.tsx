import {
  Select,
  SelectContent,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import {
  getDefaultVariantName,
  listBuildVariants,
  normalizeSavedBuild,
} from "@/store/savedBuilds";
import { useBuildStore } from "@/store/buildStore";
import { useUiStore } from "@/store/uiStore";
import { useThemeConfig } from "@/theme/ThemeProvider";
import { StickyNote } from "lucide-react";

const DEFAULT_VALUE = "default";
const MANAGE_VALUE = "__manage__";

const variantItemClassName =
  "min-h-0 py-2 pl-8 pr-2 text-sm leading-snug focus:bg-[var(--color-surface)]";

function formatLabel(template: string, values: Record<string, string | number>): string {
  return Object.entries(values).reduce(
    (result, [key, value]) => result.replace(`{${key}}`, String(value)),
    template,
  );
}

function VariantOption({
  name,
  level,
  levelLabel,
}: {
  name: string;
  level: number;
  levelLabel: string;
}) {
  return (
    <span className="flex w-full min-w-0 items-center justify-between gap-2">
      <span className="min-w-0 truncate font-medium">{name}</span>
      <span className="shrink-0 rounded-[var(--radius-sm)] bg-[var(--color-background)]/70 px-1.5 py-0.5 font-mono text-xs tabular-nums text-[var(--color-muted)]">
        {formatLabel(levelLabel, { level })}
      </span>
    </span>
  );
}

export function BuildVariantsDropdown() {
  const { labels } = useThemeConfig();
  const variantLabels = labels.milestones;
  const savedBuilds = useBuildStore((s) => s.savedBuilds);
  const activeBuildId = useBuildStore((s) => s.activeBuildId);
  const selectMilestone = useBuildStore((s) => s.selectMilestone);
  const openVariantsManager = useUiStore((s) => s.openVariantsManager);
  const openVariantNotes = useUiStore((s) => s.openVariantNotes);

  const entry = savedBuilds
    .map((build) => normalizeSavedBuild(build))
    .find((build) => build.id === activeBuildId);
  if (!entry) return null;

  const variants = listBuildVariants(entry);
  const defaultVariantName = getDefaultVariantName(entry);
  const activeMilestoneId = entry.activeMilestoneId;
  const selectValue = activeMilestoneId ?? DEFAULT_VALUE;

  const activeVariant =
    variants.find((variant) => variant.id === activeMilestoneId) ??
    variants.find((variant) => variant.id === null);
  const currentName = activeVariant?.name ?? defaultVariantName;
  const currentLevel = activeVariant?.level ?? entry.build.playerLevel;

  const handleSelect = (value: string) => {
    if (value === MANAGE_VALUE) {
      openVariantsManager();
      return;
    }
    selectMilestone(value === DEFAULT_VALUE ? null : value);
  };

  return (
    <div className="space-y-1.5">
      <span className="text-xs font-medium tracking-wide text-[var(--color-muted)]">
        {variantLabels.title}
      </span>

      <Select value={selectValue} onValueChange={handleSelect}>
        <SelectTrigger className="h-9 gap-2 px-3 text-sm">
          <SelectValue className="min-w-0 flex-1">
            <VariantOption
              name={currentName}
              level={currentLevel}
              levelLabel={variantLabels.levelShort}
            />
          </SelectValue>
        </SelectTrigger>
        <SelectContent
          position="popper"
          sideOffset={5}
          className="w-[var(--radix-select-trigger-width)] text-sm [&>div]:p-1"
        >
          {variants.map((variant) => (
            <SelectItem
              key={variant.id ?? DEFAULT_VALUE}
              value={variant.id ?? DEFAULT_VALUE}
              className={variantItemClassName}
            >
              <span className="flex w-full min-w-0 items-center justify-between gap-2">
                <span className="min-w-0 flex-1">
                  <VariantOption
                    name={variant.name}
                    level={variant.level}
                    levelLabel={variantLabels.levelShort}
                  />
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 shrink-0 text-[var(--color-muted)] hover:text-[var(--color-foreground)]"
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    openVariantNotes(variant.id);
                  }}
                  aria-label={labels.panels["variants-manager"]?.notes ?? "Notes"}
                >
                  <StickyNote className="h-3.5 w-3.5" />
                </Button>
              </span>
            </SelectItem>
          ))}

          <SelectSeparator className="my-1" />

          <SelectItem value={MANAGE_VALUE} className={variantItemClassName}>
            {variantLabels.manageVariants}
          </SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
