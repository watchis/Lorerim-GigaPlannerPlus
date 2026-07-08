import { readFileSync } from "node:fs";
import { serializeBittercupCharacterOption } from "./bittercup-from-plugins.mjs";

const BITTERCUP_OPTION_ID = "bittercup";

/**
 * Merge the imported bittercup option into existing character-options.json content.
 * Other options (Oghma, Alduin trait, etc.) are preserved unchanged.
 */
export function mergeBittercupCharacterOptions(existing, bittercupOption) {
  const options = Array.isArray(existing?.options) ? [...existing.options] : [];
  const withoutBittercup = options.filter((option) => option.id !== BITTERCUP_OPTION_ID);
  const serialized = serializeBittercupCharacterOption(bittercupOption);

  return {
    options: [...withoutBittercup, serialized],
  };
}

export function loadCharacterOptionsJson(path) {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch {
    return { options: [] };
  }
}
