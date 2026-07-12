import { SupernaturalTreeSection } from "@/components/SupernaturalTreeSection";
import {
  getActiveSupernaturalSkillId,
  hasSupernaturalCurse,
  LICH_SKILL_ID,
  VAMPIRE_SKILL_ID,
  WEREWOLF_SKILL_ID,
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
      : skillId === WEREWOLF_SKILL_ID
        ? (labels.werewolfTree ?? "Werewolf")
        : skillId === LICH_SKILL_ID
          ? (labels.lichTree ?? "Lich")
          : skillId;

  return (
    <SupernaturalTreeSection
      skillId={skillId}
      label={label}
      isActive={hasSupernaturalCurse(build)}
    />
  );
}
