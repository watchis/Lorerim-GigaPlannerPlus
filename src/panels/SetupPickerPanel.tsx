import { useEffect, useMemo, useState } from "react";
import { WorkspacePanelHeader } from "@/components/WorkspacePanelHeader";
import { PickerOptionTile } from "@/components/picker/PickerListItem";
import { PickerSearchInput, matchesPickerSearch } from "@/components/PickerSearchInput";
import { SkillIcon } from "@/components/SkillIcon";
import { DeityDetailContent } from "@/components/option-details/DeityDetailContent";
import { RaceDetailContent } from "@/components/option-details/RaceDetailContent";
import { BirthsignDetailContent } from "@/components/option-details/BirthsignDetailContent";
import { TraitDetailContent } from "@/components/option-details/TraitDetailContent";
import { SupernaturalRaceDetail } from "@/components/option-details/SupernaturalRaceDetail";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  canSelectMajorSkill,
  canSelectMinorSkill,
  canSelectTrait,
  getTraitLimit,
} from "@/engine/buildEngine";
import { cn } from "@/lib/utils";
import {
  getVampireRacialBonusForRace,
  getWerewolfRacialBonusForRace,
  isTraitBlockedBySupernatural,
  isVampireActive,
  isWerewolfActive,
} from "@/lib/supernatural";
import { SingleSelectPickerView, type SingleSelectOption } from "@/panels/SingleSelectPickerView";
import { useUiStore, type SetupPicker } from "@/store/uiStore";
import { usePanelLabels } from "@/theme/ThemeProvider";
import { useBuildStore } from "@/store/buildStore";
import { usePlannerCompactUI, usePlannerStackedLayout } from "@/layout/plannerLayout";

function pickerTitle(picker: SetupPicker, labels: Record<string, string>): string {
  switch (picker) {
    case "race":
      return labels.race;
    case "birthsign":
      return labels.birthsign;
    case "deity":
      return labels.deity;
    case "traits":
      return labels.traits;
    case "major-skills":
      return labels.majorSkills;
    case "minor-skills":
      return labels.minorSkills;
  }
}

function isDetailPicker(picker: SetupPicker): boolean {
  return (
    picker === "race" ||
    picker === "birthsign" ||
    picker === "deity" ||
    picker === "traits"
  );
}

function pickerGuideUrl(picker: SetupPicker): string | undefined {
  switch (picker) {
    case "race":
      return "https://www.lorerim.com/guides/character/race";
    case "birthsign":
      return "https://www.lorerim.com/guides/character/birthsign";
    case "deity":
      return "https://www.lorerim.com/guides/character/divine";
    case "traits":
      return "https://www.lorerim.com/guides/character/traits";
    default:
      return undefined;
  }
}
function pickerRemaining(
  picker: SetupPicker,
  game: NonNullable<ReturnType<typeof useBuildStore.getState>["gameData"]>["game"],
  build: ReturnType<typeof useBuildStore.getState>["build"],
): number {
  switch (picker) {
    case "traits":
      return getTraitLimit(game, build) - build.traitIds.length;
    case "major-skills":
      return game.manifest.limits.majorSkills - build.majorSkillIds.length;
    case "minor-skills":
      return game.manifest.limits.minorSkills - build.minorSkillIds.length;
    default:
      return 0;
  }
}

interface MultiSelectOption {
  id: string;
  name: string;
  isSelected: boolean;
  isEnabled: boolean;
  onSelect: () => void;
}

function sortPickerOptions(options: SingleSelectOption[]): SingleSelectOption[] {
  const noneOption = options.find((option) => option.id === "none");
  const rest = options
    .filter((option) => option.id !== "none")
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));
  return noneOption ? [noneOption, ...rest] : rest;
}

export function SetupPickerPanel() {
  const labels = usePanelLabels("character-setup");
  const setupPicker = useUiStore((s) => s.setupPicker);
  const setSetupPicker = useUiStore((s) => s.setSetupPicker);
  const gameData = useBuildStore((s) => s.gameData);
  const build = useBuildStore((s) => s.build);
  const setRace = useBuildStore((s) => s.setRace);
  const setBirthsign = useBuildStore((s) => s.setBirthsign);
  const setDeity = useBuildStore((s) => s.setDeity);
  const toggleTrait = useBuildStore((s) => s.toggleTrait);
  const toggleMajorSkill = useBuildStore((s) => s.toggleMajorSkill);
  const toggleMinorSkill = useBuildStore((s) => s.toggleMinorSkill);
  const [skillSearchQuery, setSkillSearchQuery] = useState("");
  const compactUI = usePlannerCompactUI();
  const stackedLayout = usePlannerStackedLayout();

  useEffect(() => {
    setSkillSearchQuery("");
  }, [setupPicker]);

  if (!gameData || !setupPicker) return null;

  const { game } = gameData;
  const vampireActive = isVampireActive(build);
  const werewolfActive = isWerewolfActive(build);
  const activeCurseLabel = vampireActive
    ? (labels.vampireTree ?? "Vampire")
    : werewolfActive
      ? (labels.werewolfTree ?? "Werewolf")
      : null;
  const detailPicker = isDetailPicker(setupPicker);
  const showRemaining =
    setupPicker === "traits" ||
    setupPicker === "major-skills" ||
    setupPicker === "minor-skills";
  const remaining = showRemaining ? pickerRemaining(setupPicker, game, build) : null;
  const title = pickerTitle(setupPicker, labels);
  const guideUrl = pickerGuideUrl(setupPicker);

  const detailLabels = {
    baseStats: labels.baseStats,
    startingSkills: labels.startingSkills,
    bonuses: labels.bonuses,
    health: labels.health,
    magicka: labels.magicka,
    stamina: labels.stamina,
    healthRegen: labels.healthRegen,
    magickaRegen: labels.magickaRegen,
    staminaRegen: labels.staminaRegen,
    carryWeight: labels.carryWeight,
    unarmedDamage: labels.unarmedDamage,
    racialBonus: labels.racialBonus ?? "Racial ability",
  };

  let detailOptions: SingleSelectOption[] = [];
  let focusId: string | null = null;
  let multiSelectOptions: MultiSelectOption[] = [];

  if (setupPicker === "race") {
    focusId = build.raceId ?? "none";
    detailOptions = game.races.map((race) => ({
      id: race.id,
      name: race.name,
      isSelected: (build.raceId ?? "none") === race.id,
      onSelect: () => setRace(race.id),
      detail:
        race.id === "none" ? (
          <p className="text-sm text-[var(--color-muted)]">
            No race bonuses will be applied to this build.
          </p>
        ) : (
          <>
            <RaceDetailContent
              race={race}
              skills={game.skills}
              labels={detailLabels}
              hideHeader
            />
            {activeCurseLabel && (
              <SupernaturalRaceDetail
                curseLabel={activeCurseLabel}
                racialBonusLabel={detailLabels.racialBonus}
                racialBonus={
                  vampireActive
                    ? getVampireRacialBonusForRace(game, race.id)
                    : getWerewolfRacialBonusForRace(game, race.id)
                }
                selectRaceHint={
                  labels.selectRaceForRacialAbility ??
                  "Select a race to see your racial curse ability."
                }
              />
            )}
          </>
        ),
    }));
  } else if (setupPicker === "birthsign") {
    focusId = build.birthsignId ?? "none";
    detailOptions = game.birthsigns.map((birthsign) => ({
      id: birthsign.id,
      name: birthsign.name,
      isSelected: (build.birthsignId ?? "none") === birthsign.id,
      onSelect: () => setBirthsign(birthsign.id),
      detail:
        birthsign.id === "none" ? (
          <p className="text-sm text-[var(--color-muted)]">
            No birthsign bonus will be applied to this build.
          </p>
        ) : (
          <BirthsignDetailContent
            birthsign={birthsign}
            labels={{ bonuses: labels.bonuses }}
            hideHeader
          />
        ),
    }));
  } else if (setupPicker === "deity") {
    focusId = build.deityId ?? "none";
    detailOptions = game.deities.map((deity) => ({
      id: deity.id,
      name: deity.name,
      isSelected: (build.deityId ?? "none") === deity.id,
      onSelect: () => setDeity(deity.id),
      detail:
        deity.id === "none" ? (
          <p className="text-sm text-[var(--color-muted)]">
            No deity will be applied to this build.
          </p>
        ) : (
          <DeityDetailContent
            deity={deity}
            races={game.races}
            labels={{
              races: labels.races,
              shrine: labels.shrineBonus,
              follower: labels.followerBonus,
              devotee: labels.devoteeBonus,
              startingRaces: labels.startingRaces,
              shrineLocations: labels.shrineLocations,
              tenets: labels.tenets,
            }}
            hideHeader
          />
        ),
    }));
  } else if (setupPicker === "traits") {
    focusId = build.traitIds[0] ?? null;
    detailOptions = game.traits.map((trait) => ({
      id: trait.id,
      name: trait.name,
      isSelected: build.traitIds.includes(trait.id),
      isEnabled: canSelectTrait(game, build, trait.id),
      onSelect: () => toggleTrait(trait.id),
      detail: (
        <>
          <TraitDetailContent
            trait={trait}
            labels={{ bonuses: labels.bonuses }}
            hideHeader
          />
          {isTraitBlockedBySupernatural(game, build, trait.id) && (
            <p className="mt-3 text-xs leading-relaxed text-[var(--color-error)]">
              {labels.traitBlockedByCurse ??
                "This trait cannot be taken while vampiric or lycanthropic."}
            </p>
          )}
        </>
      ),
    }));
  } else {
    multiSelectOptions = game.skills
      .filter((skill) => skill.majorEligible || skill.minorEligible)
      .map((skill) => {
        const isMajor = setupPicker === "major-skills";
        const selectedIds = isMajor ? build.majorSkillIds : build.minorSkillIds;
        const canSelect = isMajor
          ? canSelectMajorSkill(game, build, skill.id)
          : canSelectMinorSkill(game, build, skill.id);

        return {
          id: skill.id,
          name: skill.name,
          isSelected: selectedIds.includes(skill.id),
          isEnabled: canSelect,
          onSelect: () => (isMajor ? toggleMajorSkill(skill.id) : toggleMinorSkill(skill.id)),
        };
      });
  }

  const filteredSkillOptions = useMemo(
    () =>
      multiSelectOptions.filter((option) =>
        matchesPickerSearch(skillSearchQuery, [option.name]),
      ),
    [multiSelectOptions, skillSearchQuery],
  );

  return (
    <Card className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <WorkspacePanelHeader
        back={{
          label: labels.backToOverview ?? "Overview",
          onClick: () => setSetupPicker(null),
        }}
        title={title}
        subtitle={
          remaining !== null || guideUrl ? (
            <>
              {remaining !== null && (
                <span>{`${remaining} ${labels.remaining ?? "remaining"}`}</span>
              )}
              {guideUrl && (
                <a
                  href={guideUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn(
                    "text-[var(--color-accent)] hover:text-[var(--color-accent-muted)] hover:underline",
                    remaining !== null && "mt-1 block",
                  )}
                >
                  {labels.guideReadMore}
                </a>
              )}
            </>
          ) : undefined
        }
      />
      <CardContent className="flex min-h-0 flex-1 flex-col overflow-hidden p-3 pt-3">
        {detailPicker ? (
          <SingleSelectPickerView
            key={setupPicker}
            options={sortPickerOptions(detailOptions)}
            selectedId={focusId}
            emptyDetail={labels.noneSelected}
            searchPlaceholder={labels.search}
            noMatchesLabel={labels.noMatches}
            selectedLabel={labels.selected}
            backToListLabel={labels.backToOverview ?? "Options"}
            touchPreviewSelect={stackedLayout && detailPicker}
          />
        ) : (
          <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-hidden">
            <PickerSearchInput
              value={skillSearchQuery}
              onChange={setSkillSearchQuery}
              placeholder={labels.search}
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
                    {labels.noMatches ?? "No matches"}
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
        )}      </CardContent>
    </Card>
  );
}
