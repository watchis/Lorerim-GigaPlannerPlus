import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const TRAIT_TRANSLATIONS_RELATIVE = join(
  "mods",
  "Biggie Traits",
  "Interface",
  "Translations",
  "Biggie Traits_english.txt",
);

const HOMEOWNER_TRAIT_DESC_KEYS = new Map([
  ["homeowner-breezehome", "$BIGTRAIT_HOME1_DESC"],
  ["homeowner-honeyside", "$BIGTRAIT_HOME2_DESC"],
  ["homeowner-vlindrel-hall", "$BIGTRAIT_HOME3_DESC"],
  ["homeowner-proudspire-manor", "$BIGTRAIT_HOME4_DESC"],
  ["homeowner-hjerim", "$BIGTRAIT_HOME5_DESC"],
]);

export function resolveTraitTranslationsPath(installDir) {
  const path = join(installDir, TRAIT_TRANSLATIONS_RELATIVE);
  return existsSync(path) ? path : null;
}

export function parseTraitTranslations(configText) {
  const entries = new Map();

  for (const line of configText.split(/\r?\n/)) {
    const tabIndex = line.indexOf("\t");
    if (tabIndex === -1) continue;
    const key = line.slice(0, tabIndex).trim();
    const value = line.slice(tabIndex + 1).trim();
    if (key && value) entries.set(key, value);
  }

  return entries;
}

export function loadTraitTranslations(installDir) {
  const path = resolveTraitTranslationsPath(installDir);
  if (!path) return new Map();

  let configText = readFileSync(path, "utf8");
  if (configText.includes("\u0000")) {
    configText = readFileSync(path, "utf16le");
  }

  return parseTraitTranslations(configText);
}

export function getHomeownerTraitDescription(traitId, translations) {
  const key = HOMEOWNER_TRAIT_DESC_KEYS.get(traitId);
  return key ? translations.get(key) ?? "" : "";
}
