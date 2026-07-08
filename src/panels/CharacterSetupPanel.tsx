import type { KeyboardEvent } from "react";
import { ChevronRight, Settings, X } from "lucide-react";
import { AttributesAllocator } from "@/components/AttributesAllocator";
import { DestinyTreeSection } from "@/components/DestinyTreeSection";
import { SkillIcon } from "@/components/SkillIcon";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getTraitLimit } from "@/engine/buildEngine";
import { useUiStore, type SetupPicker } from "@/store/uiStore";
import { usePanelLabels } from "@/theme/ThemeProvider";
import { useBuildStore } from "@/store/buildStore";
import {
  usePlannerLayoutScale,
  usePlannerSideWidths,
  usePlannerStackedLayout,
} from "@/layout/plannerLayout";

const COMPACT_ATTRIBUTES_MAX_WIDTH = 240;
interface SelectedChip {
  id: string;
  label: string;
  icon?: boolean;
}

interface SelectionChipProps {
  item: SelectedChip;
  onRemove?: () => void;
}

function SelectionChip({ item, onRemove }: SelectionChipProps) {
  const handleKeyDown = (event: KeyboardEvent<HTMLSpanElement>) => {
    if (!onRemove) return;
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onRemove();
    }
  };

  return (
    <span
      role={onRemove ? "button" : undefined}
      tabIndex={onRemove ? 0 : undefined}
      onClick={onRemove}
      onKeyDown={handleKeyDown}
      className={cn(
        "group inline-flex max-w-full items-center gap-1.5 rounded-md border border-[var(--color-border)]/50",
        "bg-[var(--color-surface-elevated)]/40 px-2 py-0.5 text-[11px] font-medium leading-tight text-[var(--color-foreground)]",
        onRemove &&
          "cursor-pointer hover:border-[var(--color-accent)]/35 hover:bg-[var(--color-accent)]/8 hover:text-[var(--color-accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]/50",
      )}
    >
      {item.icon && (
        <SkillIcon
          skillId={item.id}
          className="h-3.5 w-3.5 shrink-0 text-[var(--color-accent-muted)] group-hover:text-[var(--color-accent)]"
        />
      )}
      <span className="truncate">{item.label}</span>
      {onRemove && (
        <X className="h-3 w-3 shrink-0 text-[var(--color-muted)] opacity-50 group-hover:text-[var(--color-accent)] group-hover:opacity-100" />
      )}
    </span>
  );
}

interface SetupPickerRowProps {
  label: string;
  picker: SetupPicker;
  isActive: boolean;
  onOpen: () => void;
  selectedItems: SelectedChip[];
  onRemove?: (index: number) => void;
  remaining?: number;
  multi?: boolean;
  noneLabel: string;
  hideEmptyLabel?: boolean;
}

function rowSummary(
  selectedItems: SelectedChip[],
  remaining: number | undefined,
  noneLabel: string,
): string {
  if (selectedItems.length === 0) return noneLabel;
  if (remaining !== undefined && selectedItems.length > 1) {
    return `${selectedItems.length} selected`;
  }
  return selectedItems[0].label;
}

function SetupPickerRow({
  label,
  picker,
  isActive,
  onOpen,
  selectedItems,
  onRemove,
  remaining,
  multi = false,
  noneLabel,
  hideEmptyLabel = false,
}: SetupPickerRowProps) {
  const hasSelection = selectedItems.length > 0;
  const subline = multi
    ? hasSelection
      ? null
      : hideEmptyLabel
        ? null
        : noneLabel
    : rowSummary(selectedItems, remaining, noneLabel);
  const isEmpty = !hasSelection;

  return (
    <div className="space-y-1">
      <div className="flex items-stretch gap-1">
        <button
          type="button"
          onClick={onOpen}
          className={cn(
            "group flex min-h-12 min-w-0 flex-1 items-center gap-2.5 rounded-[var(--radius-md)] border px-3 py-2.5 text-left transition-colors",
            isActive
              ? "border-[var(--color-accent)]/45 bg-[var(--color-accent)]/8"
              : "border-[var(--color-border)]/70 bg-[var(--color-surface-elevated)]/40 hover:border-[var(--color-accent-muted)]/60 hover:bg-[var(--color-surface-elevated)]",
          )}
        >
          <div className="min-w-0 flex-1">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-muted)]">
              {label}
              {remaining !== undefined && (
                <span className="ml-1.5 font-normal normal-case tracking-normal text-[var(--color-muted)]">
                  ({remaining} left)
                </span>
              )}
            </div>
            {subline !== null && (
              <div
                className={cn(
                  "truncate text-sm font-medium",
                  isEmpty ? "text-[var(--color-muted)]" : "text-[var(--color-foreground)]",
                )}
              >
                {subline}
              </div>
            )}
          </div>
          {remaining !== undefined && !multi && (
            <span className="shrink-0 rounded-full bg-[var(--color-background)]/80 px-1.5 py-0.5 text-[10px] tabular-nums text-[var(--color-muted)]">
              {remaining}
            </span>
          )}
          <ChevronRight
            className={cn(
              "h-4 w-4 shrink-0 text-[var(--color-muted)] transition-colors",
              "group-hover:text-[var(--color-accent)]",
              isActive && "text-[var(--color-accent)]",
            )}
          />
        </button>
        {!multi && hasSelection && onRemove && (
          <button
            type="button"
            onClick={() => onRemove(0)}
            aria-label={`Clear ${label}`}
            className="flex shrink-0 items-center justify-center rounded-[var(--radius-md)] border border-[var(--color-border)]/70 px-2 text-[var(--color-muted)] transition-colors hover:border-[var(--color-accent)]/35 hover:bg-[var(--color-accent)]/8 hover:text-[var(--color-accent)]"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
      {multi && hasSelection && (
        <div className="flex flex-wrap gap-1.5 px-0.5">
          {selectedItems.map((item, index) => (
            <SelectionChip
              key={`${picker}-${item.id}`}
              item={item}
              onRemove={onRemove ? () => onRemove(index) : undefined}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function CharacterSetupPanel() {
  const labels = usePanelLabels("character-setup");
  const gameData = useBuildStore((s) => s.gameData);
  const build = useBuildStore((s) => s.build);
  const setRace = useBuildStore((s) => s.setRace);
  const setBirthsign = useBuildStore((s) => s.setBirthsign);
  const setDeity = useBuildStore((s) => s.setDeity);
  const toggleTrait = useBuildStore((s) => s.toggleTrait);
  const toggleMajorSkill = useBuildStore((s) => s.toggleMajorSkill);
  const toggleMinorSkill = useBuildStore((s) => s.toggleMinorSkill);
  const setupPicker = useUiStore((s) => s.setupPicker);
  const characterOptionsOpen = useUiStore((s) => s.characterOptionsOpen);
  const toggleSetupPicker = useUiStore((s) => s.toggleSetupPicker);
  const toggleCharacterOptions = useUiStore((s) => s.toggleCharacterOptions);
  const stackedLayout = usePlannerStackedLayout();
  const useThreeColumnLayout = !stackedLayout;
  const layoutScale = usePlannerLayoutScale();
  const sideWidths = usePlannerSideWidths();
  const compact = stackedLayout || (useThreeColumnLayout && layoutScale < 0.75);
  const compactAttributes =
    stackedLayout ||
    (useThreeColumnLayout &&
      (sideWidths?.left ?? Number.POSITIVE_INFINITY) < COMPACT_ATTRIBUTES_MAX_WIDTH);

  if (!gameData) return null;

  const { game } = gameData;
  const majorRemaining = game.manifest.limits.majorSkills - build.majorSkillIds.length;
  const minorRemaining = game.manifest.limits.minorSkills - build.minorSkillIds.length;
  const traitsRemaining = getTraitLimit(game, build) - build.traitIds.length;
  const noneLabel = labels.noneSelected ?? "None selected";

  const selectedRaceName =
    build.raceId && build.raceId !== "none"
      ? (game.races.find((r) => r.id === build.raceId)?.name ?? build.raceId)
      : null;
  const selectedBirthsignName =
    build.birthsignId && build.birthsignId !== "none"
      ? (game.birthsigns.find((s) => s.id === build.birthsignId)?.name ??
        build.birthsignId)
      : null;
  const selectedDeityName =
    build.deityId && build.deityId !== "none"
      ? (game.deities.find((b) => b.id === build.deityId)?.name ?? build.deityId)
      : null;

  const selectedTraitItems = build.traitIds.map((id) => ({
    id,
    label: game.traits.find((t) => t.id === id)?.name ?? id,
  }));
  const selectedMajorItems = build.majorSkillIds.map((id) => ({
    id,
    label: game.skills.find((s) => s.id === id)?.name ?? id,
    icon: true as const,
  }));
  const selectedMinorItems = build.minorSkillIds.map((id) => ({
    id,
    label: game.skills.find((s) => s.id === id)?.name ?? id,
    icon: true as const,
  }));

  return (
    <Card
      className={cn(
        stackedLayout
          ? "flex min-h-0 flex-1 flex-col overflow-hidden border-0 bg-transparent shadow-none"
          : "flex-shrink-0",
      )}
    >
      <CardHeader
        className={cn(
          "flex shrink-0 flex-row items-center justify-between space-y-0",
          !stackedLayout &&
            "sticky top-[2px] z-10 overflow-hidden rounded-t-[var(--radius-lg)] bg-[var(--color-surface)] border-b border-[var(--color-border)]/50",
          stackedLayout
            ? "border-b border-[var(--color-border)]/50 px-3 py-2.5"
            : compact
              ? "pb-1.5"
              : "pb-2",
        )}
      >
        <CardTitle className={cn(compact ? "text-sm" : "text-base")}>{labels.title}</CardTitle>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={cn(
            "h-8 w-8 shrink-0 text-[var(--color-muted)]",
            characterOptionsOpen &&
              "bg-[var(--color-accent)]/10 text-[var(--color-accent)] hover:bg-[var(--color-accent)]/15 hover:text-[var(--color-accent)]",
          )}
          onClick={toggleCharacterOptions}
          aria-label={labels.openOptions ?? "Character options"}
          aria-pressed={characterOptionsOpen}
        >
          <Settings className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent
        className={cn(
          "space-y-3",
          compact && "space-y-2 text-[13px]",
          stackedLayout && "min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-y-contain px-3 pb-2 pt-2",
        )}
      >
        <div className="space-y-1.5">
          <SetupPickerRow
            label={labels.race}
            picker="race"
            isActive={setupPicker === "race"}
            onOpen={() => toggleSetupPicker("race")}
            selectedItems={
              selectedRaceName && build.raceId
                ? [{ id: build.raceId, label: selectedRaceName }]
                : []
            }
            onRemove={() => setRace("none")}
            noneLabel={noneLabel}
          />
          <SetupPickerRow
            label={labels.birthsign}
            picker="birthsign"
            isActive={setupPicker === "birthsign"}
            onOpen={() => toggleSetupPicker("birthsign")}
            selectedItems={
              selectedBirthsignName && build.birthsignId
                ? [{ id: build.birthsignId, label: selectedBirthsignName }]
                : []
            }
            onRemove={() => setBirthsign("none")}
            noneLabel={noneLabel}
          />
          <SetupPickerRow
            label={labels.deity}
            picker="deity"
            isActive={setupPicker === "deity"}
            onOpen={() => toggleSetupPicker("deity")}
            selectedItems={
              selectedDeityName && build.deityId
                ? [{ id: build.deityId, label: selectedDeityName }]
                : []
            }
            onRemove={() => setDeity("none")}
            noneLabel={noneLabel}
          />
        </div>
        <div
          className={cn(
            "border-y border-[var(--color-border)]/70",
            stackedLayout ? "py-2" : "py-3",
          )}
        >
          <AttributesAllocator embedded compact={compactAttributes && !stackedLayout} />
        </div>
        <div className="space-y-1.5">
          <SetupPickerRow
            label={labels.traits}
            remaining={traitsRemaining}
            picker="traits"
            multi
            hideEmptyLabel
            isActive={setupPicker === "traits"}
            onOpen={() => toggleSetupPicker("traits")}
            selectedItems={selectedTraitItems}
            onRemove={(index) => toggleTrait(build.traitIds[index])}
            noneLabel={noneLabel}
          />
          <SetupPickerRow
            label={labels.majorSkills}
            remaining={majorRemaining}
            picker="major-skills"
            multi
            hideEmptyLabel
            isActive={setupPicker === "major-skills"}
            onOpen={() => toggleSetupPicker("major-skills")}
            selectedItems={selectedMajorItems}
            onRemove={(index) => toggleMajorSkill(build.majorSkillIds[index])}
            noneLabel={noneLabel}
          />
          <SetupPickerRow
            label={labels.minorSkills}
            remaining={minorRemaining}
            picker="minor-skills"
            multi
            hideEmptyLabel
            isActive={setupPicker === "minor-skills"}
            onOpen={() => toggleSetupPicker("minor-skills")}
            selectedItems={selectedMinorItems}
            onRemove={(index) => toggleMinorSkill(build.minorSkillIds[index])}
            noneLabel={noneLabel}
          />
        </div>
        <DestinyTreeSection />
      </CardContent>
    </Card>
  );
}
