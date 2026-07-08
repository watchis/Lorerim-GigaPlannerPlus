import type { ReactNode } from "react";
import { useState } from "react";
import { Check, Sparkles, X } from "lucide-react";
import { WorkspacePanelHeader } from "@/components/WorkspacePanelHeader";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { OghmaInfiniumControl } from "@/components/character-options/OghmaInfiniumControl";
import { OghmaSkillsPickerPanel } from "@/components/character-options/OghmaSkillsPickerPanel";
import type { CharacterOption } from "@/data/schemas";
import { getCharacterOptionExtension } from "@/extensions/loadExtensions";
import {
  getCharacterOptionSummaryLines,
  getSelectedCharacterOptionChoice,
} from "@/lib/characterOptions";
import { cn } from "@/lib/utils";
import { useUiStore } from "@/store/uiStore";
import { usePanelLabels } from "@/theme/ThemeProvider";
import { useBuildStore } from "@/store/buildStore";

interface OptionSectionProps {
  title: string;
  description?: string;
  active?: boolean;
  onClear?: () => void;
  clearLabel?: string;
  children: ReactNode;
}

function OptionSection({
  title,
  description,
  active = false,
  onClear,
  clearLabel,
  children,
}: OptionSectionProps) {
  return (
    <section
      className={cn(
        "rounded-[var(--radius-md)] border p-3.5 transition-colors",
        active
          ? "border-[var(--color-accent)]/35 bg-[var(--color-accent)]/[0.04]"
          : "border-[var(--color-border)]/70 bg-[var(--color-surface-elevated)]/35",
      )}
    >
      <div className="mb-3 flex items-start justify-between gap-2">
        <div className="min-w-0 space-y-1">
          <h3 className="text-sm font-semibold text-[var(--color-foreground)]">{title}</h3>
          {description && (
            <p className="text-xs leading-relaxed text-[var(--color-muted)]">{description}</p>
          )}
        </div>
        {active && onClear && (
          <button
            type="button"
            onClick={onClear}
            aria-label={`${clearLabel ?? "Clear"} ${title}`}
            className="flex shrink-0 items-center gap-1 rounded-[var(--radius-md)] border border-[var(--color-border)]/70 px-2 py-1 text-[10px] font-medium text-[var(--color-muted)] transition-colors hover:border-[var(--color-accent)]/35 hover:bg-[var(--color-accent)]/8 hover:text-[var(--color-accent)]"
          >
            <X className="h-3 w-3" />
            {clearLabel}
          </button>
        )}
      </div>
      {children}
    </section>
  );
}

function RewardBadge({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-[var(--color-accent)]/25 bg-[var(--color-accent)]/10 px-2 py-0.5 text-[10px] font-semibold text-[var(--color-accent)]">
      <Sparkles className="h-3 w-3 shrink-0 opacity-80" />
      {children}
    </span>
  );
}

interface SelectOptionControlProps {
  option: CharacterOption;
  selectedChoiceId: string;
  labels: Record<string, string>;
  onSelect: (choiceId: string) => void;
}

function SelectOptionControl({
  option,
  selectedChoiceId,
  labels,
  onSelect,
}: SelectOptionControlProps) {
  const isActive = selectedChoiceId !== option.defaultChoice;
  const description = option.descriptionLabel ? labels[option.descriptionLabel] : undefined;

  return (
    <OptionSection
      title={labels[option.titleLabel] ?? option.titleLabel}
      description={description}
      active={isActive}
      onClear={isActive ? () => onSelect(option.defaultChoice) : undefined}
      clearLabel={labels.clearSelection}
    >
      <Select value={selectedChoiceId} onValueChange={onSelect}>
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {option.choices.map((choice) => (
            <SelectItem key={choice.id} value={choice.id}>
              {labels[choice.label] ?? choice.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </OptionSection>
  );
}

interface GenericChoiceOptionControlProps {
  option: CharacterOption;
  selectedChoiceId: string;
  labels: Record<string, string>;
  onSelect: (choiceId: string) => void;
}

function GenericChoiceOptionControl({
  option,
  selectedChoiceId,
  labels,
  onSelect,
}: GenericChoiceOptionControlProps) {
  const isActive = selectedChoiceId !== option.defaultChoice;
  const description = option.descriptionLabel ? labels[option.descriptionLabel] : undefined;

  return (
    <OptionSection
      title={labels[option.titleLabel] ?? option.titleLabel}
      description={description}
      active={isActive}
      onClear={isActive ? () => onSelect(option.defaultChoice) : undefined}
      clearLabel={labels.clearSelection}
    >
      <div className="space-y-1.5">
        {option.choices.map((choice) => (
          <button
            key={choice.id}
            type="button"
            onClick={() => onSelect(choice.id)}
            className={cn(
              "flex w-full items-center gap-2 rounded-[var(--radius-md)] border px-2.5 py-2 text-left transition-colors",
              selectedChoiceId === choice.id
                ? "border-[var(--color-accent)]/40 bg-[var(--color-accent)]/8"
                : "border-[var(--color-border)]/70 bg-[var(--color-background)]/45 hover:border-[var(--color-accent-muted)]/60 hover:bg-[var(--color-surface-elevated)]/60",
            )}
          >
            <span
              className={cn(
                "min-w-0 flex-1 truncate text-sm font-medium",
                selectedChoiceId === choice.id
                  ? "text-[var(--color-accent)]"
                  : choice.id === option.defaultChoice
                    ? "text-[var(--color-muted)]"
                    : "text-[var(--color-foreground)]",
              )}
            >
              {labels[choice.label] ?? choice.label}
            </span>
            {selectedChoiceId === choice.id && (
              <Check className="h-3.5 w-3.5 shrink-0 text-[var(--color-accent)]" />
            )}
          </button>
        ))}
      </div>
    </OptionSection>
  );
}

interface ToggleOptionControlProps {
  option: CharacterOption;
  selectedChoiceId: string;
  labels: Record<string, string>;
  onSelect: (choiceId: string) => void;
}

function ToggleOptionControl({
  option,
  selectedChoiceId,
  labels,
  onSelect,
}: ToggleOptionControlProps) {
  const claimedChoice =
    option.choices.find((choice) => choice.id !== option.defaultChoice)?.id ?? "claimed";
  const checked = selectedChoiceId !== option.defaultChoice;

  return (
    <OptionSection
      title={labels[option.titleLabel] ?? option.titleLabel}
      description={
        option.descriptionLabel ? labels[option.descriptionLabel] : undefined
      }
      active={checked}
      onClear={checked ? () => onSelect(option.defaultChoice) : undefined}
      clearLabel={labels.clearSelection}
    >
      <label
        className={cn(
          "flex cursor-pointer items-start gap-3 rounded-[var(--radius-md)] border px-3 py-2.5 transition-colors",
          checked
            ? "border-[var(--color-accent)]/30 bg-[var(--color-accent)]/[0.06]"
            : "border-[var(--color-border)]/60 bg-[var(--color-background)]/40 hover:border-[var(--color-accent-muted)]/50 hover:bg-[var(--color-surface-elevated)]/50",
        )}
      >
        <input
          type="checkbox"
          checked={checked}
          onChange={(event) =>
            onSelect(event.target.checked ? claimedChoice : option.defaultChoice)
          }
          className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--color-accent)]"
        />
        <div className="min-w-0 flex-1">
          <span className="text-sm font-medium text-[var(--color-foreground)]">
            {checked
              ? (labels[claimedChoice] ??
                labels.alduinBonusTraitClaimed ??
                "Claimed")
              : (labels.alduinBonusTraitNone ?? "Not claimed")}
          </span>
        </div>
      </label>
    </OptionSection>
  );
}

interface ActiveRewardsSummaryProps {
  lines: { key: string; text: string }[];
  title: string;
}

function ActiveRewardsSummary({ lines, title }: ActiveRewardsSummaryProps) {
  if (lines.length === 0) return null;

  return (
    <div className="rounded-[var(--radius-md)] border border-[var(--color-accent)]/25 bg-[var(--color-accent)]/[0.06] px-3 py-2.5">
      <div className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-[var(--color-accent)]">
        {title}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {lines.map((line) => (
          <RewardBadge key={line.key}>{line.text}</RewardBadge>
        ))}
      </div>
    </div>
  );
}

export function CharacterOptionsPanel() {
  const labels = usePanelLabels("character-options");
  const attributeLabels = usePanelLabels("attributes");
  const setupLabels = usePanelLabels("character-setup");
  const closeCharacterOptions = useUiStore((s) => s.closeCharacterOptions);
  const gameData = useBuildStore((s) => s.gameData);
  const build = useBuildStore((s) => s.build);
  const setCharacterOptionChoice = useBuildStore((s) => s.setCharacterOptionChoice);
  const [oghmaSkillsPickerOpen, setOghmaSkillsPickerOpen] = useState(false);

  if (!gameData) return null;

  if (oghmaSkillsPickerOpen) {
    return <OghmaSkillsPickerPanel onBack={() => setOghmaSkillsPickerOpen(false)} />;
  }

  const { game } = gameData;
  const { characterOptions } = game;

  const activeRewardLines = characterOptions.flatMap((option) => {
    const choice = getSelectedCharacterOptionChoice(option, build.characterOptionChoices);
    if (choice.id === option.defaultChoice) return [];
    return getCharacterOptionSummaryLines(
      game,
      option,
      choice,
      labels,
      attributeLabels,
      build,
    );
  });

  return (
    <Card className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <WorkspacePanelHeader
        back={{
          label: setupLabels.backToOverview ?? "Overview",
          onClick: closeCharacterOptions,
        }}
        title={labels.title ?? "Character Options"}
        subtitle={labels.subtitle}
      />
      <CardContent className="min-h-0 flex-1 overflow-hidden p-0">
        <ScrollArea className="h-full">
          <div className="space-y-4 p-4">
            <ActiveRewardsSummary
              lines={activeRewardLines}
              title={labels.activeRewards ?? "Active rewards"}
            />
            {characterOptions.map((option) => {
              const selectedChoiceId =
                build.characterOptionChoices[option.id] ?? option.defaultChoice;
              const onSelect = (choiceId: string) =>
                setCharacterOptionChoice(option.id, choiceId);
              const extension = option.extension
                ? getCharacterOptionExtension(option.extension)
                : undefined;
              const Control =
                option.extension === "oghma-infinium"
                  ? OghmaInfiniumControl
                  : extension?.Control;

              if (Control) {
                return (
                  <Control
                    key={option.id}
                    option={option}
                    selectedChoiceId={selectedChoiceId}
                    labels={labels}
                    onSelect={onSelect}
                    onOpenOghmaSkillsPicker={
                      option.extension === "oghma-infinium"
                        ? () => setOghmaSkillsPickerOpen(true)
                        : undefined
                    }
                  />
                );
              }

              const controlType = option.controlType ?? "buttons";
              if (controlType === "select") {
                return (
                  <SelectOptionControl
                    key={option.id}
                    option={option}
                    selectedChoiceId={selectedChoiceId}
                    labels={labels}
                    onSelect={onSelect}
                  />
                );
              }

              if (controlType === "toggle") {
                return (
                  <ToggleOptionControl
                    key={option.id}
                    option={option}
                    selectedChoiceId={selectedChoiceId}
                    labels={labels}
                    onSelect={onSelect}
                  />
                );
              }

              return (
                <GenericChoiceOptionControl
                  key={option.id}
                  option={option}
                  selectedChoiceId={selectedChoiceId}
                  labels={labels}
                  onSelect={onSelect}
                />
              );
            })}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
