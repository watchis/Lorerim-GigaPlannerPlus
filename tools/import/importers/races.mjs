import { readFileSync } from "node:fs";
import { cleanDescription, cleanName, cleanWintersunEffectText } from "../lib/transform-utils.mjs";
import { parseBonusEffects, mergeEffects } from "../lib/parse-bonus-effects.mjs";
import { parseRaceData } from "../lib/race-data-parser.mjs";

const PLAYABLE_RACE_EDIDS = new Set([
  "ArgonianRace",
  "BretonRace",
  "DarkElfRace",
  "HighElfRace",
  "ImperialRace",
  "KhajiitRace",
  "NordRace",
  "OrcRace",
  "RedguardRace",
  "WoodElfRace",
]);

const RACE_ID_MAP = {
  ArgonianRace: "argonian",
  BretonRace: "breton",
  DarkElfRace: "dunmer",
  HighElfRace: "altmer",
  ImperialRace: "imperial",
  KhajiitRace: "khajiit",
  NordRace: "nord",
  OrcRace: "orsimer",
  RedguardRace: "redguard",
  WoodElfRace: "bosmer",
};

const RACE_DISPLAY_NAMES = {
  DarkElfRace: "Dunmer",
  HighElfRace: "Altmer",
  OrcRace: "Orsimer",
  WoodElfRace: "Bosmer",
};

const RACE_ABILITY_SEGMENT = {
  ArgonianRace: "Argonian",
  BretonRace: "Breton",
  DarkElfRace: "Dunmer",
  HighElfRace: "Altmer",
  ImperialRace: "Imperial",
  KhajiitRace: "Khajiit",
  NordRace: "Nord",
  OrcRace: "Orsimer",
  RedguardRace: "Redguard",
  WoodElfRace: "Bosmer",
};

const SHARED_RACE_ABILITIES = {
  ArgonianRace: ["All_StrongStomach"],
  WoodElfRace: ["All_StrongStomach"],
  KhajiitRace: ["All_StrongStomach", "All_Claws"],
  OrcRace: ["All_StrongStomach"],
};

function buildRaceAbilityLookup(spellRecords) {
  const byKey = new Map();

  for (const record of spellRecords) {
    if (!record.edid.startsWith("REQ_Ability_Race_")) continue;
    byKey.set(record.edid.slice("REQ_Ability_Race_".length), record);
  }

  return byKey;
}

function raceBonusLabel(record) {
  const name = cleanName(record.name);
  const description = cleanWintersunEffectText(record.description);
  return description ? `${name}: ${description}` : name;
}

function raceBonusName(bonus) {
  return bonus.split(":")[0]?.trim().toLowerCase() ?? "";
}

function mergeRaceBonuses(imported, prior = []) {
  if (imported.length === 0) return prior;

  const importedNames = new Set(imported.map(raceBonusName));
  const preserved = prior.filter((bonus) => !importedNames.has(raceBonusName(bonus)));
  return [...imported, ...preserved];
}

function collectRaceBonuses(raceEdid, abilityByKey) {
  const segment = RACE_ABILITY_SEGMENT[raceEdid];
  if (!segment) return [];

  const bonuses = [];

  for (const [key, record] of abilityByKey) {
    if (!key.startsWith(`${segment}_`) || key.endsWith("_Buff")) continue;
    bonuses.push(raceBonusLabel(record));
  }

  for (const sharedKey of SHARED_RACE_ABILITIES[raceEdid] ?? []) {
    const record = abilityByKey.get(sharedKey);
    if (record) bonuses.push(raceBonusLabel(record));
  }

  return bonuses.sort((left, right) => raceBonusName(left).localeCompare(raceBonusName(right)));
}

function cleanRaceDescription(description, raceEdid) {
  let cleaned = cleanDescription(description);
  if (raceEdid === "OrcRace") {
    cleaned = cleaned.replace(/\s*Berserk rage[^.]*\./gi, "").trim();
  }
  return cleaned;
}

function findPriorRace(existingById, id, raceEdid) {
  return (
    existingById.get(id) ??
    (raceEdid === "OrcRace" ? existingById.get("orc") : undefined)
  );
}

function mergeImportedRaceStats(prior, importedStats) {
  if (!importedStats) return {};

  return {
    startingAttributes: importedStats.startingAttributes,
    startingCarryWeight: importedStats.startingCarryWeight,
    unarmedDamage: importedStats.unarmedDamage,
    regen: importedStats.regen,
    startingSkills: {
      ...importedStats.startingSkills,
      destiny: prior?.startingSkills?.destiny ?? 1,
      traits: prior?.startingSkills?.traits ?? 0,
    },
  };
}

export function buildRaceEffectsFromRaces(races) {
  const raceEffects = {};

  for (const race of races) {
    if (race.id === "none") continue;
    raceEffects[race.id] = mergeEffects(
      ...race.bonuses.map((bonus) => parseBonusEffects(bonus)),
    );
  }

  return raceEffects;
}

export function transformRaceRecords(
  raceRecords,
  spellRecords,
  racesPath,
  lorerimRaceRecords = [],
) {
  const existing = JSON.parse(readFileSync(racesPath, "utf8"));
  const existingById = new Map(existing.races.map((race) => [race.id, race]));
  const abilityByKey = buildRaceAbilityLookup(spellRecords);
  const lorerimByEdid = new Map(
    lorerimRaceRecords
      .filter((record) => PLAYABLE_RACE_EDIDS.has(record.edid))
      .map((record) => [record.edid, record]),
  );

  const races = raceRecords
    .filter((record) => PLAYABLE_RACE_EDIDS.has(record.edid))
    .map((record) => {
      const id = RACE_ID_MAP[record.edid];
      const prior = findPriorRace(existingById, id, record.edid);
      const source = lorerimByEdid.get(record.edid) ?? record;
      const importedBonuses = collectRaceBonuses(record.edid, abilityByKey);
      const bonuses = mergeRaceBonuses(importedBonuses, prior?.bonuses ?? []);
      const importedStats = mergeImportedRaceStats(prior, parseRaceData(source.data));

      return {
        ...(prior ?? {
          id,
          name: RACE_DISPLAY_NAMES[record.edid] ?? source.name,
          description: "",
          bonuses: [],
          startingAttributes: { health: 0, magicka: 0, stamina: 0 },
          attributeBonus: { health: 0, magicka: 0, stamina: 0 },
          startingCarryWeight: 0,
          speedBonus: 0,
          unarmedDamage: 0,
          regen: { health: 0, magicka: 0, stamina: 0 },
          startingSkills: {},
          effects: [],
        }),
        ...importedStats,
        id,
        name: RACE_DISPLAY_NAMES[record.edid] || source.name || prior?.name || id,
        description: cleanRaceDescription(
          source.description ?? prior?.description ?? "",
          record.edid,
        ),
        bonuses,
        effects: [],
      };
    });

  const none = existing.races.find((race) => race.id === "none");
  const playableRaces = none ? [none, ...races] : races;
  return {
    races: { races: playableRaces },
    raceEffects: buildRaceEffectsFromRaces(races),
  };
}

export async function importRaces(context) {
  const { races, raceEffects } = transformRaceRecords(
    context.scan.raceRecords,
    context.scan.spellRecords,
    context.paths.racesPath,
    context.scan.lorerimRaceRecords,
  );

  return {
    files: [
      ["races.json", races],
      ["race-effects.json", raceEffects],
    ],
    summary: {
      races: races.races.length,
    },
  };
}
