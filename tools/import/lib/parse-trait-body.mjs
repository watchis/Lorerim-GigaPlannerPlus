import { cleanDescription } from "./transform-utils.mjs";

const MECHANICAL_START =
  /^(?:[-+]?\d+%?|Gain |you gain |Spells? |Novice |Apprentice |Adept |Bows |Crossbows |Deal |You can |Food benefits |Potions |Reading |Your birthsign|Your hostile |Your attacks |Fire spells |Shock spells |Frost spells |When (?:your|at|facing|not) |Start with |Mudcrabs |Weapon and |Skooma |Spriggans |Dwemer |-\d+)/i;

const MECHANICAL_SPLIT =
  /[.;]\s+(?=[-+]?\d+%?|Gain |you gain |Spells? |Novice |Apprentice |Adept |Bows |Crossbows |Deal |You can |Food benefits |Potions |Reading |Your birthsign|Your hostile |Your attacks |Fire spells |Shock spells |Frost spells |When (?:your|at|facing|not) |Start with |Mudcrabs |Weapon and |Skooma |Spriggans |Dwemer |-\d+)/i;

function cleanTraitText(text) {
  return cleanDescription(String(text ?? ""))
    .replace(/<([^<>]+)>/g, "$1")
    .trim();
}

function normalizeFlavor(description) {
  return description.replace(/;$/, ".").trim();
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
    return { description: "", bonus: cleaned };
  }

  const splitIndex = cleaned.search(MECHANICAL_SPLIT);
  if (splitIndex === -1) {
    return { description: cleaned, bonus: "" };
  }

  return {
    description: normalizeFlavor(cleaned.slice(0, splitIndex + 1)),
    bonus: cleaned.slice(splitIndex + 2).trim(),
  };
}
