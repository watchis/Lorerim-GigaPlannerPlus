import type { ReactNode } from "react";
import { ChevronRight } from "lucide-react";
import { BlessingDetailContent } from "@/components/option-details/BlessingDetailContent";
import { RaceDetailContent } from "@/components/option-details/RaceDetailContent";
import { StandingStoneDetailContent } from "@/components/option-details/StandingStoneDetailContent";
import { TraitDetailContent } from "@/components/option-details/TraitDetailContent";
import { SkillIcon } from "@/components/SkillIcon";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { StandingStone } from "@/data/schemas";
import { getOrderedPerkTrees } from "@/engine/buildEngine";
import { DerivedStatsPanel } from "@/panels/DerivedStatsPanel";
import { useUiStore } from "@/store/uiStore";
import { usePanelLabels } from "@/theme/ThemeProvider";
import { useBuildStore } from "@/store/buildStore";

function standingStoneDetails(stone: StandingStone): string[] {
  if (stone.bonusDetails?.length) return stone.bonusDetails;
  if (stone.bonus.trim()) return [stone.bonus];
  return [];
}

function InfoSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-3 border-b border-[var(--color-border)]/50 pb-6 last:border-0">
      <h3 className="font-[family-name:var(--font-heading)] text-base font-semibold tracking-wide text-[var(--color-accent)]">
        {title}
      </h3>
      {children}
    </section>
  );
}

function SelectionName({ name }: { name: string }) {
  return <p className="text-sm font-medium text-[var(--color-foreground)]">{name}</p>;
}

function EmptySelection({ message }: { message: string }) {
  return <p className="text-sm text-[var(--color-muted)]">{message}</p>;
}

function SelectedSkillList({ skillIds, skills }: { skillIds: string[]; skills: { id: string; name: string }[] }) {
  const skillNames = new Map(skills.map((skill) => [skill.id, skill.name]));

  return (
    <div className="flex flex-wrap gap-1.5">
      {skillIds.map((skillId) => (
        <span
          key={skillId}
          className="inline-flex items-center gap-1.5 rounded-md border border-[var(--color-border)]/50 bg-[var(--color-surface-elevated)]/40 px-2 py-1 text-xs font-medium text-[var(--color-foreground)]"
        >
          <SkillIcon skillId={skillId} className="h-3.5 w-3.5 text-[var(--color-accent-muted)]" />
          {skillNames.get(skillId) ?? skillId}
        </span>
      ))}
    </div>
  );
}

export function CharacterSetupInfoPanel() {
  const labels = usePanelLabels("character-setup");
  const skillLabels = usePanelLabels("skill-trees");
  const derivedLabels = usePanelLabels("derived-stats");
  const setMiddleView = useUiStore((s) => s.setMiddleView);
  const setActiveSkillTreeId = useUiStore((s) => s.setActiveSkillTreeId);
  const gameData = useBuildStore((s) => s.gameData);
  const build = useBuildStore((s) => s.build);

  if (!gameData) return null;

  const { game } = gameData;
  const noneLabel = labels.noneSelected ?? "None selected";

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
  };

  const selectedRace =
    build.raceId && build.raceId !== "none"
      ? game.races.find((race) => race.id === build.raceId)
      : null;
  const selectedStone =
    build.standingStoneId && build.standingStoneId !== "none"
      ? game.standingStones.find((stone) => stone.id === build.standingStoneId)
      : null;
  const selectedBlessing =
    build.blessingId && build.blessingId !== "none"
      ? game.blessings.find((blessing) => blessing.id === build.blessingId)
      : null;
  const selectedTraits = build.traitIds
    .map((id) => game.traits.find((trait) => trait.id === id))
    .filter((trait): trait is NonNullable<typeof trait> => trait !== undefined);

  return (
    <Card className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <CardHeader className="flex-shrink-0 flex-row items-center justify-between gap-3 space-y-0 border-b border-[var(--color-border)]/50 pb-3">
        <CardTitle className="text-base">{labels.title}</CardTitle>
        <Button
          variant="outline"
          size="sm"
          className="shrink-0"
          onClick={() => {
            const firstTreeId = getOrderedPerkTrees(gameData.game)[0]?.skillId;
            if (firstTreeId) setActiveSkillTreeId(firstTreeId);
            setMiddleView("skill-trees");
          }}
        >
          {skillLabels.title}
          <ChevronRight className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent className="min-h-0 flex-1 overflow-hidden p-0">
        <ScrollArea className="h-full">
          <div className="space-y-6 p-4">
            <InfoSection title={labels.race}>
              {selectedRace ? (
                <div className="space-y-3">
                  <SelectionName name={selectedRace.name} />
                  <RaceDetailContent
                    race={selectedRace}
                    skills={game.skills}
                    labels={detailLabels}
                    hideHeader
                  />
                </div>
              ) : (
                <EmptySelection message={noneLabel} />
              )}
            </InfoSection>

            <InfoSection title={labels.standingStone}>
              {selectedStone ? (
                <div className="space-y-3">
                  <SelectionName name={selectedStone.name} />
                  <StandingStoneDetailContent
                    stone={{ ...selectedStone, bonusDetails: standingStoneDetails(selectedStone) }}
                    labels={{ bonuses: labels.bonuses }}
                    hideHeader
                  />
                </div>
              ) : (
                <EmptySelection message={noneLabel} />
              )}
            </InfoSection>

            <InfoSection title={labels.blessing}>
              {selectedBlessing ? (
                <div className="space-y-3">
                  <SelectionName name={selectedBlessing.name} />
                  <BlessingDetailContent
                    blessing={selectedBlessing}
                    races={game.races}
                    labels={{
                      races: labels.races,
                      shrine: labels.shrineBonus,
                      follower: labels.followerBonus,
                      devotee: labels.devoteeBonus,
                      startingRaces: labels.startingRaces,
                    }}
                    hideHeader
                  />
                </div>
              ) : (
                <EmptySelection message={noneLabel} />
              )}
            </InfoSection>

            <InfoSection title={labels.traits}>
              {selectedTraits.length > 0 ? (
                <div className="space-y-5">
                  {selectedTraits.map((trait) => (
                    <div key={trait.id} className="space-y-2">
                      <SelectionName name={trait.name} />
                      <TraitDetailContent
                        trait={trait}
                        mechanics={game.mechanics}
                        labels={{ bonuses: labels.bonuses }}
                        hideHeader
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <EmptySelection message={noneLabel} />
              )}
            </InfoSection>

            <InfoSection title={labels.majorSkills}>
              {build.majorSkillIds.length > 0 ? (
                <SelectedSkillList skillIds={build.majorSkillIds} skills={game.skills} />
              ) : (
                <EmptySelection message={noneLabel} />
              )}
            </InfoSection>

            <InfoSection title={labels.minorSkills}>
              {build.minorSkillIds.length > 0 ? (
                <SelectedSkillList skillIds={build.minorSkillIds} skills={game.skills} />
              ) : (
                <EmptySelection message={noneLabel} />
              )}
            </InfoSection>

            <InfoSection title={derivedLabels.title}>
              <DerivedStatsPanel embedded />
            </InfoSection>
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
