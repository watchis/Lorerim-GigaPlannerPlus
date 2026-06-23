import type { ReactNode } from "react";
import { DeityDetailContent } from "@/components/option-details/DeityDetailContent";
import { RaceDetailContent } from "@/components/option-details/RaceDetailContent";
import { BirthsignDetailContent } from "@/components/option-details/BirthsignDetailContent";
import { TraitDetailContent } from "@/components/option-details/TraitDetailContent";
import { SkillIcon } from "@/components/SkillIcon";
import { WorkspacePanelHeader } from "@/components/WorkspacePanelHeader";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  getAttributePointsPerChoice,
  getOrderedPerkTrees,
  getRemainingAttributePoints,
} from "@/engine/buildEngine";
import { cn } from "@/lib/utils";
import { DerivedStatsPanel } from "@/panels/DerivedStatsPanel";
import { useUiStore } from "@/store/uiStore";
import { usePanelLabels } from "@/theme/ThemeProvider";
import { useBuildStore } from "@/store/buildStore";

const ATTRIBUTE_COLORS = {
  health: "var(--color-health)",
  magicka: "var(--color-magicka)",
  stamina: "var(--color-stamina)",
} as const;

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
  const attributeLabels = usePanelLabels("attributes");
  const skillLabels = usePanelLabels("skill-trees");
  const derivedLabels = usePanelLabels("derived-stats");
  const setMiddleView = useUiStore((s) => s.setMiddleView);
  const setActiveSkillTreeId = useUiStore((s) => s.setActiveSkillTreeId);
  const gameData = useBuildStore((s) => s.gameData);
  const build = useBuildStore((s) => s.build);
  const computed = useBuildStore((s) => s.computed);

  if (!gameData || !computed) return null;

  const { game } = gameData;
  const noneLabel = labels.noneSelected ?? "None selected";
  const attributesRemaining = getRemainingAttributePoints(game, build);

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
  const selectedBirthsign =
    build.birthsignId && build.birthsignId !== "none"
      ? game.birthsigns.find((birthsign) => birthsign.id === build.birthsignId)
      : null;
  const selectedDeity =
    build.deityId && build.deityId !== "none"
      ? game.deities.find((deity) => deity.id === build.deityId)
      : null;
  const selectedTraits = build.traitIds
    .map((id) => game.traits.find((trait) => trait.id === id))
    .filter((trait): trait is NonNullable<typeof trait> => trait !== undefined);

  return (
    <Card className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <WorkspacePanelHeader
        forward={{
          label: skillLabels.title,
          onClick: () => {
            const firstTreeId = getOrderedPerkTrees(gameData.game)[0]?.skillId;
            if (firstTreeId) setActiveSkillTreeId(firstTreeId);
            setMiddleView("skill-trees");
          },
        }}
        title={labels.overviewTitle ?? labels.title}
      />
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

            <InfoSection title={labels.birthsign}>
              {selectedBirthsign ? (
                <div className="space-y-3">
                  <SelectionName name={selectedBirthsign.name} />
                  <BirthsignDetailContent
                    birthsign={selectedBirthsign}
                    labels={{ bonuses: labels.bonuses }}
                    hideHeader
                  />
                </div>
              ) : (
                <EmptySelection message={noneLabel} />
              )}
            </InfoSection>

            <InfoSection title={labels.deity}>
              {selectedDeity ? (
                <div className="space-y-3">
                  <SelectionName name={selectedDeity.name} />
                  <DeityDetailContent
                    deity={selectedDeity}
                    races={game.races}
                    labels={{
                      races: labels.races,
                      shrine: labels.shrineBonus,
                      follower: labels.followerBonus,
                      devotee: labels.devoteeBonus,
                      startingRaces: labels.startingRaces,
                      shrineLocations: labels.shrineLocations,
                    }}
                    hideHeader
                  />
                </div>
              ) : (
                <EmptySelection message={noneLabel} />
              )}
            </InfoSection>

            <InfoSection title={labels.attributes}>
              <div className="space-y-2">
                {attributesRemaining !== 0 && (
                  <p
                    className={cn(
                      "text-xs",
                      attributesRemaining < 0
                        ? "text-[var(--color-error)]"
                        : "text-[var(--color-muted)]",
                    )}
                  >
                    {attributeLabels.remaining}: {attributesRemaining}
                  </p>
                )}
                <div className="divide-y divide-[var(--color-border)]/50 overflow-hidden rounded-[var(--radius-md)] border border-[var(--color-border)]/70 bg-[var(--color-surface-elevated)]/35">
                  {(["health", "magicka", "stamina"] as const).map((key) => {
                    const choices = build.attributeBonus[key];
                    const bonus = choices * getAttributePointsPerChoice(game, key);
                    const color = ATTRIBUTE_COLORS[key];

                    return (
                      <div key={key} className="relative flex items-center gap-2 px-2.5 py-2">
                        <div
                          className="absolute inset-y-2 left-0 w-0.5 rounded-full"
                          style={{ backgroundColor: color }}
                          aria-hidden
                        />
                        <div className="min-w-0 flex-1 pl-2">
                          <div
                            className="text-[11px] font-semibold leading-none"
                            style={{ color }}
                          >
                            {attributeLabels[key]}
                          </div>
                          {choices > 0 ? (
                            <div className="mt-1 text-[10px] tabular-nums text-[var(--color-muted)]">
                              +{bonus}
                            </div>
                          ) : (
                            <div className="mt-1 text-[10px] text-[var(--color-muted)]/70">—</div>
                          )}
                        </div>
                        <span
                          className="font-mono text-base font-semibold tabular-nums leading-none"
                          style={{ color }}
                        >
                          {computed.attributes[key]}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </InfoSection>

            <InfoSection title={labels.traits}>
              {selectedTraits.length > 0 ? (
                <div className="space-y-5">
                  {selectedTraits.map((trait) => (
                    <div key={trait.id} className="space-y-2">
                      <SelectionName name={trait.name} />
                      <TraitDetailContent
                        trait={trait}
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
