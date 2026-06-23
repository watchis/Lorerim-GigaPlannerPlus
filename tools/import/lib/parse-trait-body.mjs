import { cleanDescription } from "./transform-utils.mjs";

const MECHANICAL_SPLIT_MARKERS = [
  "[-+]?\\d+%?",
  "Gain ",
  "you gain ",
  "You gain ",
  "You take ",
  "You deal ",
  "You swim ",
  "You regenerate ",
  "You drain ",
  "You also ",
  "You turn ",
  "You tap ",
  "You draw ",
  "You prefer ",
  "You begin ",
  "You can ",
  "You are fluent",
  "You follow the ",
  "Start with ",
  "At will",
  "For every ",
  "After ",
  "When ",
  "Getting hit ",
  "Also gives ",
  "Both you ",
  "All spells",
  "All other spell",
  "Spells? ",
  "Power attacks",
  "Light melee attacks",
  "light attacks ",
  "Blood and Absorb",
  "Arrows and bolts",
  "Arrows ",
  "sun spells",
  "sonic spells",
  "frenzy spells",
  "pacifying spells",
  "touch and cloak spells",
  "(?:Novice|Apprentice|Adept)\\b",
  "expert and master",
  "Deal ",
  "Pick ",
  "Bows ",
  "Crossbows ",
  "Weapons",
  "Your bound weapons",
  "Your shield",
  "Your wands",
  "Your unarmed attacks",
  "Your attacks ",
  "Your undead summons",
  "Your touch",
  "Your birthsign",
  "Your hostile ",
  "Fire spells ",
  "Shock spells ",
  "Frost spells ",
  "intimidation checks",
  "persuasion checks",
  "Mudcrabs ",
  "Weapon and ",
  "Skooma ",
  "Spriggans ",
  "Dwemer ",
  "Druids ",
  "Food benefits ",
  "Potions ",
  "Reading ",
  "-\\d+",
].join("|");

const MECHANICAL_START_MARKERS = [
  "[-+]?\\d+%?",
  "Gain ",
  "you gain ",
  "You gain ",
  "You take ",
  "You deal ",
  "You swim ",
  "You regenerate ",
  "You drain ",
  "Start with ",
  "At will",
  "For every ",
  "When ",
  "Getting hit ",
  "Also gives ",
  "Both you ",
  "All spells",
  "All other spell",
  "Power attacks",
  "Light melee attacks",
  "Pick ",
  "Deal ",
  "Mudcrabs ",
  "Druids ",
  "You are fluent",
  "You follow the ",
  "Skooma ",
  "Spriggans ",
  "Dwemer ",
  "Food benefits ",
  "Potions ",
  "Reading ",
  "Bows ",
  "Crossbows ",
  "Weapons",
  "Weapon and ",
  "-\\d+",
].join("|");

const SPLIT_MARKER_GROUP = `(?:${MECHANICAL_SPLIT_MARKERS})`;
const START_MARKER_GROUP = `(?:${MECHANICAL_START_MARKERS})`;
const MECHANICAL_START = new RegExp(`^${START_MARKER_GROUP}`, "i");

const MECHANICAL_SPLIT_PATTERNS = [
  new RegExp(`[.!;]\\s+(?=${SPLIT_MARKER_GROUP})`, "i"),
  new RegExp(`:\\s+(?=${SPLIT_MARKER_GROUP})`, "i"),
  new RegExp(`,\\s+(?=(?:intimidation|persuasion) checks)`, "i"),
];

const MECHANICAL_CONTENT =
  /(?:\d+%|per (?:level|second)|\+\d+ (?:health|magicka|stamina|armor)|\d+ (?:health|magicka|stamina|armor)|deal \d+|take \d+|cost \d+|last \d+|weaker|stronger|faster|slower|regenerat)/i;

function cleanTraitText(text) {
  return cleanDescription(String(text ?? ""))
    .replace(/<([^<>]+)>/g, "$1")
    .replace(/^[.!;]\s+/, "")
    .trim();
}

function normalizeFlavor(description) {
  const normalized = description
    .replace(/;$/, ".")
    .replace(/[,:]$/, ".")
    .trim();
  if (!hasMeaningfulText(normalized)) return "";
  return normalized;
}

function normalizeBonus(bonus) {
  return String(bonus ?? "")
    .replace(/^[.!;]\s+/, "")
    .trim();
}

function hasMeaningfulText(text) {
  return /[A-Za-z0-9]/.test(text);
}

function finalize({ description, bonus }) {
  return {
    description: normalizeFlavor(description),
    bonus: normalizeBonus(bonus),
  };
}

function findMechanicalSplitIndex(text) {
  let earliest = -1;

  for (const pattern of MECHANICAL_SPLIT_PATTERNS) {
    const index = text.search(pattern);
    if (index !== -1 && (earliest === -1 || index < earliest)) {
      earliest = index;
    }
  }

  return earliest;
}

function looksFullyMechanical(text) {
  if (!/\d|%|\+/.test(text)) return false;
  return MECHANICAL_CONTENT.test(text);
}

/**
 * Split trait spell description into flavor text and mechanical bonus.
 * @param {string} text
 * @returns {{ description: string, bonus: string }}
 */
export function parseTraitBody(text) {
  const cleaned = cleanTraitText(text);
  if (!cleaned) return { description: "", bonus: "" };

  if (MECHANICAL_START.test(cleaned)) {
    return finalize({ description: "", bonus: cleaned });
  }

  const splitIndex = findMechanicalSplitIndex(cleaned);
  if (splitIndex !== -1) {
    let description = cleaned.slice(0, splitIndex + 1);
    let bonus = cleaned.slice(splitIndex + 2).trim();
    if (
      hasMeaningfulText(description) &&
      (looksFullyMechanical(description) || MECHANICAL_START.test(description))
    ) {
      bonus = `${description} ${bonus}`.trim();
      description = "";
    }
    return finalize({ description, bonus });
  }

  if (looksFullyMechanical(cleaned)) {
    return finalize({ description: "", bonus: cleaned });
  }

  return finalize({ description: cleaned, bonus: "" });
}
