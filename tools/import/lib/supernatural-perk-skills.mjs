/** Supernatural curse perk trees (Growl / Sacrilege AVIF menus), not skill-point trees. */
export const SUPERNATURAL_PERK_SKILL_IDS = ["vampire", "werewolf"];

export const SUPERNATURAL_PERK_SKILL_NAMES = {
  vampire: "Vampire",
  werewolf: "Werewolf",
  lich: "Lich",
};

/**
 * Skills that remain in the catalog with an empty perk-tree placeholder when the
 * install has no AVIF custom-skill tree for them. Lich defaults here (Classical
 * phylactery); Magicka Weave installs flip lich to a real AVIF perk skill.
 */
export const SUPERNATURAL_PLACEHOLDER_SKILL_IDS = ["lich"];

export const SUPERNATURAL_PLACEHOLDER_SKILL_NAMES = {
  lich: "Lich",
};

/** AVIF FULL names used by Dawnguard / Growl / Sacrilege / Prelude (EDID is often a reused unused AV). */
export const SUPERNATURAL_AVIF_FULL_NAME_TO_SKILL = new Map([
  ["werewolf", "werewolf"],
  ["werebeast", "werewolf"],
  ["vampire lord", "vampire"],
  ["vampire", "vampire"],
  ["magicka weave", "lich"],
  ["lich", "lich"],
]);

export function lichHasAvifPerkTree(membership) {
  return Boolean(membership?.hasAvifForSkill?.("lich"));
}

/** Vampire / werewolf always; lich only when Prelude Magicka Weave (or similar) AVIF is present. */
export function getSupernaturalPerkSkillIds(membership = null) {
  if (lichHasAvifPerkTree(membership)) {
    return [...SUPERNATURAL_PERK_SKILL_IDS, "lich"];
  }
  return [...SUPERNATURAL_PERK_SKILL_IDS];
}

export function getSupernaturalPlaceholderSkillIds(membership = null) {
  if (lichHasAvifPerkTree(membership)) return [];
  return [...SUPERNATURAL_PLACEHOLDER_SKILL_IDS];
}

export function isSupernaturalPerkSkill(skillId) {
  return (
    SUPERNATURAL_PERK_SKILL_IDS.includes(skillId) ||
    skillId === "lich"
  );
}
