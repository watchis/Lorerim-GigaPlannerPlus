import { readFileSync, writeFileSync } from "node:fs";
import { parseTraitBody } from "./parse-trait-body.mjs";
import {
  parseBonusEffects,
  extractConditionalBonusDetails,
} from "./parse-bonus-effects.mjs";

function reconstructRaw(trait) {
  if (!trait.bonus) return trait.description;
  const desc = trait.description?.replace(/\.$/, "").trim();
  if (!desc || !/[A-Za-z0-9]/.test(desc)) return trait.bonus;
  return `${desc}. ${trait.bonus}`;
}

const traitsPath = "data/game/traits.json";
const traitsData = JSON.parse(readFileSync(traitsPath, "utf8"));

for (const trait of traitsData.traits) {
  const raw = reconstructRaw(trait);
  const { description, bonus } = parseTraitBody(raw);
  trait.description = description;
  trait.bonus = bonus;
  trait.effects = parseBonusEffects(bonus);
  trait.bonusDetails = extractConditionalBonusDetails(bonus, trait.effects);
}

writeFileSync(traitsPath, `${JSON.stringify(traitsData, null, 2)}\n`);
console.log("re-parsed", traitsData.traits.length, "traits");
