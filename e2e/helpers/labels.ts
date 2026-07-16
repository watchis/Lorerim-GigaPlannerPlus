import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

export type UiLabels = {
  app: { title: string; subtitle: string };
  nav: { home: string; planner: string; builds: string; reportBug: string };
  landing: {
    howItWorksTitle: string;
    featuresTitle: string;
    recentBuildsTitle: string;
    recentBuildsEmpty: string;
    importTitle: string;
    importPlaceholder: string;
    importButton: string;
  };
  milestones: {
    title: string;
    fullBuild: string;
    manageVariants: string;
    levelShort: string;
  };
  "level-bar": {
    playerLevel: string;
    perkPointsRemaining: string;
    skillPointsRemaining: string;
    trainingLevelsRemaining: string;
    ensurePlayerLevel: string;
    setToMinimumLevel: string;
    easyModeLevelWarning: string;
  };
  panels: {
    "character-setup": {
      title: string;
      overviewTitle: string;
      race: string;
      birthsign: string;
      deity: string;
      traits: string;
      majorSkills: string;
      minorSkills: string;
      noneSelected: string;
      openOptions: string;
      search: string;
      backToOverview: string;
      vampireTree: string;
      destiny: string;
    };
    "character-options": {
      title: string;
      supernaturalSectionTitle: string;
      playthroughSectionTitle: string;
      vampireOption: string;
      werewolfOption: string;
      lichOption: string;
      supernaturalNone: string;
      curseActiveBadge: string;
      vampireStageLabel: string;
      vampireStage1Short: string;
      vampireStage2Short: string;
      vampireStage3Short: string;
      vampireStage4Short: string;
      oghmaInfinium: string;
      oghmaClaimed: string;
      oghmaNone: string;
      oghmaSkills: string;
      backToOptions: string;
      clearSelection: string;
      auNaturelGear: string;
      auNaturelGearDescription: string;
      auNaturelPerLevelBonus: string;
      auNaturelGearPenalty: string;
    };
    attributes: {
      title: string;
      health: string;
      magicka: string;
      stamina: string;
      remainingShort: string;
    };
    "skill-trees": {
      title: string;
      skillLevel: string;
      perksMode: string;
      trainingMode: string;
      trainingModeActive: string;
      trainingRangesTitle: string;
      trainingSkillTotal: string;
      selected: string;
      available: string;
      locked: string;
      resetSkill: string;
    };
    "variants-manager": {
      title: string;
      back: string;
      createNew: string;
      variantsSection: string;
      variantCount: string;
      activeBadge: string;
    };
    "build-library": {
      title: string;
      newBuild: string;
      openPlanner: string;
      savedBuildsTitle: string;
      searchBuilds: string;
      noSearchResults: string;
      importCodeTitle: string;
      importCodePlaceholder: string;
      importAsNew: string;
      importToActive: string;
      importedAsNew: string;
      importedToActive: string;
      importedLibrary: string;
      activeBuildCode: string;
      importedBadge: string;
      backupTitle: string;
      chooseBackupFile: string;
      exportActive: string;
      exportAll: string;
      importedVersionWarning: string;
      playerLevel: string;
    };
  };
  errors: {
    invalidBuildCode: string;
  };
};

let cached: UiLabels | undefined;

export function getUiLabels(): UiLabels {
  if (!cached) {
    const raw = readFileSync(path.join(root, "data/ui/labels.json"), "utf8");
    cached = JSON.parse(raw) as UiLabels;
  }
  return cached;
}

export function getMechanicsLeveling(): {
  baseLevel: number;
  initialPerkPoints: number;
  perkPointsPerLevel: number;
  standardMaxPlayerLevel: number;
  maxPlayerLevel: number;
} {
  const raw = readFileSync(path.join(root, "data/game/mechanics.json"), "utf8");
  const mechanics = JSON.parse(raw) as {
    leveling: {
      baseLevel: number;
      initialPerkPoints: number;
      perkPointsPerLevel: number;
      standardMaxPlayerLevel: number;
      maxPlayerLevel: number;
    };
  };
  return mechanics.leveling;
}

export function earnedPerkPoints(playerLevel: number): number {
  const { baseLevel, initialPerkPoints, perkPointsPerLevel } = getMechanicsLeveling();
  return initialPerkPoints + (playerLevel - baseLevel) * perkPointsPerLevel;
}

/** Replace `{key}` placeholders in a label template. */
export function formatLabel(template: string, values: Record<string, string | number>): string {
  return Object.entries(values).reduce(
    (text, [key, value]) => text.replaceAll(`{${key}}`, String(value)),
    template,
  );
}
