import { LichPhylacterySection } from "@/components/LichPhylacterySection";
import { SupernaturalTreeSection } from "@/components/SupernaturalTreeSection";
import {
  getActiveSupernaturalSkillId,
  hasSupernaturalCurse,
  isLichActive,
  VAMPIRE_SKILL_ID,
  WEREWOLF_SKILL_ID,
} from "@/lib/supernatural";
import { usePanelLabels } from "@/theme/ThemeProvider";
import { useBuildStore } from "@/store/buildStore";

export function ActiveSupernaturalTreeSection() {
  const labels = usePanelLabels("character-setup");
  const build = useBuildStore((s) => s.build);

  if (isLichActive(build)) {
    return <LichPhylacterySection />;
  }

  const skillId = getActiveSupernaturalSkillId(build);
  if (!skillId) return null;

  const label =
    skillId === VAMPIRE_SKILL_ID
      ? (labels.vampireTree ?? "Vampire")
      : skillId === WEREWOLF_SKILL_ID
        ? (labels.werewolfTree ?? "Werewolf")
        : skillId;

  return (
    <SupernaturalTreeSection
      skillId={skillId}
      label={label}
      isActive={hasSupernaturalCurse(build)}
    />
  );
}
