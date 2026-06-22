import manifestJson from "../../data/game/manifest.json";
import mechanicsJson from "../../data/game/mechanics.json";
import racesJson from "../../data/game/races.json";
import standingStonesJson from "../../data/game/standing-stones.json";
import blessingsJson from "../../data/game/blessings.json";
import traitsJson from "../../data/game/traits.json";
import skillsJson from "../../data/game/skills.json";
import perkIndexJson from "../../data/game/perks/index.json";
import perkPlayerLevelReqsJson from "../../data/game/perk-player-level-reqs.json";
import themeJson from "../../data/ui/theme.json";
import layoutJson from "../../data/ui/layout.json";
import labelsJson from "../../data/ui/labels.json";

import {
  manifestSchema,
  mechanicsSchema,
  racesSchema,
  standingStonesSchema,
  blessingsSchema,
  traitsSchema,
  skillsSchema,
  perkIndexSchema,
  perkPlayerLevelReqsSchema,
  perkTreeSchema,
  themeSchema,
  layoutSchema,
  labelsSchema,
  type AppData,
  type PerkTree,
} from "./schemas";

function parse<T>(schema: { parse: (data: unknown) => T }, data: unknown, name: string): T {
  try {
    return schema.parse(data);
  } catch (error) {
    throw new Error(`Failed to validate ${name}: ${String(error)}`);
  }
}

const perkJsonModules = import.meta.glob("../../data/game/perks/*.json", {
  eager: true,
  import: "default",
}) as Record<string, unknown>;

const perkTreeFiles: Record<string, unknown> = {};
for (const path of Object.keys(perkJsonModules)) {
  const filename = path.split("/").pop()!;
  if (filename === "index.json") continue;
  perkTreeFiles[filename] = perkJsonModules[path];
}

export function loadAppData(): AppData {
  const manifest = parse(manifestSchema, manifestJson, "manifest.json");
  const mechanics = parse(mechanicsSchema, mechanicsJson, "mechanics.json");
  const { races } = parse(racesSchema, racesJson, "races.json");
  const { standingStones } = parse(standingStonesSchema, standingStonesJson, "standing-stones.json");
  const { blessings } = parse(blessingsSchema, blessingsJson, "blessings.json");
  const { traits } = parse(traitsSchema, traitsJson, "traits.json");
  const { skills } = parse(skillsSchema, skillsJson, "skills.json");
  const perkIndex = parse(perkIndexSchema, perkIndexJson, "perks/index.json");
  const playerLevelReqs = parse(
    perkPlayerLevelReqsSchema,
    perkPlayerLevelReqsJson,
    "perk-player-level-reqs.json",
  );

  const perkTrees: Record<string, PerkTree> = {};
  for (const [skillId, filename] of Object.entries(perkIndex)) {
    const raw = perkTreeFiles[filename];
    if (!raw) {
      throw new Error(`Missing perk tree file: ${filename}`);
    }
    const tree = parse(perkTreeSchema, raw, filename);
    perkTrees[skillId] = {
      ...tree,
      perks: tree.perks.map((perk) => {
        const playerLevelReq = playerLevelReqs[perk.id];
        return playerLevelReq !== undefined ? { ...perk, playerLevelReq } : perk;
      }),
    };
  }

  const theme = parse(themeSchema, themeJson, "theme.json");
  const layout = parse(layoutSchema, layoutJson, "layout.json");
  const labels = parse(labelsSchema, labelsJson, "labels.json");

  return {
    game: {
      manifest,
      mechanics,
      races,
      standingStones,
      blessings,
      traits,
      skills,
      perkTrees,
    },
    ui: { theme, layout, labels },
  };
}
