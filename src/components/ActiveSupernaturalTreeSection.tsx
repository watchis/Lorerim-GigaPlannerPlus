import { SupernaturalTreeSection } from "@/components/SupernaturalTreeSection";
import {
  getActiveSupernaturalSkillId,
  isVampireActive,
  isWerewolfActive,
  VAMPIRE_SKILL_ID,
} from "@/lib/supernatural";
import { usePanelLabels } from "@/theme/ThemeProvider";
import { useBuildStore } from "@/store/buildStore";

export function ActiveSupernaturalTreeSection() {
  const labels = usePanelLabels("character-setup");
  const build = useBuildStore((s) => s.build);
  const skillId = getActiveSupernaturalSkillId(build);

  if (!skillId) return null;

  const label =
    skillId === VAMPIRE_SKILL_ID
      ? (labels.vampireTree ?? "Vampire")
      : (labels.werewolfTree ?? "Werewolf");

  return (
    <SupernaturalTreeSection
      skillId={skillId}
      label={label}
      isActive={isVampireActive(build) || isWerewolfActive(build)}
    />
  );
}
