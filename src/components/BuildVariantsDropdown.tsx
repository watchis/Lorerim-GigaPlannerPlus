import { useState } from "react";
import { StickyNote } from "lucide-react";
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
import { VariantOption, variantSelectItemClassName } from "@/components/VariantOption";
import { useThemeConfig } from "@/theme/ThemeProvider";

const DEFAULT_VALUE = "default";
const MANAGE_VALUE = "__manage__";

function formatLabel(template: string, values: Record<string, string | number>): string {
  return Object.entries(values).reduce(
    (result, [key, value]) => result.replace(`{${key}}`, String(value)),
    template,
  );
}

export function BuildVariantsDropdown() {
  const { labels } = useThemeConfig();
  const variantLabels = labels.milestones;
  const notesLabel = labels.panels["variants-manager"]?.notes ?? "Notes";
  const savedBuilds = useBuildStore((s) => s.savedBuilds);
  const activeBuildId = useBuildStore((s) => s.activeBuildId);
  const selectMilestone = useBuildStore((s) => s.selectMilestone);
  const openVariantsManager = useUiStore((s) => s.openVariantsManager);
  const openVariantNotes = useUiStore((s) => s.openVariantNotes);
  const [open, setOpen] = useState(false);

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

  const handleOpenNotes = (variantId: string | null) => {
    setOpen(false);
    openVariantNotes(variantId);
  };

  return (
    <div className="space-y-1.5">
      <span className="text-xs font-medium tracking-wide text-[var(--color-muted)]">
        {variantLabels.title}
      </span>

      <Select open={open} onOpenChange={setOpen} value={selectValue} onValueChange={handleSelect}>
        <SelectTrigger className="h-9 min-w-0 gap-2 overflow-hidden px-3 text-sm">
          <SelectValue className="min-w-0 flex-1 overflow-hidden">
            <VariantOption
              name={currentName}
              levelText={formatLabel(variantLabels.levelShort, { level: currentLevel })}
            />
          </SelectValue>
        </SelectTrigger>
        <SelectContent
          position="popper"
          sideOffset={5}
          className="w-[var(--radix-select-trigger-width)] text-sm [&>div]:p-1"
        >
          {variants.map((variant) => (
            <div
              key={variant.id ?? DEFAULT_VALUE}
              className="flex w-full items-center gap-0.5 pr-1"
            >
              <SelectItem
                value={variant.id ?? DEFAULT_VALUE}
                className={`min-w-0 flex-1 ${variantSelectItemClassName}`}
              >
                <VariantOption
                  name={variant.name}
                  levelText={formatLabel(variantLabels.levelShort, { level: variant.level })}
                />
              </SelectItem>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7 shrink-0 text-[var(--color-muted)] hover:text-[var(--color-foreground)]"
                onClick={() => handleOpenNotes(variant.id)}
                aria-label={notesLabel}
              >
                <StickyNote className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}

          <SelectSeparator className="my-1" />

          <SelectItem value={MANAGE_VALUE} className={variantSelectItemClassName}>
            {variantLabels.manageVariants}
          </SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
