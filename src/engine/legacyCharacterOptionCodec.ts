/** Frozen v2 index tables for legacy share links only — not used for encode. */
export interface LegacyCharacterOptionCodec {
  options: readonly string[];
  choices: readonly (readonly string[])[];
}

const LEGACY_V2_CHARACTER_OPTION_CODECS: Record<string, LegacyCharacterOptionCodec> = {
  "5.0.3.6": {
    options: ["oghma-infinium", "alduin-bonus-trait"],
    choices: [
      ["none", "health", "magicka", "stamina"],
      ["none", "claimed"],
    ],
  },
  "5.0.4.2": {
    options: ["oghma-infinium", "alduin-bonus-trait", "au-naturel-gear"],
    choices: [
      ["none", "claimed", "warrior", "mage", "thief"],
      ["none", "claimed"],
      ["0", "1", "2", "3", "4"],
    ],
  },
};

export function getLegacyCharacterOptionCodec(
  modpackVersion: string,
): LegacyCharacterOptionCodec | undefined {
  const trimmed = modpackVersion.trim();
  return LEGACY_V2_CHARACTER_OPTION_CODECS[trimmed];
}

export type CharacterOptionCoEntry = [number, number] | [string, string];

export function decodeCharacterOptionChoices(
  entries: CharacterOptionCoEntry[] | undefined,
  modpackVersion: string,
): Record<string, string> {
  const choices: Record<string, string> = {};
  if (!entries?.length) return choices;

  const legacyCodec = getLegacyCharacterOptionCodec(modpackVersion);

  for (const entry of entries) {
    const [optionRef, choiceRef] = entry;

    if (typeof optionRef === "string" && typeof choiceRef === "string") {
      if (optionRef && choiceRef) {
        choices[optionRef] = choiceRef;
      }
      continue;
    }

    if (typeof optionRef !== "number" || typeof choiceRef !== "number" || !legacyCodec) {
      continue;
    }

    const optionId = legacyCodec.options[optionRef];
    const choiceId = legacyCodec.choices[optionRef]?.[choiceRef];
    if (!optionId || !choiceId) continue;

    choices[optionId] = choiceId;
  }

  return choices;
}
