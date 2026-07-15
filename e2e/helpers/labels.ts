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
  "level-bar": {
    playerLevel: string;
    perkPointsRemaining: string;
  };
  panels: {
    "character-setup": {
      title: string;
      race: string;
      birthsign: string;
      deity: string;
      noneSelected: string;
      openOptions: string;
      search: string;
    };
    "character-options": {
      title: string;
      supernaturalSectionTitle: string;
      playthroughSectionTitle: string;
    };
    "skill-trees": {
      title: string;
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
      activeBuildCode: string;
      importedBadge: string;
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
} {
  const raw = readFileSync(path.join(root, "data/game/mechanics.json"), "utf8");
  const mechanics = JSON.parse(raw) as {
    leveling: {
      baseLevel: number;
      initialPerkPoints: number;
      perkPointsPerLevel: number;
    };
  };
  return mechanics.leveling;
}

export function earnedPerkPoints(playerLevel: number): number {
  const { baseLevel, initialPerkPoints, perkPointsPerLevel } = getMechanicsLeveling();
  return initialPerkPoints + (playerLevel - baseLevel) * perkPointsPerLevel;
}
