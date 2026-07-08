export type {
  BuildModification,
  CharacterOptionContext,
  CharacterOptionControlProps,
  CharacterOptionExtension,
  CharacterOptionSummaryLine,
  ModificationSource,
  PerkDetailExtrasProps,
  PerkExtension,
  PerkExtensionContext,
  SkillLevelGrant,
  SourcedSkillLevelGrant,
} from "./types";

export { scaleDerivedStatBySkillLevel } from "./helpers";

import type { CharacterOptionExtension, PerkExtension } from "./types";

export function defineCharacterOption(ext: CharacterOptionExtension): CharacterOptionExtension {
  return ext;
}

export function definePerk(ext: PerkExtension): PerkExtension {
  return ext;
}
