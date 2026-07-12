import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { parseBonusEffects, mergeEffects } from "./parse-bonus-effects.mjs";

function writeJson(path, data) {
  writeFileSync(path, `${JSON.stringify(data, null, 2)}\n`);
}

const birthsignsPath = "data/game/birthsigns.json";
const birthsignsData = JSON.parse(readFileSync(birthsignsPath, "utf8"));
for (const birthsign of birthsignsData.birthsigns) {
  if (!birthsign.bonus) {
    birthsign.effects = birthsign.effects ?? [];
    continue;
  }
  birthsign.effects = parseBonusEffects(birthsign.bonus);
}
writeJson(birthsignsPath, birthsignsData);

const traitsPath = "data/game/traits.json";
const traitsData = JSON.parse(readFileSync(traitsPath, "utf8"));
for (const trait of traitsData.traits) {
  trait.effects = parseBonusEffects(trait.bonus ?? "");
}
writeJson(traitsPath, traitsData);

const perksDir = "data/game/perks";
for (const file of readdirSync(perksDir).filter(
  (name) => name.endsWith(".json") && name !== "index.json",
)) {
  const path = join(perksDir, file);
  const tree = JSON.parse(readFileSync(path, "utf8"));
  for (const perk of tree.perks) {
    if (perk.extension) {
      perk.effects = perk.effects ?? [];
      continue;
    }
    perk.effects = parseBonusEffects(perk.description ?? "");
  }
  writeJson(path, tree);
}

const deitiesPath = "data/game/deities.json";
const deitiesData = JSON.parse(readFileSync(deitiesPath, "utf8"));
for (const deity of deitiesData.deities) {
  deity.effects =
    deity.shrine && deity.shrine !== "-"
      ? parseBonusEffects(deity.shrine)
      : [];
}
writeJson(deitiesPath, deitiesData);

const racesPath = "data/game/races.json";
const raceEffectsPath = "data/game/race-effects.json";
const racesData = JSON.parse(readFileSync(racesPath, "utf8"));
/** @type {Record<string, import("../../../src/data/schemas").Effect[]>} */
const raceEffects = {};
for (const race of racesData.races) {
  if (race.id === "none") continue;
  const effects = mergeEffects(
    ...race.bonuses.map((bonus) => parseBonusEffects(bonus)),
  );
  race.effects = [];
  raceEffects[race.id] = effects;
}
writeJson(racesPath, racesData);
writeJson(raceEffectsPath, raceEffects);

console.log(
  "regenerated option effects: birthsigns, traits, perks, deities, races",
);
