import type { Perk, PerkTree } from "@/data/schemas";
import { getPerkPositionKey } from "@/lib/perkTreeGrid";

export function getPerkSearchTokens(query: string): string[] {
  return query
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean);
}

function buildPerkSearchHaystack(perk: Perk): string {
  const effectsText = perk.effects.map((effect) => JSON.stringify(effect)).join(" ");
  return [
    perk.id,
    perk.name,
    perk.description,
    String(perk.skillReq),
    perk.playerLevelReq != null ? String(perk.playerLevelReq) : "",
    String(perk.costsPerkPoint),
    perk.prerequisites.join(" "),
    (perk.prerequisitesAny ?? []).join(" "),
    effectsText,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

export function doesPerkMatchTokens(perk: Perk, tokens: string[]): boolean {
  if (tokens.length === 0) return false;
  const haystack = buildPerkSearchHaystack(perk);
  return tokens.every((token) => haystack.includes(token));
}

/**
 * Returns the set of grid positions (x/y pairs) where *any* perk at that position matches.
 *
 * This is intentionally position-based so that when the UI renders a single visible rank per stack,
 * the search highlight still appears if any hidden rank matches the query.
 */
export function getPerkSearchPositionKeysForTree(
  tree: PerkTree,
  tokens: string[],
): Set<string> {
  if (tokens.length === 0) return new Set<string>();

  const result = new Set<string>();
  for (const perk of tree.perks) {
    if (!doesPerkMatchTokens(perk, tokens)) continue;
    result.add(getPerkPositionKey(perk.position));
  }
  return result;
}

export function getPerkSearchPositionKeysForTrees(
  trees: PerkTree[],
  tokens: string[],
): Map<string, Set<string>> {
  const result = new Map<string, Set<string>>();
  for (const tree of trees) {
    result.set(tree.skillId, getPerkSearchPositionKeysForTree(tree, tokens));
  }
  return result;
}

