import type { ReactNode } from "react";
import type {
  CharacterOption,
  CharacterOptionChoice,
  Effect,
  GameData,
  Perk,
  PerkAllocation,
} from "@/data/schemas";
import type { BuildState } from "@/engine/buildEngine";

export interface SkillLevelGrant {
  skillId: string;
  bonus: number;
  bypassPlayerLevelCap?: boolean;
  bypassSkillIncreaseLimit?: boolean;
  raiseFloor?: boolean;
  /** Highest N skill levels are free of skill-point cost (Oghma Infinium). */
  freeTopLevels?: number;
}

export interface ModificationSource {
  name?: string;
  labelKey?: string;
}

export interface BuildModification {
  source: ModificationSource;
  effects?: Effect[];
  skillLevelGrants?: SkillLevelGrant[];
  conditionalNotes?: string[];
  plannerNotes?: string[];
}

export interface CharacterOptionSummaryLine {
  key: string;
  text: string;
}

export interface CharacterOptionControlProps {
  option: CharacterOption;
  selectedChoiceId: string;
  labels: Record<string, string>;
  onSelect: (choiceId: string) => void;
  onOpenOghmaSkillsPicker?: () => void;
}

export interface CharacterOptionContext {
  readonly game: GameData;
  readonly state: Readonly<BuildState>;
  readonly option: CharacterOption;
  readonly choice: CharacterOptionChoice;
  readonly labels: Record<string, string>;
}

export interface CharacterOptionExtension {
  readonly id: string;
  getModifications(ctx: CharacterOptionContext): BuildModification[];
  getSummaryLines?(ctx: CharacterOptionContext): CharacterOptionSummaryLine[];
  Control?(props: CharacterOptionControlProps): ReactNode;
}

export interface PerkExtensionContext {
  readonly game: GameData;
  readonly state: Readonly<BuildState>;
  readonly perk: Perk;
  readonly skillId: string;
  readonly skillLevel: number;
  readonly isSelected: boolean;
}

export interface PerkDetailExtrasProps {
  perk: Perk;
  plannerNotes: string[];
}

export interface PerkExtension {
  readonly id: string;
  /** Repeatable allocation when JSON metadata is absent (e.g. after import). */
  readonly allocation?: PerkAllocation;
  getModifications(ctx: PerkExtensionContext): BuildModification[];
  DetailExtras?(props: PerkDetailExtrasProps): ReactNode;
}

export interface SourcedSkillLevelGrant extends SkillLevelGrant {
  source: ModificationSource;
}
