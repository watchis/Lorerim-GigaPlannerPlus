import { readFileSync } from "node:fs";
import { cleanDescription, slugify } from "../lib/transform-utils.mjs";
import { parseBonusEffects, extractConditionalBonusDetails } from "../lib/parse-bonus-effects.mjs";

const BIRTHSIGN_NAMES = [
  "Apprentice",
  "Atronach",
  "Lady",
  "Lord",
  "Lover",
  "Mage",
  "Ritual",
  "Serpent",
  "Shadow",
  "Steed",
  "Thief",
  "Tower",
  "Warrior",
];

function birthsignIdFromName(name) {
  return slugify(name);
}

function cleanBirthsignText(text) {
  return cleanDescription(String(text ?? ""))
    .replace(/<([^<>]+)>/g, "$1")
    .replace(/\s*Accept the sign of the [^.?]+\?\s*$/i, "")
    .trim();
}

function parseBirthsignBody(text) {
  const cleaned = cleanBirthsignText(text);
  if (!cleaned) return { description: "", bonus: "" };

  const mechanicalStart = cleaned.search(
    /\.\s+(?:\d+%|Magicka|Magic|Health|Stamina|Movement|Sprinting?|Gain|Armor|Pickpocket|Lockpicking|Soul Gems|Daedric|Standing Stones|You are|Prices|Shouts|Spells|Reflect|Poison|Most|Improved|You receive|You do not|absorb|do not lose)/i,
  );

  if (mechanicalStart === -1) {
    return { description: cleaned, bonus: "" };
  }

  return {
    description: cleaned.slice(0, mechanicalStart + 1).trim(),
    bonus: cleaned.slice(mechanicalStart + 2).trim(),
  };
}

function parseBirthsignMesg(description) {
  const sections = String(description ?? "")
    .split(/\r?\n\r?\n/)
    .map((section) => cleanBirthsignText(section))
    .filter(Boolean);

  const group = sections[0] ?? "";
  const body = sections.slice(1).join(" ");
  const { description: flavor, bonus } = parseBirthsignBody(body);

  return { group, description: flavor, bonus };
}

function buildBirthsignMesgLookup(mesgRecords) {
  const byStone = new Map();

  for (const record of mesgRecords) {
    const match = record.edid.match(/^doom([A-Za-z]+)MSG$/);
    if (!match || match[1] === "AlreadyHave" || match[1].endsWith("Removed")) continue;
    if (!BIRTHSIGN_NAMES.includes(match[1])) continue;
    byStone.set(match[1], record);
  }

  return byStone;
}

export function transformStandingStoneRecords(spellRecords, mesgRecords, birthsignsPath) {
  const existing = JSON.parse(readFileSync(birthsignsPath, "utf8"));
  const existingEntries = existing.birthsigns ?? existing.standingStones ?? [];
  const existingById = new Map(existingEntries.map((birthsign) => [birthsign.id, birthsign]));
  const spellByEdid = new Map(spellRecords.map((record) => [record.edid, record]));
  const mesgByStone = buildBirthsignMesgLookup(mesgRecords);

  const birthsigns = [];

  for (const stoneName of BIRTHSIGN_NAMES) {
    const id = birthsignIdFromName(stoneName);
    const prior = existingById.get(id);
    const spell = spellByEdid.get(`REQ_Ability_Birthsign_${stoneName}`);
    const mesg = mesgByStone.get(stoneName);

    const fromMesg = mesg?.description ? parseBirthsignMesg(mesg.description) : null;
    const fromSpell = spell?.description ? parseBirthsignBody(spell.description) : null;

    const bonus = fromMesg?.bonus || fromSpell?.bonus || prior?.bonus || "";
    const effects = parseBonusEffects(bonus);

    birthsigns.push({
      ...(prior ?? {
        id,
        name: stoneName,
        group: "",
        description: "",
        bonus: "",
        effects: [],
      }),
      id,
      name: stoneName,
      group: fromMesg?.group || prior?.group || "",
      description: fromMesg?.description || fromSpell?.description || prior?.description || "",
      bonus,
      effects,
      bonusDetails: extractConditionalBonusDetails(bonus, effects),
    });
  }

  const none = existingEntries.find((birthsign) => birthsign.id === "none");
  return { birthsigns: none ? [none, ...birthsigns] : birthsigns };
}

export async function importBirthsigns(context) {
  const birthsigns = transformStandingStoneRecords(
    context.scan.spellRecords,
    context.scan.mesgRecords,
    context.paths.birthsignsPath,
  );

  return {
    files: [["birthsigns.json", birthsigns]],
    summary: {
      birthsigns: birthsigns.birthsigns.length,
    },
  };
}
