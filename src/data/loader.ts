import manifestJson from "../../data/game/manifest.json";
import mechanicsJson from "../../data/game/mechanics.json";
import statsJson from "../../data/game/stats.json";
import racesJson from "../../data/game/races.json";
import raceEffectsJson from "../../data/game/race-effects.json";
import birthsignsJson from "../../data/game/birthsigns.json";
import supernaturalJson from "../../data/game/supernatural.json";
import deitiesJson from "../../data/game/deities.json";
import characterOptionsJson from "../../data/game/character-options.json";
import traitsJson from "../../data/game/traits.json";
import skillsJson from "../../data/game/skills.json";
import perkIndexJson from "../../data/game/perks/index.json";
import perkPlayerLevelReqsJson from "../../data/game/perk-player-level-reqs.json";
import itemsIndexJson from "../../data/game/items/index.json";
import itemsWeaponsJson from "../../data/game/items/weapons.json";
import itemsArmorJson from "../../data/game/items/armor.json";
import itemsEnchantmentsJson from "../../data/game/items/enchantments.json";
import themeJson from "../../data/ui/theme.json";
import layoutJson from "../../data/ui/layout.json";
import labelsJson from "../../data/ui/labels.json";

import {
  manifestSchema,
  mechanicsSchema,
  statsSchema,
  racesSchema,
  raceEffectsSchema,
  birthsignsSchema,
  supernaturalSchema,
  deitiesSchema,
  characterOptionsSchema,
  traitsSchema,
  skillsSchema,
  perkIndexSchema,
  perkPlayerLevelReqsSchema,
  perkTreeSchema,
  itemsIndexSchema,
  itemsWeaponsSchema,
  itemsArmorSchema,
  itemsEnchantmentsSchema,
  themeSchema,
  layoutSchema,
  labelsSchema,
  type AppData,
  type Perk,
  type PerkTree,
} from "./schemas";
import { buildItemsCatalog } from "@/lib/gearLibrary";
import {
  enrichBirthsign,
  enrichDeity,
  enrichPerk,
  enrichTrait,
} from "@/lib/enrichGameData";
import { mergeEffects } from "@/lib/resolveOptionEffects";
import { meaningfulPlayerLevelReq } from "@/lib/perkRequirements";
import { validateExtensionRegistry } from "@/extensions/loadExtensions";

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
  const stats = parse(statsSchema, statsJson, "stats.json");
  const { races: rawRaces } = parse(racesSchema, racesJson, "races.json");
  const raceEffects = parse(raceEffectsSchema, raceEffectsJson, "race-effects.json");
  const races = rawRaces.map((race) => ({
    ...race,
    effects: mergeEffects(race.effects, raceEffects[race.id] ?? []),
  }));
  const { birthsigns: rawBirthsigns } = parse(birthsignsSchema, birthsignsJson, "birthsigns.json");
  const birthsigns = rawBirthsigns.map(enrichBirthsign);
  const supernatural = parse(supernaturalSchema, supernaturalJson, "supernatural.json");
  const { deities: rawDeities } = parse(deitiesSchema, deitiesJson, "deities.json");
  const deities = rawDeities.map(enrichDeity);
  const { options: characterOptions } = parse(
    characterOptionsSchema,
    characterOptionsJson,
    "character-options.json",
  );
  const { traits: rawTraits } = parse(traitsSchema, traitsJson, "traits.json");
  const traits = rawTraits.map(enrichTrait);
  const { skills } = parse(skillsSchema, skillsJson, "skills.json");
  const perkIndex = parse(perkIndexSchema, perkIndexJson, "perks/index.json");
  const playerLevelReqs = parse(
    perkPlayerLevelReqsSchema,
    perkPlayerLevelReqsJson,
    "perk-player-level-reqs.json",
  );

  const perkTrees: Record<string, PerkTree> = {};
  const perkById: Record<string, Perk> = {};
  const perkSkillIdByPerkId: Record<string, string> = {};
  for (const [skillId, filename] of Object.entries(perkIndex)) {
    const raw = perkTreeFiles[filename];
    if (!raw) {
      throw new Error(`Missing perk tree file: ${filename}`);
    }
    const tree = parse(perkTreeSchema, raw, filename);
    perkTrees[skillId] = {
      ...tree,
      perks: tree.perks.map((perk) => {
        const playerLevelReq = meaningfulPlayerLevelReq(playerLevelReqs[perk.id]);
        const withLevel =
          playerLevelReq !== null ? { ...perk, playerLevelReq } : perk;
        return enrichPerk(withLevel);
      }),
    };
    for (const perk of perkTrees[skillId]!.perks) {
      perkById[perk.id] = perk;
      perkSkillIdByPerkId[perk.id] = skillId;
    }
  }

  const theme = parse(themeSchema, themeJson, "theme.json");
  const layout = parse(layoutSchema, layoutJson, "layout.json");
  const labels = parse(labelsSchema, labelsJson, "labels.json");
  const itemsIndex = parse(itemsIndexSchema, itemsIndexJson, "items/index.json");
  const { weapons } = parse(itemsWeaponsSchema, itemsWeaponsJson, "items/weapons.json");
  const { armor } = parse(itemsArmorSchema, itemsArmorJson, "items/armor.json");
  const { enchantments } = parse(
    itemsEnchantmentsSchema,
    itemsEnchantmentsJson,
    "items/enchantments.json",
  );
  const items = buildItemsCatalog({ index: itemsIndex, weapons, armor, enchantments });

  const appData: AppData = {
    game: {
      manifest,
      mechanics,
      stats,
      characterOptions,
      races,
      birthsigns,
      supernatural,
      deities,
      traits,
      skills,
      perkTrees,
      perkById,
      perkSkillIdByPerkId,
      items,
    },
    ui: { theme, layout, labels },
  };

  validateExtensionRegistry(appData.game);

  return appData;
}
