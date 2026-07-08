import { useEffect, useMemo, useState } from "react";
import { WorkspacePanelHeader } from "@/components/WorkspacePanelHeader";
import { PickerOptionTile } from "@/components/picker/PickerListItem";
import { PickerSearchInput, matchesPickerSearch } from "@/components/PickerSearchInput";
import { SkillIcon } from "@/components/SkillIcon";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { canSelectOghmaSkill, isAllocatableSkill } from "@/engine/buildEngine";
import { getOghmaSkillLimit } from "@/lib/oghmaInfinium";
import { cn } from "@/lib/utils";
import { usePlannerCompactUI } from "@/layout/plannerLayout";
import { useBuildStore } from "@/store/buildStore";
import { usePanelLabels } from "@/theme/ThemeProvider";

interface OghmaSkillsPickerPanelProps {
  onBack: () => void;
}

export function OghmaSkillsPickerPanel({ onBack }: OghmaSkillsPickerPanelProps) {
  const labels = usePanelLabels("character-options");
  const setupLabels = usePanelLabels("character-setup");
  const gameData = useBuildStore((s) => s.gameData);
  const build = useBuildStore((s) => s.build);
  const toggleOghmaSkill = useBuildStore((s) => s.toggleOghmaSkill);
  const [skillSearchQuery, setSkillSearchQuery] = useState("");
  const compactUI = usePlannerCompactUI();

  useEffect(() => {
    setSkillSearchQuery("");
  }, []);

  if (!gameData) return null;

  const { game } = gameData;
  const remaining = getOghmaSkillLimit(game) - build.oghmaSkillIds.length;

  const skillOptions = game.skills
    .filter((skill) => isAllocatableSkill(game, skill.id))
    .map((skill) => ({
      id: skill.id,
      name: skill.name,
      isSelected: build.oghmaSkillIds.includes(skill.id),
      isEnabled: canSelectOghmaSkill(game, build, skill.id),
      onSelect: () => toggleOghmaSkill(skill.id),
    }));

  const filteredSkillOptions = useMemo(
    () =>
      skillOptions.filter((option) =>
        matchesPickerSearch(skillSearchQuery, [option.name]),
      ),
    [skillOptions, skillSearchQuery],
  );

  return (
    <Card className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <WorkspacePanelHeader
        back={{
          label: labels.backToOptions ?? setupLabels.backToOverview ?? "Options",
          onClick: onBack,
        }}
        title={labels.oghmaSkills ?? "Oghma Skills"}
        subtitle={`${remaining} ${setupLabels.remaining ?? "remaining"}`}
      />
      <CardContent className="flex min-h-0 flex-1 flex-col overflow-hidden p-3 pt-3">
        <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-hidden">
          <PickerSearchInput
            value={skillSearchQuery}
            onChange={setSkillSearchQuery}
            placeholder={setupLabels.search}
            className={cn(!compactUI && "max-w-sm")}
          />
          <ScrollArea className="min-h-0 flex-1">
            <div
              className={cn(
                "grid gap-1.5",
                compactUI ? "grid-cols-1" : "sm:grid-cols-2 xl:grid-cols-3",
              )}
            >
              {filteredSkillOptions.length === 0 ? (
                <p className="col-span-full px-2 py-6 text-center text-sm text-[var(--color-muted)]">
                  {setupLabels.noMatches ?? "No matches"}
                </p>
              ) : (
                filteredSkillOptions.map((option) => (
                  <PickerOptionTile
                    key={option.id}
                    name={option.name}
                    isSelected={option.isSelected}
                    isEnabled={option.isEnabled}
                    onSelect={option.onSelect}
                    leading={
                      <SkillIcon
                        skillId={option.id}
                        className={cn(
                          "h-4 w-4",
                          option.isSelected
                            ? "text-[var(--color-accent)]"
                            : "text-[var(--color-muted)]",
                        )}
                      />
                    }
                  />
                ))
              )}
            </div>
          </ScrollArea>
        </div>
      </CardContent>
    </Card>
  );
}
