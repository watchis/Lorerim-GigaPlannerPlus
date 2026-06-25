/**
 * Rule-based parser: bonus description text → planner Effect[].
 * Best-effort only; conditional or narrative bonuses may parse partially or not at all.
 */

const PERCENT_WORDS_POSITIVE =
  /\b(?:more|stronger|better|faster|easier|increased|higher|longer|extra)\b/i;
const PERCENT_WORDS_NEGATIVE =
  /\b(?:less|weaker|worse|slower|reduced|lower|shorter|vulnerable|worse)\b/i;

/** @typedef {{ type: string, stat?: string, value?: number, isPercent?: boolean }} Effect */

/**
 * @param {number} value
 * @param {boolean} isPercent
 * @returns {Effect}
 */
function derived(stat, value, isPercent = true) {
  return { type: "derivedStat", stat, value, isPercent };
}

/**
 * @param {"health" | "magicka" | "stamina"} stat
 * @param {number} value
 * @returns {Effect}
 */
function attribute(stat, value) {
  return { type: "attribute", stat, value };
}

/**
 * @param {string} stat
 * @returns {Effect}
 */
function flag(stat) {
  return { type: "flag", stat };
}

/**
 * @param {string | number} multiplier
 * @returns {number}
 */
function multiplierToPercent(multiplier) {
  return Math.round((Number(multiplier) - 1) * 100);
}

/**
 * @param {string} fullText
 * @returns {string[] | null}
 */
function detectWeaponDamageStats(fullText) {
  const lower = fullText.toLowerCase();
  if (/two-?handed\s+weapons?/.test(lower)) return ["twoHandDamage"];
  if (/one-?handed\s+weapons?/.test(lower)) return ["oneHandDamage"];
  if (/\bbows?\b/.test(lower) && /\bcrossbows?\b/.test(lower)) {
    return ["bowDamage", "crossbowDamage"];
  }
  if (/\bbows?\b/.test(lower)) return ["bowDamage"];
  if (/\bcrossbows?\b/.test(lower)) return ["crossbowDamage"];
  if (/shield\s+bash/.test(lower)) return ["meleeDamage"];
  if (/bow\s+bash/.test(lower)) return ["bowDamage"];
  return null;
}

/**
 * @param {Effect[]} effects
 * @param {string} fullText
 * @param {number} value
 */
function applyGenericDamageBoost(effects, fullText, value) {
  const weaponStats = detectWeaponDamageStats(fullText);
  if (weaponStats) {
    for (const stat of weaponStats) {
      effects.push(derived(stat, value));
    }
    return;
  }
  effects.push(derived("meleeDamage", value));
  effects.push(derived("rangedDamage", value));
}

const ALLY_LEADERSHIP_DESCRIPTION =
  /\blead your allies\b|\beffectively lead your allies\b|\bnearby allies,?\s+but\s+not\s+the\s+player\b|\ballies,?\s+but\s+not\s+the\s+player\b/i;

/**
 * @param {string} phrase
 * @returns {boolean}
 */
function isAllyOnlyPhrase(phrase) {
  const trimmed = String(phrase ?? "").trim();
  if (!trimmed) return false;
  if (/\bbut\s+not\s+the\s+player\b/i.test(trimmed)) return true;
  if (/\bimprove\s+nearby\s+allies\b/i.test(trimmed)) return true;
  if (/\bnearby\s+(?:summoned\s+or\s+)?reanimated\s+allies\b/i.test(trimmed)) return true;
  if (/\bof\s+nearby\s+allies\b/i.test(trimmed)) return true;
  if (/\btheir\s+(?:regeneration|skills|magicka|stamina)\b/i.test(trimmed)) return true;
  if (/\bnearby\s+allies\b/i.test(trimmed) && !/\byou(?:rself|\s+and)\b/i.test(trimmed)) {
    return true;
  }
  if (/^allies\b/i.test(trimmed) && !/\byou\b/i.test(trimmed)) return true;
  return false;
}

/**
 * @param {string} fullText
 * @returns {boolean}
 */
function isAllyLeadershipDescription(fullText) {
  return ALLY_LEADERSHIP_DESCRIPTION.test(fullText);
}

/**
 * @param {string} text
 * @param {RegExpMatchArray} match
 * @returns {boolean}
 */
function isAllyOnlyMatch(text, match) {
  const before = text.slice(0, match.index);
  const start = Math.max(before.lastIndexOf(". "), before.lastIndexOf(", "), 0);
  const clause = text.slice(start, match.index + match[0].length + 40).replace(/^[.,\s]+/, "");
  return isAllyOnlyPhrase(clause);
}

const COMMA_PROTECT =
  /health,\s*magicka(?:,\s*and\s+stamina)?|health,\s*stamina\s+and\s+magicka|no health,\s*magicka(?:\s+or\s+stamina)?|fire,\s*frost\s+and\s+shock|spears,\s*javelins,\s*pikes,?\s+and\s+halberds|head,\s*chest,\s*hands,\s*and\s+feet|bows,\s*crossbows/gi;

/**
 * @param {string} clause
 * @returns {string[]}
 */
function splitCommaClauses(clause) {
  const trimmed = String(clause ?? "")
    .trim()
    .replace(/\.$/, "");
  if (!trimmed) return [];
  if (/^\s*(?:when|if|while)\b/i.test(trimmed)) {
    return [trimmed];
  }

  let normalized = trimmed;
  const placeholders = [];
  let placeholderIndex = 0;
  normalized = normalized.replace(COMMA_PROTECT, (match) => {
    const key = `\u0000${placeholderIndex++}\u0000`;
    placeholders.push([key, match]);
    return key;
  });

  return normalized
    .split(/,\s+/)
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      let restored = part;
      for (const [key, value] of placeholders) {
        restored = restored.replaceAll(key, value);
      }
      return restored;
    });
}

const CONDITIONAL_MARKERS =
  /\b(?:when|if|while|unless|without wearing|not wearing|without proficiency|below|above|less than|more than|per level|per \d+|each piece|for each|for every|up to|stackable|otherwise|the opposite|outdoors|in combat|crouched|standing up|friendly toward|cannot read skill books|cannot |can only|only benefit|only restore|those born under|sunny|snowy|rainy|weather|at less than|at more than|against four|against three|wearing an|while wearing|under the effects|when not under|when hit|when below|when above|in sunny|in the rain|in snowy|lose potency|enhanced during|excel in|weaken under|made of iron|made of|other beings|undead|daedra|werewolves|playable races|summon|thrall|resurrect|hostile shouts|non-hostile|every 5 levels|perk point|birthsigns? bonuses|divine amulet|gloves|gauntlets|armor slot|empty armor|raw and wriggling|eating fish|eating skeever|craft skooma|blessings|standing stones|soul gems|use scrolls and staves|dwemer armor|dwemer weapons|fishing rods|mudcrab|slaughterfish|spriggans|druidic|lifebloom|axes and|fire and|naturally regenerate|moonshadow|serpent's curse|don't affect you|do not adversely|fighting alone|not wearing|is active|are active|out of combat|pickpocketing)\b/i;

const MECHANICAL_MARKERS =
  /\d+%|\+\d+|-\d+|\d+(?:\.\d+)?x|\d+(?:\.\d+)?\s*(?:\/s|per\s+second)|\*\s*your\s+level|\bper\s+level\b|\bhalf\s+damage\b|\bdouble\s+damage\b|\bno\s+(?:health|magicka|stamina)\b|\bcannot\b|\bcan only\b|\bperk point\b|\bskill point\b|\bpower\b|\bspell\b|\bshout\b/i;

/**
 * @param {string} clause
 * @returns {boolean}
 */
function isConditionalClause(clause) {
  return CONDITIONAL_MARKERS.test(clause);
}

/**
 * @param {string} clause
 * @returns {boolean}
 */
function isMechanicalClause(clause) {
  return MECHANICAL_MARKERS.test(clause);
}

/**
 * @param {string} text
 * @returns {string[]}
 */
function extractParseSources(text) {
  const cleaned = String(text ?? "").trim();
  if (!cleaned) return [];
  const brackets = [...cleaned.matchAll(/\[([^\]]+)\]/g)]
    .map((match) => match[1].trim())
    .filter(Boolean);
  return brackets.length > 0 ? brackets : [cleaned];
}

/**
 * @param {string} text
 * @returns {{ text: string, sign: 1 | -1 }[]}
 */
function segmentBonusText(text) {
  const cleaned = String(text ?? "").trim();
  if (!cleaned) return [];
  if (
    /all\s+spells?\s+cost\s+\d+%\s+less\s+but\s+are\s+\d+%\s+weaker\s+or\s+last\s+\d+%\s+shorter/i.test(
      cleaned,
    )
  ) {
    return [{ text: cleaned, sign: 1 }];
  }

  const match = cleaned.match(/\b(?:however|but)\b[,:]?\s+/i);
  if (!match || match.index == null) {
    return [{ text: cleaned, sign: 1 }];
  }

  const before = cleaned.slice(0, match.index).trim().replace(/[.,\s]+$/, "");
  const after = cleaned.slice(match.index + match[0].length).trim();

  /** @type {{ text: string, sign: 1 | -1 }[]} */
  const segments = [];
  if (before) segments.push({ text: before, sign: 1 });
  if (after) segments.push({ text: after, sign: 1 });
  return segments;
}

/**
 * @param {string} phrase
 * @param {RegExpMatchArray} match
 * @returns {number}
 */
function percentValueFromPhrase(phrase, match) {
  const value = Number(match[1]);
  if (PERCENT_WORDS_NEGATIVE.test(phrase)) return -Math.abs(value);
  if (PERCENT_WORDS_POSITIVE.test(phrase)) return Math.abs(value);
  return value;
}

/**
 * @param {string} text
 * @param {RegExpMatchArray} match
 * @returns {boolean}
 */
function hasConditionalTail(text, match) {
  const after = text.slice(match.index + match[0].length);
  return /\b(?:when|while|if|against|from|with|wearing|below|above|under|during|outdoors|indoors|per|for each)\b/i.test(after);
}

/**
 * Some records combine an unconditional starting penalty/bonus with a scaling
 * conditional clause. Preserve the unconditional portion instead of dropping
 * the whole sentence as conditional.
 *
 * @param {string} rawText
 * @returns {Effect[]}
 */
function parseUnconditionalEffectsFromConditionalText(rawText) {
  const text = rawText.replace(/\s+/g, " ").trim();
  if (/^\s*(?:when|if|while|for each)\b/i.test(text)) return [];

  /** @type {Effect[]} */
  const effects = [];

  for (const match of text.matchAll(/start\s+with\s+\+?(\d+)\s+health,\s+magicka,\s+and\s+stamina/gi)) {
    const value = Number(match[1]);
    effects.push(attribute("health", value));
    effects.push(attribute("magicka", value));
    effects.push(attribute("stamina", value));
  }

  for (const match of text.matchAll(/start\s+with\s+(\d+)\s+less\s+health,\s*magicka\s+and\s+stamina/gi)) {
    const value = -Number(match[1]);
    effects.push(attribute("health", value));
    effects.push(attribute("magicka", value));
    effects.push(attribute("stamina", value));
  }

  for (const match of text.matchAll(/start\s+with\s+(\d+)\s+less\s+stamina\s+and\s+-(\d+)%\s+stamina\s+regeneration/gi)) {
    effects.push(attribute("stamina", -Number(match[1])));
    effects.push(derived("staminaRegen", -Number(match[2])));
  }

  for (const match of text.matchAll(/(?:you\s+)?start\s+with\s+\+?(\d+)\s+health\b/gi)) {
    const before = text.slice(Math.max(0, match.index - 20), match.index);
    if (/health,\s*magicka,\s*and\s*stamina/i.test(before)) continue;
    effects.push(attribute("health", Number(match[1])));
  }

  for (const match of text.matchAll(/you\s+take\s+(\d+)%\s+more\s+physical\s+damage\s+and\s+have\s+(\d+)%\s+weakness\s+to\s+poison/gi)) {
    effects.push(derived("damageTaken", Number(match[1])));
    effects.push(derived("poisonResist", -Number(match[2])));
  }

  for (const match of text.matchAll(/all\s+spells?\s+cost\s+(\d+)%\s+less\s+but\s+are\s+(\d+)%\s+weaker\s+or\s+last\s+(\d+)%\s+shorter/gi)) {
    effects.push(derived("spellCost", -Number(match[1])));
    effects.push(derived("spellDamage", -Number(match[2])));
    effects.push(derived("spellDuration", -Number(match[3])));
  }

  for (const match of text.matchAll(/(?:can\s+)?breath(?:e)?\s+underwater/gi)) {
    effects.push(flag("waterbreathing"));
  }

  for (const match of text.matchAll(/you\s+swim\s+(\d+)%\s+faster/gi)) {
    effects.push(derived("swimmingSpeed", Number(match[1])));
  }

  for (const match of text.matchAll(/movement\s+is\s+(\d+)\s*percent\s+faster/gi)) {
    effects.push(derived("moveSpeed", Number(match[1])));
  }

  for (const match of text.matchAll(/move\s+(\d+)%\s+faster\s+when\s+sneaking/gi)) {
    effects.push(derived("sneakSpeed", Number(match[1])));
  }

  for (const match of text.matchAll(/your\s+disease\s+resistance\s+is\s+reduced\s+by\s+(\d+)%/gi)) {
    effects.push(derived("diseaseResist", -Number(match[1])));
  }

  for (const match of text.matchAll(/you\s+cannot\s+naturally\s+regenerate\s+magicka/gi)) {
    effects.push(flag("noMagickaRegen"));
  }

  return effects;
}

/**
 * @param {string} segmentText
 * @param {string} fullText
 * @returns {Effect[]}
 */
function parseSegment(segmentText, fullText) {
  const normalized = segmentText.replace(/\s+/g, " ").trim();
  const sentences = normalized
    .split(/\.\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
  const clauses = sentences.length > 1 ? sentences : [normalized];
  return clauses.flatMap((clause) => parseSegmentClause(clause, fullText));
}

/**
 * @param {string} clause
 * @param {string} fullText
 * @returns {Effect[]}
 */
function parseSegmentClause(clause, fullText) {
  if (/^\s*(?:when|if|while)\b/i.test(clause)) {
    return [];
  }
  if (isAllyOnlyPhrase(clause)) {
    return [];
  }

  /** @type {Effect[]} */
  const effects = [];
  let remaining = clause;
  for (const match of clause.matchAll(
    /fire,\s*frost,?\s+and\s+shock\s+deal\s+(\d+)%\s+less\s+damage/gi,
  )) {
    const value = Number(match[1]);
    effects.push(derived("fireResist", value));
    effects.push(derived("frostResist", value));
    effects.push(derived("shockResist", value));
    remaining = remaining.replace(match[0], " ");
  }

  const commaParts = splitCommaClauses(remaining);
  if (commaParts.length === 1 && isConditionalClause(remaining)) {
    return [
      ...effects,
      ...parseUnconditionalEffectsFromConditionalText(remaining),
    ];
  }
  const textsToParse =
    commaParts.length > 1 ? commaParts : [remaining.replace(/\.$/, "")];
  return [
    ...effects,
    ...textsToParse.flatMap((part) => {
      if (/^\s*(?:when|if|while)\b/i.test(part) || isAllyOnlyPhrase(part)) return [];
      if (isConditionalClause(part)) {
        return parseUnconditionalEffectsFromConditionalText(part);
      }
      return parseRulesOnText(part, fullText);
    }),
  ];
}

/**
 * @param {string} rawText
 * @param {string} [fullText]
 * @returns {Effect[]}
 */
function parseRulesOnText(rawText, fullText = rawText) {
  if (isAllyLeadershipDescription(fullText) && rawText !== fullText) {
    return [];
  }

  const effects = [];
  const text = rawText.replace(/\s+/g, " ");

  const rules = [
    {
      pattern:
        /bows?\s+and\s+crossbows?\s+deal\s+(\d+)%\s+(more|less)\s+damage/gi,
      apply(match) {
        const value = percentValueFromPhrase(match[0], match);
        effects.push(derived("bowDamage", value));
        effects.push(derived("crossbowDamage", value));
      },
    },
    {
      pattern: /bows?\s+draw\s+(\d+)%\s+(faster|slower)/gi,
      apply(match) {
        effects.push(derived("drawSpeed", percentValueFromPhrase(match[0], match)));
      },
    },
    {
      pattern: /crossbows?\s+reload\s+(\d+)%\s+(faster|slower)/gi,
      apply(match) {
        effects.push(derived("reloadSpeed", percentValueFromPhrase(match[0], match)));
      },
    },
    {
      pattern: /(?:they\s+)?draw\/reload\s+(\d+)%\s+(faster|slower)/gi,
      apply(match) {
        const value = percentValueFromPhrase(match[0], match);
        effects.push(derived("drawSpeed", value));
        effects.push(derived("reloadSpeed", value));
      },
    },
    {
      pattern: /gain\s+\+?(\d+)\s+carry\s*weight/gi,
      apply(match) {
        effects.push(derived("carryWeight", Number(match[1]), false));
      },
    },
    {
      pattern: /\+?(\d+)\s+more\s+carry\s*weight/gi,
      apply(match) {
        effects.push(derived("carryWeight", Number(match[1]), false));
      },
    },
    {
      pattern: /magic\s+weakness\s+(?:is\s+)?increased\s+by\s+(\d+)%/gi,
      apply(match) {
        effects.push(derived("magicResist", -Number(match[1])));
      },
    },
    {
      pattern: /spells?\s+are\s+(\d+)%\s+cheaper/gi,
      apply(match) {
        effects.push(derived("spellCost", -Number(match[1])));
      },
    },
    {
      pattern: /(?<!all\s)(?:[a-z-]+\s+)?spells?\s+cost\s+(\d+)%\s+less\s+to\s+cast/gi,
      apply(match) {
        if (hasConditionalTail(text, match)) return;
        effects.push(derived("spellCost", -Number(match[1])));
      },
    },
    {
      pattern:
        /all\s+spells?\s+cost\s+(\d+)%\s+less\s+but\s+are\s+(\d+)%\s+weaker\s+or\s+last\s+(\d+)%\s+shorter/gi,
      apply(match) {
        effects.push(derived("spellCost", -Number(match[1])));
        effects.push(derived("spellDamage", -Number(match[2])));
        effects.push(derived("spellDuration", -Number(match[3])));
      },
    },
    {
      pattern: /(\d+)%\s+chance\s+to\s+take\s+half\s+damage/gi,
      apply(match) {
        effects.push(derived("dodgeChance", Number(match[1])));
      },
    },
    {
      pattern: /(\d+)%\s+chance\s+to\s+avoid\s+physical\s+damage/gi,
      apply(match) {
        effects.push(derived("dodgeChance", Number(match[1])));
      },
    },
    {
      pattern: /armor\s+penetration\s+with\s+all\s+weapons\s+is\s+increased\s+by\s+(\d+)/gi,
      apply(match) {
        const value = Number(match[1]);
        effects.push(derived("armorPenetrationMelee", value, false));
        effects.push(derived("armorPenetrationRanged", value, false));
      },
    },
    {
      pattern: /unarmed\s+strikes?\s+do\s+(\d+)\s+additional\s+damage/gi,
      apply(match) {
        effects.push(derived("unarmedDamage", Number(match[1]), false));
      },
    },
    {
      pattern: /lockpicking\s+expertise\s+is\s+increased\s+by\s+(\d+)/gi,
      apply(match) {
        effects.push(derived("lockpicking", Number(match[1]), false));
      },
    },
    {
      pattern: /(?:selling\s+)?prices?\s+are\s+(\d+)%\s+(better|worse)/gi,
      apply(match) {
        effects.push(derived("priceModifier", percentValueFromPhrase(match[0], match)));
      },
    },
    {
      pattern: /spells?\s+are\s+(\d+)%\s+(stronger|weaker)/gi,
      apply(match) {
        const before = text.slice(0, match.index);
        if (/\b(?:novice|apprentice|adept|expert|master)\b/i.test(before)) return;
        const afterMatch = text.slice(match.index + match[0].length);
        if (/\bwhen\b/i.test(afterMatch.split(/[,.]/)[0] ?? "")) return;
        effects.push(derived("spellDamage", percentValueFromPhrase(match[0], match)));
      },
    },
    {
      pattern: /unarmed\s+attacks?\s+do\s+\+?(\d+)\s+more\s+damage/gi,
      apply(match) {
        effects.push(derived("unarmedDamage", Number(match[1]), false));
      },
    },
    {
      pattern:
        /(?:deal|do)\s+(\d+)%\s+(more|less)\s+damage\s+with\s+weapons(?:\s+and\s+destruction\s+spells)?/gi,
      apply(match) {
        const value = percentValueFromPhrase(match[0], match);
        effects.push(derived("meleeDamage", value));
        effects.push(derived("rangedDamage", value));
        effects.push(derived("spellDamage", value));
      },
    },
    {
      pattern: /overall\s+weapon\s+damage\s+is\s+reduced\s+by\s+(\d+)%/gi,
      apply(match) {
        const value = -Number(match[1]);
        effects.push(derived("meleeDamage", value));
        effects.push(derived("rangedDamage", value));
      },
    },
    {
      pattern: /(?<!overall\s)weapon\s+damage\s+is\s+reduced\s+by\s+(\d+)%/gi,
      apply(match) {
        const value = -Number(match[1]);
        effects.push(derived("meleeDamage", value));
        effects.push(derived("rangedDamage", value));
      },
    },
    {
      pattern: /armor\s+rating\s+and\s+weapon\s+damage\s+is\s+reduced\s+by\s+(\d+)%/gi,
      apply(match) {
        const value = -Number(match[1]);
        effects.push(derived("armorRating", value, false));
        effects.push(derived("meleeDamage", value));
        effects.push(derived("rangedDamage", value));
      },
    },
    {
      pattern: /(\d+)%\s+magic\s+resist(?:ance)?/gi,
      apply(match) {
        if (match.index > 0 && text[match.index - 1] === "+") return;
        effects.push(derived("magicResist", Number(match[1])));
      },
    },
    {
      pattern: /resist\s+(\d+)%\s+of\s+(magic|fire|frost|shock|poison)(?:\s+damage)?/gi,
      apply(match) {
        const kind = match[2].toLowerCase();
        const stat = kind === "magic" ? "magicResist" : `${kind}Resist`;
        effects.push(derived(stat, Number(match[1])));
      },
    },
    {
      pattern: /increases?\s+(fire|frost|shock|poison|disease)\s+resistance\s+by\s+(\d+)%/gi,
      apply(match) {
        effects.push(derived(`${match[1].toLowerCase()}Resist`, Number(match[2])));
      },
    },
    {
      pattern: /(\d+)%\s+(more|less)\s+vulnerable\s+to\s+(fire|frost|shock|poison)\s+damage/gi,
      apply(match) {
        const resistStat = `${match[3].toLowerCase()}Resist`;
        effects.push(derived(resistStat, percentValueFromPhrase(match[0], match)));
      },
    },
    {
      pattern: /weakness\s+to\s+(fire|frost|shock|poison)\s+(?:is\s+)?(?:increased\s+by\s+)?(\d+)%/gi,
      apply(match) {
        const resistStat = `${match[1].toLowerCase()}Resist`;
        effects.push(derived(resistStat, -Number(match[2])));
      },
    },
    {
      pattern: /gain\s+(\d+)%\s+weakness\s+to\s+(fire|frost|shock|poison)/gi,
      apply(match) {
        const resistStat = `${match[2].toLowerCase()}Resist`;
        effects.push(derived(resistStat, -Number(match[1])));
      },
    },
    {
      pattern: /have\s+(?:a\s+)?(\d+)%\s+weakness\s+to\s+(fire|frost|shock|poison|disease)/gi,
      apply(match) {
        const resistStat = `${match[2].toLowerCase()}Resist`;
        effects.push(derived(resistStat, -Number(match[1])));
      },
    },
    {
      pattern: /your\s+(fire|frost|shock|poison|disease)\s+resistance\s+is\s+reduced\s+by\s+(\d+)%/gi,
      apply(match) {
        const resistStat = `${match[1].toLowerCase()}Resist`;
        effects.push(derived(resistStat, -Number(match[2])));
      },
    },
    {
      pattern: /(?:you\s+)?take\s+(\d+)%\s+(more|less)\s+damage/gi,
      apply(match) {
        if (hasConditionalTail(text, match)) return;
        const value = percentValueFromPhrase(match[0], match);
        effects.push(derived("damageTaken", value));
      },
    },
    {
      pattern: /you\s+deal\s+(\d+)%\s+(more|less)\s+damage/gi,
      apply(match) {
        if (hasConditionalTail(text, match)) return;
        const value = percentValueFromPhrase(match[0], match);
        effects.push(derived("meleeDamage", value));
        effects.push(derived("rangedDamage", value));
      },
    },
    {
      pattern: /you\s+move\s+(\d+)%\s+(faster|slower)/gi,
      apply(match) {
        effects.push(derived("moveSpeed", percentValueFromPhrase(match[0], match)));
      },
    },
    {
      pattern: /you\s+are\s+(\d+)%\s+more\s+effective\s+with\s+(one-handed|two-handed|missile)\s+weapons/gi,
      apply(match) {
        const value = Number(match[1]);
        const weapon = match[2].toLowerCase();
        if (weapon === "one-handed") {
          effects.push(derived("oneHandDamage", value));
          return;
        }
        if (weapon === "two-handed") {
          effects.push(derived("twoHandDamage", value));
          return;
        }
        effects.push(derived("bowDamage", value));
        effects.push(derived("crossbowDamage", value));
      },
    },
    {
      pattern: /movement\s+is\s+(\d+)\s*percent\s+faster/gi,
      apply(match) {
        effects.push(derived("moveSpeed", Number(match[1])));
      },
    },
    {
      pattern: /move\s+(\d+)%\s+faster\s+when\s+sneaking/gi,
      apply(match) {
        effects.push(derived("sneakSpeed", Number(match[1])));
      },
    },
    {
      pattern: /(?:you\s+are\s+)?(\d+)%\s+harder\s+to\s+detect/gi,
      apply(match) {
        effects.push(derived("detectDifficulty", Number(match[1])));
      },
    },
    {
      pattern: /(?:can\s+)?sneak\s+(\d+)%\s+better/gi,
      apply(match) {
        effects.push(derived("detectDifficulty", Number(match[1])));
      },
    },
    {
      pattern: /shouts?\s+are\s+(\d+)%\s+stronger/gi,
      apply(match) {
        effects.push(derived("shoutPower", Number(match[1])));
      },
    },
    {
      pattern: /shout\s+(\d+)%\s+more\s+often/gi,
      apply(match) {
        effects.push(derived("shoutCooldownReduction", Number(match[1])));
      },
    },
    {
      pattern: /(\d+)%\s+reduced\s+effectiveness/gi,
      apply(match) {
        effects.push(derived("shoutPower", -Number(match[1])));
      },
    },
    {
      pattern: /absorb\s+(\d+)%\s+of\s+incoming\s+spells/gi,
      apply(match) {
        if (hasConditionalTail(text, match)) return;
        effects.push(derived("magicAbsorb", Number(match[1])));
      },
    },
    {
      pattern: /food\s+benefits?\s+are\s+(\d+)%\s+stronger/gi,
      apply(match) {
        effects.push(derived("potionEffectiveness", Number(match[1])));
      },
    },
    {
      pattern: /potions?\s+(?:have\s+only|are)\s+(\d+)%\s+their\s+efficiency/gi,
      apply(match) {
        effects.push(derived("potionEffectiveness", Number(match[1]) - 100));
      },
    },
    {
      pattern: /potions?\s+and\s+poisons?\s+you\s+craft\s+are\s+(\d+)%\s+more\s+effective/gi,
      apply(match) {
        effects.push(derived("potionEffectiveness", Number(match[1])));
      },
    },
    {
      pattern: /beneficial\s+spells\s+and\s+potions\s+last\s+(\d+)%\s+longer/gi,
      apply(match) {
        effects.push(derived("potionEffectiveness", Number(match[1])));
      },
    },
    {
      pattern: /trainers?\s+cost\s+(\d+)%\s+less/gi,
      apply(match) {
        effects.push(derived("priceModifier", Number(match[1])));
      },
    },
    {
      pattern: /(\d+)%\s+chance\s+to\s+critical\s+hit/gi,
      apply(match) {
        effects.push(derived("criticalHitChance", Number(match[1])));
      },
    },
    {
      pattern: /-(\d+)\s+speech/gi,
      apply(match) {
        effects.push(derived("speech", -Number(match[1]), false));
      },
    },
    {
      pattern:
        /health\s+and\s+magicka\s+(?:increase(?:s|d)?|are\s+increased)\s+by\s+(\d+)/gi,
      apply(match) {
        const value = Number(match[1]);
        effects.push(attribute("health", value));
        effects.push(attribute("magicka", value));
      },
    },
    {
      pattern:
        /health\s+and\s+stamina\s+(?:increase(?:s|d)?|are\s+increased)\s+by\s+(\d+)/gi,
      apply(match) {
        const value = Number(match[1]);
        effects.push(attribute("health", value));
        effects.push(attribute("stamina", value));
      },
    },
    {
      pattern:
        /magicka\s+and\s+stamina\s+(?:increase(?:s|d)?|are\s+increased)\s+by\s+(\d+)/gi,
      apply(match) {
        const before = text.slice(0, match.index);
        if (/health,\s*$/i.test(before)) return;
        const value = Number(match[1]);
        effects.push(attribute("magicka", value));
        effects.push(attribute("stamina", value));
      },
    },
    {
      pattern:
        /health,\s*magicka\s+and\s+stamina\s+are\s+increased\s+by\s+(\d+)\s+each/gi,
      apply(match) {
        const value = Number(match[1]);
        effects.push(attribute("health", value));
        effects.push(attribute("magicka", value));
        effects.push(attribute("stamina", value));
      },
    },
    {
      pattern: /(?<!\band\s)health\s+(?:increases?|increased)\s+by\s+(\d+)/gi,
      apply(match) {
        effects.push(attribute("health", Number(match[1])));
      },
    },
    {
      pattern: /(?<!\band\s)magicka\s+(?:increases?|increased)\s+by\s+(\d+)/gi,
      apply(match) {
        effects.push(attribute("magicka", Number(match[1])));
      },
    },
    {
      pattern: /(?<!\band\s)stamina\s+(?:increases?|increased)\s+by\s+(\d+)/gi,
      apply(match) {
        effects.push(attribute("stamina", Number(match[1])));
      },
    },
    {
      pattern: /start\s+with\s+\+(\d+)\s+health,\s+magicka,\s+and\s+stamina/gi,
      apply(match) {
        const value = Number(match[1]);
        effects.push(attribute("health", value));
        effects.push(attribute("magicka", value));
        effects.push(attribute("stamina", value));
      },
    },
    {
      pattern: /start\s+with\s+(\d+)\s+less\s+health,\s*magicka\s+and\s+stamina/gi,
      apply(match) {
        const value = -Number(match[1]);
        effects.push(attribute("health", value));
        effects.push(attribute("magicka", value));
        effects.push(attribute("stamina", value));
      },
    },
    {
      pattern: /(?:you\s+)?start\s+with\s+(\d+)\s+less\s+magicka/gi,
      apply(match) {
        effects.push(attribute("magicka", -Number(match[1])));
      },
    },
    {
      pattern: /start\s+with\s+(\d+)\s+less\s+stamina\s+and\s+-(\d+)%\s+stamina\s+regeneration/gi,
      apply(match) {
        effects.push(attribute("stamina", -Number(match[1])));
        effects.push(derived("staminaRegen", -Number(match[2])));
      },
    },
    {
      pattern: /all\s+weapons\s+deal\s+(\d+)%\s+more\s+damage/gi,
      apply(match) {
        const value = Number(match[1]);
        effects.push(derived("oneHandDamage", value));
        effects.push(derived("twoHandDamage", value));
        effects.push(derived("bowDamage", value));
        effects.push(derived("crossbowDamage", value));
      },
    },
    {
      pattern: /\+(\d+)\s+lockpicking\s+expertise/gi,
      apply(match) {
        effects.push(derived("lockpicking", Number(match[1]), false));
      },
    },
    {
      pattern: /\+(\d+)\s+carry\s+weight/gi,
      apply(match) {
        effects.push(derived("carryWeight", Number(match[1]), false));
      },
    },
    {
      pattern:
        /increases?\s+your\s+(health|magicka|stamina)\s+by\s+(\d+)\s+points/gi,
      apply(match) {
        effects.push(attribute(match[1].toLowerCase(), Number(match[2])));
      },
    },
    {
      pattern: /\+(\d+)%\s+(fire|frost|shock|poison)\s+resist/gi,
      apply(match) {
        effects.push(derived(`${match[2].toLowerCase()}Resist`, Number(match[1])));
      },
    },
    {
      pattern: /poison\s+deals\s+(\d+)%\s+less\s+damage\s+to\s+you/gi,
      apply(match) {
        effects.push(derived("poisonResist", Number(match[1])));
      },
    },
    {
      pattern: /armor\s+penetration\s+with\s+(melee|ranged)\s+weapons\s+is\s+increased\s+by\s+(\d+)/gi,
      apply(match) {
        const stat =
          match[1].toLowerCase() === "melee"
            ? "armorPenetrationMelee"
            : "armorPenetrationRanged";
        effects.push(derived(stat, Number(match[2]), false));
      },
    },
    {
      pattern: /you\s+can\s+run\s+or\s+swim\s+without\s+exertion/gi,
      apply() {
        effects.push(flag("noSprintCost"));
      },
    },
    {
      pattern: /you\s+gain\s+(\d+)\s+armor\s+rating/gi,
      apply(match) {
        if (hasConditionalTail(text, match)) return;
        effects.push(derived("armorRating", Number(match[1]), false));
      },
    },
    {
      pattern: /(?:gain\s+)?(\d+)\s+armor\s+rating/gi,
      apply(match) {
        if (hasConditionalTail(text, match)) return;
        effects.push(derived("armorRating", Number(match[1]), false));
      },
    },
    {
      pattern: /restore\s+([\d.]+)\s+health\s+per\s+second/gi,
      apply(match) {
        effects.push(derived("healthRegenRate", Number(match[1]), false));
      },
    },
    {
      pattern: /regenerate\s+([\d.]+)\s+health\s+per\s+second/gi,
      apply(match) {
        effects.push(derived("healthRegenRate", Number(match[1]), false));
      },
    },
    {
      pattern: /health,\s*magicka,?\s+and\s+stamina\s+regenerate\s+(\d+)%\s+faster/gi,
      apply(match) {
        const value = Number(match[1]);
        effects.push(derived("healthRegen", value));
        effects.push(derived("magickaRegen", value));
        effects.push(derived("staminaRegen", value));
      },
    },
    {
      pattern:
        /health\s+and\s+magicka\s+increase\s+by\s+\d+\s+and\s+regenerate\s+(\d+)%\s+faster/gi,
      apply(match) {
        const value = Number(match[1]);
        effects.push(derived("healthRegen", value));
        effects.push(derived("magickaRegen", value));
      },
    },
    {
      pattern: /magicka\s+regenerates?\s+(\d+)%\s+faster/gi,
      apply(match) {
        effects.push(derived("magickaRegen", Number(match[1])));
      },
    },
    {
      pattern: /regenerate\s+(health|magicka|stamina)\s+(\d+)%\s+faster/gi,
      apply(match) {
        if (hasConditionalTail(text, match)) return;
        const stat = `${match[1].toLowerCase()}Regen`;
        effects.push(derived(stat, Number(match[2])));
      },
    },
    {
      pattern: /you\s+regenerate\s+(health|magicka|stamina)\s+(\d+)%\s+faster/gi,
      apply(match) {
        if (hasConditionalTail(text, match)) return;
        const stat = `${match[1].toLowerCase()}Regen`;
        effects.push(derived(stat, Number(match[2])));
      },
    },
    {
      pattern: /absorb\s+chance\s+increased\s+by\s+(\d+)%/gi,
      apply(match) {
        effects.push(derived("magicAbsorb", Number(match[1])));
      },
    },
    {
      pattern: /\+?(\d+)%\s+magic\s+absorb\s+chance/gi,
      apply(match) {
        effects.push(derived("magicAbsorb", Number(match[1])));
      },
    },
    {
      pattern: /increases?\s+magic\s+resist(?:ance)?\s+by\s+(\d+)%/gi,
      apply(match) {
        effects.push(derived("magicResist", Number(match[1])));
      },
    },
    {
      pattern: /\+(\d+)%\s+magic\s+resist(?:ance)?/gi,
      apply(match) {
        if (hasConditionalTail(text, match)) return;
        effects.push(derived("magicResist", Number(match[1])));
      },
    },
    {
      pattern: /potions?\s+(?:are\s+)?(?:now\s+)?(\d+)%\s+stronger/gi,
      apply(match) {
        effects.push(derived("potionEffectiveness", Number(match[1])));
      },
    },
    {
      pattern: /poisons?\s+(?:are\s+)?(\d+)%\s+more\s+potent/gi,
      apply(match) {
        effects.push(derived("potionEffectiveness", Number(match[1])));
      },
    },
    {
      pattern: /food\s+effects?\s+are\s+(\d+)%\s+stronger/gi,
      apply(match) {
        effects.push(derived("potionEffectiveness", Number(match[1])));
      },
    },
    {
      pattern: /disease\s+and\s+poison\s+\((\d+)%\s+and\s+(\d+)%/gi,
      apply(match) {
        effects.push(derived("diseaseResist", Number(match[1])));
        effects.push(derived("poisonResist", Number(match[2])));
      },
    },
    {
      pattern: /\+(\d+)%\s+armor\s+penetration/gi,
      apply(match) {
        const value = Number(match[1]);
        effects.push(derived("armorPenetrationMelee", value));
        effects.push(derived("armorPenetrationRanged", value));
      },
    },
    {
      pattern: /(?:^|[,\s])(\d+)%\s+armor\s+penetration/gi,
      apply(match) {
        const value = Number(match[1]);
        effects.push(derived("armorPenetrationMelee", value));
        effects.push(derived("armorPenetrationRanged", value));
      },
    },
    {
      pattern: /(\d+)%\s+more\s+power\s+attack\s+damage/gi,
      apply(match) {
        effects.push(derived("meleeDamage", Number(match[1])));
      },
    },
    {
      pattern: /(?:^|,\s*)(\d+)%\s+more\s+damage\b/gi,
      apply(match) {
        const before = text.slice(Math.max(0, match.index - 30), match.index);
        if (/\bdeal\s*$/i.test(before.trimEnd())) return;
        applyGenericDamageBoost(effects, fullText, Number(match[1]));
      },
    },
    {
      pattern: /do\s+(\d+)%\s+more\s+damage\s+with\s+melee\s+attacks/gi,
      apply(match) {
        effects.push(derived("meleeDamage", Number(match[1])));
      },
    },
    {
      pattern: /increases?\s+carry\s*weight\s+by\s+(\d+)/gi,
      apply(match) {
        effects.push(derived("carryWeight", Number(match[1]), false));
      },
    },
    {
      pattern:
        /your\s+(health|magicka|stamina)\s+regeneration\s+is\s+increased\s+by\s+(\d+)%/gi,
      apply(match) {
        if (hasConditionalTail(text, match)) return;
        const regenStat =
          match[1].toLowerCase() === "health"
            ? "healthRegen"
            : match[1].toLowerCase() === "magicka"
              ? "magickaRegen"
              : "staminaRegen";
        effects.push(derived(regenStat, Number(match[2])));
      },
    },
    {
      pattern: /you\s+deal\s+(\d+)%\s+more\s+weapon\s+damage/gi,
      apply(match) {
        if (hasConditionalTail(text, match)) return;
        const value = Number(match[1]);
        effects.push(derived("meleeDamage", value));
        effects.push(derived("rangedDamage", value));
      },
    },
    {
      pattern: /(\d+)%\s+more\s+melee\s+damage/gi,
      apply(match) {
        if (hasConditionalTail(text, match)) return;
        effects.push(derived("meleeDamage", Number(match[1])));
      },
    },
    {
      pattern: /weapon\s+damage\s+and\s+armor\s+rating\s+is\s+increased\s+by\s+(\d+)%/gi,
      apply(match) {
        const value = Number(match[1]);
        effects.push(derived("meleeDamage", value));
        effects.push(derived("rangedDamage", value));
        effects.push(derived("armorRating", value));
      },
    },
    {
      pattern: /power\s+attacks?\s+deal\s+(\d+)%\s+more\s+damage/gi,
      apply(match) {
        effects.push(derived("meleeDamage", Number(match[1])));
      },
    },
    {
      pattern: /bashing\s+does\s+(\d+)%\s+more\s+damage/gi,
      apply(match) {
        effects.push(derived("meleeDamage", Number(match[1])));
      },
    },
    {
      pattern: /block\s+(\d+)%\s+more\s+damage/gi,
      apply(match) {
        effects.push(derived("damageTaken", -Number(match[1])));
      },
    },
    {
      pattern: /(\d+)%\s+more\s+armor\s+rating/gi,
      apply(match) {
        effects.push(derived("armorRating", Number(match[1])));
      },
    },
    {
      pattern: /\+(\d+)%\s+critical\s+hit\s+chance/gi,
      apply(match) {
        effects.push(derived("criticalHitChance", Number(match[1])));
      },
    },
    {
      pattern: /(\d+)%\s+critical\s+hit\s+chance/gi,
      apply(match) {
        effects.push(derived("criticalHitChance", Number(match[1])));
      },
    },
    {
      pattern: /shouts?\s+are\s+(\d+)%\s+more\s+powerful/gi,
      apply(match) {
        effects.push(derived("shoutPower", Number(match[1])));
      },
    },
    {
      pattern: /shout\s+cooldown\s+is\s+reduced\s+by\s+(\d+)%/gi,
      apply(match) {
        effects.push(derived("shoutCooldownReduction", Number(match[1])));
      },
    },
    {
      pattern: /\+(\d+)%\s+movement\s+speed/gi,
      apply(match) {
        effects.push(derived("moveSpeed", Number(match[1])));
      },
    },
    {
      pattern: /\+(\d+)%\s+stamina\s+regeneration/gi,
      apply(match) {
        effects.push(derived("staminaRegen", Number(match[1])));
      },
    },
    {
      pattern: /spells?\s+(?:up\s+to\s+\w+\s+level\s+)?cost\s+(\d+)%\s+less\s+magicka/gi,
      apply(match) {
        effects.push(derived("spellCost", -Number(match[1])));
      },
    },
    {
      pattern: /cast\s+\w+\s+level\s+\w+\s+spells?\s+for\s+half\s+magicka/gi,
      apply() {
        effects.push(derived("spellCost", -50));
      },
    },
    {
      pattern: /staves?\s+and\s+scrolls?\s+are\s+(\d+)%\s+more\s+powerful/gi,
      apply(match) {
        effects.push(derived("spellDamage", Number(match[1])));
      },
    },
    {
      pattern: /enchantments?\s+cost\s+(\d+)%\s+less\s+charges/gi,
      apply(match) {
        effects.push(derived("spellCost", -Number(match[1])));
      },
    },
    {
      pattern: /while\s+holding\s+a\s+staff,\s*spells?\s+are\s+(\d+)%\s+more\s+powerful/gi,
      apply(match) {
        effects.push(derived("spellDamage", Number(match[1])));
      },
    },
    {
      pattern: /new\s+enchantments?\s+are\s+(\d+)%\s+stronger/gi,
      apply(match) {
        effects.push(derived("spellDamage", Number(match[1])));
      },
    },
    {
      pattern: /\+(\d+)\s+health\b/gi,
      apply(match) {
        const before = text.slice(0, match.index).toLowerCase();
        if (/\bstart with\s*$/i.test(before.trimEnd())) return;
        effects.push(attribute("health", Number(match[1])));
      },
    },
    {
      pattern: /-(\d+)%\s+power\s+attack\s+stamina\s+cost/gi,
      apply(match) {
        effects.push(derived("sprintCostReduction", Number(match[1])));
      },
    },
    {
      pattern: /-(\d+)%\s+armor\s+weight\s+penalty/gi,
      apply(match) {
        effects.push(derived("sprintCostReduction", Number(match[1])));
      },
    },
    {
      pattern: /(\d+)%\s+less\s+shield\s+weight/gi,
      apply(match) {
        effects.push(derived("sprintCostReduction", Number(match[1])));
      },
    },
    {
      pattern: /no\s+sprinting\s+stamina\s+cost\s+penalty/gi,
      apply() {
        effects.push(flag("noSprintCost"));
      },
    },
    {
      pattern: /you\s+are\s+(\d+)%\s+less\s+likely\s+to\s+contract\s+diseases?/gi,
      apply(match) {
        effects.push(derived("diseaseResist", Number(match[1])));
      },
    },
    {
      pattern: /digest\s+raw\s+food|raw\s+food\s+without\s+food\s+poisoning/gi,
      apply() {
        effects.push(flag("rawFood"));
      },
    },
    {
      pattern: /armor\s+rating\s+increases?\s+by\s+(\d+)/gi,
      apply(match) {
        effects.push(derived("armorRating", Number(match[1]), false));
      },
    },
    {
      pattern: /(?:your\s+)?armor\s+rating\s+is\s+increased\s+by\s+(\d+)(?!\d)(?!\s*%)/gi,
      apply(match) {
        if (hasConditionalTail(text, match)) return;
        effects.push(derived("armorRating", Number(match[1]), false));
      },
    },
    {
      pattern: /magic\s+deals\s+(\d+)%\s+less\s+damage\s+to\s+you/gi,
      apply(match) {
        effects.push(derived("magicResist", Number(match[1])));
      },
    },
    {
      pattern: /shouts?\s+can\s+be\s+used\s+(\d+)%\s+more\s+often/gi,
      apply(match) {
        effects.push(derived("shoutCooldownReduction", Number(match[1])));
      },
    },
    {
      pattern: /melee\s+weapons?\s+deal\s+(\d+)%\s+more\s+damage/gi,
      apply(match) {
        effects.push(derived("meleeDamage", Number(match[1])));
      },
    },
    {
      pattern: /(?<!\band\s)(fire|frost|shock)\s+deals?\s+(\d+)%\s+less\s+damage(?:\s+to\s+you)?/gi,
      apply(match) {
        effects.push(derived(`${match[1].toLowerCase()}Resist`, Number(match[2])));
      },
    },
    {
      pattern: /fire,\s*frost,?\s+and\s+shock\s+deal\s+(\d+)%\s+less\s+damage/gi,
      apply(match) {
        const value = Number(match[1]);
        effects.push(derived("fireResist", value));
        effects.push(derived("frostResist", value));
        effects.push(derived("shockResist", value));
      },
    },
    {
      pattern: /movement\s+is\s+(\d+)%\s+faster/gi,
      apply(match) {
        effects.push(derived("moveSpeed", Number(match[1])));
      },
    },
    {
      pattern: /sneaking\s+is\s+(\d+)%\s+faster/gi,
      apply(match) {
        effects.push(derived("sneakSpeed", Number(match[1])));
      },
    },
    {
      pattern: /fall\s+damage\s+is\s+reduced\s+by\s+(\d+)%/gi,
      apply(match) {
        effects.push(derived("fallDamageReduction", Number(match[1])));
      },
    },
    {
      pattern: /\bnight\s+eye\b/gi,
      apply() {
        effects.push(flag("nightEye"));
      },
    },
    {
      pattern: /speech\s+skill\s+is\s+(\d+)\s+higher/gi,
      apply(match) {
        effects.push(derived("speech", Number(match[1]), false));
      },
    },
    {
      pattern: /prices?\s+are\s+(\d+)%\s+more\s+favorable/gi,
      apply(match) {
        effects.push(derived("priceModifier", Number(match[1])));
      },
    },
    {
      pattern: /(?:destruction\s+and\s+conjuration\s+)?spells?\s+are\s+(\d+)%\s+more\s+powerful/gi,
      apply(match) {
        effects.push(derived("spellDamage", Number(match[1])));
      },
    },
    {
      pattern:
        /(?:increases?\s+)?chance\s+to\s+absorb\s+(?:the\s+)?magicka\s+from\s+hostile\s+spells?\s+by\s+(\d+)%/gi,
      apply(match) {
        effects.push(derived("magicAbsorb", Number(match[1])));
      },
    },
    {
      pattern: /potions?\s+are\s+(\d+)%\s+more\s+effective/gi,
      apply(match) {
        effects.push(derived("potionEffectiveness", Number(match[1])));
      },
    },
    {
      pattern: /you\s+can\s+breathe\s+underwater/gi,
      apply() {
        effects.push(flag("waterbreathing"));
      },
    },
    {
      pattern: /(?:can\s+)?breath\s+underwater/gi,
      apply() {
        effects.push(flag("waterbreathing"));
      },
    },
    {
      pattern: /you\s+swim\s+(\d+)%\s+faster/gi,
      apply(match) {
        effects.push(derived("swimmingSpeed", Number(match[1])));
      },
    },
    {
      pattern: /swimming\s+is\s+(\d+)%\s+faster/gi,
      apply(match) {
        effects.push(derived("swimmingSpeed", Number(match[1])));
      },
    },
    {
      pattern: /unarmed\s+damage\s+is\s+increased\s+by\s+(\d+)/gi,
      apply(match) {
        effects.push(derived("unarmedDamage", Number(match[1]), false));
      },
    },
    {
      pattern: /sprinting\s+costs?\s+(\d+)\s+less\s+stamina/gi,
      apply(match) {
        effects.push(derived("sprintCostReduction", Number(match[1]), false));
      },
    },
    {
      pattern: /(\d+(?:\.\d+)?)x\s+(?:spell\s+)?cost(?:\s+for\s+all\s+schools(?:\s+of\s+magic)?)?/gi,
      apply(match) {
        if (hasConditionalTail(text, match)) return;
        effects.push(derived("spellCost", multiplierToPercent(match[1])));
      },
    },
    {
      pattern: /(\d+(?:\.\d+)?)x\s+magnitude/gi,
      apply(match) {
        if (hasConditionalTail(text, match)) return;
        effects.push(derived("spellDamage", multiplierToPercent(match[1])));
      },
    },
    {
      pattern: /(\d+(?:\.\d+)?)x\s+(?:\w+\s+)?(?:spell\s+)?duration/gi,
      apply(match) {
        if (hasConditionalTail(text, match)) return;
        effects.push(derived("spellDuration", multiplierToPercent(match[1])));
      },
    },
    {
      pattern:
        /(\d+)%\s+more\s+(?:power\s+attack\s+)?(?:(?:shield|bow)\s+bash|bash)\s+damage/gi,
      apply(match) {
        const value = Number(match[1]);
        const bashType = match[0].toLowerCase();
        if (bashType.includes("bow bash")) {
          effects.push(derived("bowDamage", value));
          return;
        }
        effects.push(derived("meleeDamage", value));
      },
    },
    {
      pattern:
        /(\d+)%\s+less\s+(?:(?:shield|bow)\s+bash|power\s+attack\s+)?\s*stamina\s+cost/gi,
      apply(match) {
        effects.push(derived("sprintCostReduction", Number(match[1])));
      },
    },
    {
      pattern: /two-?handed\s+weapons?\s+deal\s+(\d+)%\s+more\s+damage/gi,
      apply(match) {
        effects.push(derived("twoHandDamage", Number(match[1])));
      },
    },
    {
      pattern: /one-?handed\s+weapons?\s+deal\s+(\d+)%\s+more\s+damage/gi,
      apply(match) {
        effects.push(derived("oneHandDamage", Number(match[1])));
      },
    },
    {
      pattern: /bows?,?\s+crossbows?\s+and\s+throwing\s+knives\s+do\s+(\d+)%\s+more\s+damage/gi,
      apply(match) {
        const value = Number(match[1]);
        effects.push(derived("bowDamage", value));
        effects.push(derived("crossbowDamage", value));
      },
    },
    {
      pattern: /take\s+(\d+)%\s+less\s+physical\s+damage/gi,
      apply(match) {
        if (hasConditionalTail(text, match)) return;
        effects.push(derived("damageTaken", -Number(match[1])));
      },
    },
    {
      pattern: /take\s+(\d+)%\s+more\s+physical\s+damage/gi,
      apply(match) {
        if (hasConditionalTail(text, match)) return;
        effects.push(derived("damageTaken", Number(match[1])));
      },
    },
    {
      pattern: /ignore\s+(\d+)%\s+of\s+(?:the\s+)?armor\s+rating/gi,
      apply(match) {
        const value = Number(match[1]);
        effects.push(derived("armorPenetrationMelee", value, false));
        effects.push(derived("armorPenetrationRanged", value, false));
      },
    },
    {
      pattern: /reduces?\s+incoming\s+damage\s+by\s+(\d+)%/gi,
      apply(match) {
        if (hasConditionalTail(text, match)) return;
        effects.push(derived("damageTaken", -Number(match[1])));
      },
    },
    {
      pattern: /\+(\d+)\s+health\s+and\s+\+([\d.]+)\/s\s+health\s+regeneration/gi,
      apply(match) {
        if (hasConditionalTail(text, match)) return;
        effects.push(attribute("health", Number(match[1])));
        effects.push(derived("healthRegenRate", Number(match[2]), false));
      },
    },
    {
      pattern: /(?:you\s+)?have\s+(?:a\s+)?(\d+)%\s+chance\s+to\s+absorb\s+the\s+magicka\s+from\s+incoming\s+spells/gi,
      apply(match) {
        effects.push(derived("magicAbsorb", Number(match[1])));
      },
    },
    {
      pattern: /(\d+)%\s+more\s+bash\s+damage/gi,
      apply(match) {
        effects.push(derived("meleeDamage", Number(match[1])));
      },
    },
    {
      pattern: /(\d+)%\s+more\s+block\b/gi,
      apply(match) {
        effects.push(derived("damageTaken", -Number(match[1])));
      },
    },
    {
      pattern: /(\d+)%\s+chance\s+to\s+disarm/gi,
      apply(match) {
        if (hasConditionalTail(text, match)) return;
        effects.push(derived("criticalHitChance", Number(match[1])));
      },
    },
    {
      pattern: /(\d+)%\s+increased\s+armor\s+penetration/gi,
      apply(match) {
        const value = Number(match[1]);
        effects.push(derived("armorPenetrationMelee", value));
        effects.push(derived("armorPenetrationRanged", value));
      },
    },
  ];

  for (const rule of rules) {
    for (const match of text.matchAll(rule.pattern)) {
      if (isAllyOnlyMatch(text, match)) continue;
      rule.apply(match);
    }
  }

  return effects;
}

/**
 * @param {Effect[]} effects
 * @returns {Effect[]}
 */
function dedupeEffects(effects) {
  /** @type {Map<string, Effect>} */
  const byKey = new Map();

  for (const effect of effects) {
    const key =
      effect.type === "skillPointsPerLevel"
        ? "skillPointsPerLevel"
        : `${effect.type}:${effect.stat ?? ""}`;
    const prior = byKey.get(key);
    if (!prior) {
      byKey.set(key, { ...effect });
      continue;
    }
    if (effect.type === "flag") continue;
    if (typeof prior.value === "number" && typeof effect.value === "number") {
      prior.value += effect.value;
    }
  }

  return [...byKey.values()];
}

/**
 * @param {string} bonusText
 * @returns {Effect[]}
 */
export function parseBonusEffects(bonusText) {
  const fullText = String(bonusText ?? "").trim();
  const sources = extractParseSources(fullText);
  if (sources.length === 0) return [];

  const segments = sources.flatMap((source) => segmentBonusText(source));
  if (segments.length === 0) return [];

  const effects = segments.flatMap((segment) => parseSegment(segment.text, fullText));
  return dedupeEffects(effects);
}

/**
 * @param {string} text
 * @returns {string}
 */
function capitalizeSentence(text) {
  const trimmed = String(text ?? "").trim();
  if (!trimmed) return trimmed;
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
}

/**
 * @param {string} text
 * @returns {string}
 */
function ensurePeriod(text) {
  const trimmed = String(text ?? "").trim();
  if (!trimmed) return trimmed;
  return trimmed.endsWith(".") ? trimmed : `${trimmed}.`;
}

const LEADING_FILLER =
  /^(?:however|but|also|additionally|otherwise|and|yet|still)\s*[,:]?\s*/i;

/**
 * @param {string} clause
 * @returns {string[]}
 */
export function trimBonusClauses(clause) {
  const normalized = String(clause ?? "").trim();
  if (!normalized) return [];

  const parts = normalized.split(/\s*,\s*(?:however|but)\s+/i);

  return parts
    .map((part) => {
      const withoutPeriod = part.trim().replace(LEADING_FILLER, "").trim().replace(/\.$/, "");
      return ensurePeriod(capitalizeSentence(withoutPeriod));
    })
    .filter(Boolean);
}

/**
 * @param {string} text
 * @returns {string[]}
 */
function splitBonusClauses(text) {
  return String(text ?? "")
    .split(/\.\s+/)
    .map((clause) => clause.trim())
    .filter(Boolean)
    .map((clause) => (clause.endsWith(".") ? clause : `${clause}.`));
}

/** Flip-side sentence that restates the prior clause's conditional (not a separate bonus). */
const OPPOSITE_FLIP_CLAUSE =
  /^(?:however,?\s*)?(?:(?:they|it)\s+)?(?:suffer\s+the\s+opposite\s+effect|have\s+the\s+opposite\s+effect|.+?\s+will\s+have\s+the\s+opposite\s+effect)\b/i;

/**
 * @param {string[]} clauses
 * @returns {string[]}
 */
function mergeOppositeFlipClauses(clauses) {
  /** @type {string[]} */
  const merged = [];

  for (const clause of clauses) {
    const stripped = clause.trim().replace(/\.$/, "");
    if (OPPOSITE_FLIP_CLAUSE.test(stripped) && merged.length > 0) {
      const flip =
        trimBonusClauses(clause)[0] ?? ensurePeriod(stripped.replace(LEADING_FILLER, ""));
      const prior = merged.pop().replace(/\.$/, "");
      merged.push(
        ensurePeriod(`${prior}. ${flip.replace(/\.$/, "")}`),
      );
      continue;
    }
    merged.push(clause);
  }

  return merged;
}

/**
 * Clauses with conditional triggers, plus mechanical text the rule parser did not cover.
 *
 * @param {string} bonusText
 * @param {Effect[]} [effects]
 * @returns {string[]}
 */
export function extractConditionalBonusDetails(bonusText, effects = []) {
  const text = String(bonusText ?? "").trim();
  if (!text) return [];

  const parsedEffects = effects.length > 0 ? effects : parseBonusEffects(text);
  const clauses = splitBonusClauses(text);
  const conditional = [];

  for (const clause of clauses) {
    const subClauses = splitCommaClauses(clause);
    const parts = subClauses.length > 0 ? subClauses : [clause.replace(/\.$/, "")];

    for (const part of parts) {
      if (isConditionalClause(part)) {
        conditional.push(ensurePeriod(part));
        continue;
      }
      if (parseSegment(part, text).length === 0 && isMechanicalClause(part)) {
        conditional.push(ensurePeriod(part));
      }
    }
  }

  if (conditional.length === 0 && parsedEffects.length === 0) {
    return clauses.flatMap((clause) => trimBonusClauses(clause));
  }

  return mergeOppositeFlipClauses(conditional).flatMap((clause) =>
    trimBonusClauses(clause),
  );
}

/**
 * Prefer hand-tuned effects when present; otherwise parse bonus text.
 *
 * @param {string} bonusText
 * @param {Effect[]} priorEffects
 * @returns {Effect[]}
 */
export function mergeEffects(...groups) {
  return dedupeEffects(groups.flat());
}

export function resolveBonusEffects(bonusText, priorEffects = []) {
  if (priorEffects.length > 0) return priorEffects;
  return parseBonusEffects(bonusText);
}
