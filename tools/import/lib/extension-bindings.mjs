import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { canonicalPerkName } from "./perk-import-filter.mjs";
import { loadJsonIfExists } from "./transform-utils.mjs";

const DEFAULT_BINDINGS_PATH = "data/game/extension-bindings.json";

/**
 * @typedef {object} PerkExtensionBinding
 * @property {string} skillId
 * @property {string} name Perk display name (matched canonically)
 * @property {string} extension Extension module id (basename under extensions/perks/)
 * @property {{ kind: "perkPointsBudget", totalLabel?: "X" | "infinity" }} [allocation]
 */

/**
 * @typedef {object} CharacterOptionExtensionBinding
 * @property {string} optionId
 * @property {string} extension Extension module id (basename under extensions/character-options/)
 */

/**
 * @typedef {object} ExtensionBindings
 * @property {PerkExtensionBinding[]} perks
 * @property {CharacterOptionExtensionBinding[]} characterOptions
 */

/** @returns {ExtensionBindings} */
export function loadExtensionBindings(bindingsPath = DEFAULT_BINDINGS_PATH) {
  const data = loadJsonIfExists(bindingsPath);
  if (!data) {
    return { perks: [], characterOptions: [] };
  }

  return {
    perks: Array.isArray(data.perks) ? data.perks : [],
    characterOptions: Array.isArray(data.characterOptions) ? data.characterOptions : [],
  };
}

function perkBindingKey(skillId, perkName) {
  return `${skillId}:${canonicalPerkName(perkName)}`;
}

/** @returns {Map<string, PerkExtensionBinding>} binding key → binding entry */
export function buildPerkExtensionBindingLookup(bindings) {
  const lookup = new Map();

  for (const entry of bindings.perks ?? []) {
    if (!entry?.skillId || !entry?.name || !entry?.extension) continue;
    lookup.set(perkBindingKey(entry.skillId, entry.name), entry);
  }

  return lookup;
}

/** @returns {Map<string, string>} binding key → extension id */
export function buildPerkExtensionLookup(bindings) {
  const lookup = new Map();

  for (const [key, entry] of buildPerkExtensionBindingLookup(bindings)) {
    lookup.set(key, entry.extension);
  }

  return lookup;
}

/** @returns {Map<string, string>} option id → extension id */
export function buildCharacterOptionExtensionLookup(bindings) {
  const lookup = new Map();

  for (const entry of bindings.characterOptions ?? []) {
    if (!entry?.optionId || !entry?.extension) continue;
    lookup.set(entry.optionId, entry.extension);
  }

  return lookup;
}

export function resolvePerkExtension(bindings, skillId, perkName) {
  const lookup = buildPerkExtensionLookup(bindings);
  return lookup.get(perkBindingKey(skillId, perkName));
}

/**
 * Wire perk JSON nodes to build-time extension plugins.
 * Extension-owned perks keep `effects: []` so import/regen parsers do not overwrite plugin logic.
 */
export function applyPerkExtensionBindings(trees, bindings) {
  const lookup = buildPerkExtensionBindingLookup(bindings);
  if (lookup.size === 0) return { applied: 0 };

  let applied = 0;

  for (const tree of Object.values(trees)) {
    if (!tree?.skillId || !tree.perks?.length) continue;

    for (const perk of tree.perks) {
      const binding = lookup.get(perkBindingKey(tree.skillId, perk.name));
      if (!binding) continue;

      perk.extension = binding.extension;
      perk.effects = [];
      if (binding.allocation) {
        perk.allocation = { ...binding.allocation };
      }
      applied += 1;
    }
  }

  return { applied };
}

/**
 * Returns warnings when bindings reference missing game data or JSON drifts from the registry.
 * Does not mutate files — character-options.json is never overwritten by import.
 */
export function validateExtensionBindings({
  bindings,
  trees,
  characterOptionsPath = "data/game/character-options.json",
  extensionsDir = "extensions",
}) {
  const warnings = [];
  const lookup = buildPerkExtensionLookup(bindings);
  const optionLookup = buildCharacterOptionExtensionLookup(bindings);

  const perksByKey = new Map();
  for (const tree of Object.values(trees ?? {})) {
    if (!tree?.skillId) continue;
    for (const perk of tree.perks ?? []) {
      perksByKey.set(perkBindingKey(tree.skillId, perk.name), perk);
    }
  }

  for (const [key, extension] of lookup) {
    const perk = perksByKey.get(key);
    if (!perk) {
      warnings.push(`extension-bindings perk "${key}" → "${extension}" has no matching imported perk`);
      continue;
    }
    if (perk.extension !== extension) {
      warnings.push(
        `perk "${perk.name}" (${perk.id}) has extension "${perk.extension ?? ""}" but bindings expect "${extension}"`,
      );
    }
  }

  const characterOptions = loadJsonIfExists(characterOptionsPath);
  const optionsById = new Map(
    (characterOptions?.options ?? []).map((option) => [option.id, option]),
  );

  for (const [optionId, extension] of optionLookup) {
    const option = optionsById.get(optionId);
    if (!option) {
      warnings.push(
        `extension-bindings character option "${optionId}" → "${extension}" is missing from character-options.json`,
      );
      continue;
    }
    if (option.extension !== extension) {
      warnings.push(
        `character option "${optionId}" has extension "${option.extension ?? ""}" but bindings expect "${extension}"`,
      );
    }
  }

  for (const kind of ["character-options", "perks"]) {
    const folder = join(extensionsDir, kind);
    if (!existsSync(folder)) continue;

    const referenced = new Set(
      kind === "perks"
        ? [...lookup.values()]
        : [...optionLookup.values()],
    );

    for (const extensionId of referenced) {
      const modulePath = join(folder, `${extensionId}.ts`);
      if (!existsSync(modulePath)) {
        warnings.push(`extension module missing: ${modulePath}`);
      }
    }
  }

  return warnings;
}
