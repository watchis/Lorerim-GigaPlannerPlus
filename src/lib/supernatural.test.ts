import { describe, expect, it } from "vitest";
import { collectBuildChanges } from "@/lib/buildModifications";
import { getCharacterOptionSummaryLines } from "@/lib/characterOptions";
import {
  applySupernaturalOptionChange,
  getVampireRacialBonus,
  hasSupernaturalCurse,
  isSupernaturalOptionBlocked,
  isTraitBlockedBySupernatural,
  isVampireActive,
  isWerewolfActive,
  migrateLegacySupernaturalBuild,
  normalizeSupernaturalState,
  stripPerksForSkillTree,
  SUPERNATURAL_CLAIMED_CHOICE,
  VAMPIRE_OPTION_ID,
  VAMPIRE_SKILL_ID,
  WEREWOLF_OPTION_ID,
  WEREWOLF_SKILL_ID,
} from "@/lib/supernatural";
import { canSelectTrait, reconcileBuild } from "@/engine/buildEngine";
import { createTestBuildState, getTestGameData } from "@/test/helpers";

describe("supernatural", () => {
  const game = getTestGameData();

  it("activates vampire via character option and applies curse effects", () => {
    const state = applySupernaturalOptionChange(
      game,
      createTestBuildState(),
      VAMPIRE_OPTION_ID,
      SUPERNATURAL_CLAIMED_CHOICE,
    );

    expect(isVampireActive(state)).toBe(true);
    expect(isWerewolfActive(state)).toBe(false);

    const collected = collectBuildChanges(game, state);
    const healthEffects = collected.sourcedEffects.filter(
      (entry) => entry.effect.type === "attribute" && entry.effect.stat === "health",
    );
    expect(healthEffects).toHaveLength(1);
    expect(healthEffects[0]?.effect.value).toBe(100);
    expect(collected.sourcedEffects.some((entry) => entry.labelKey === "vampireOption")).toBe(true);
  });

  it("includes the racial vampire ability for the selected race", () => {
    const state = applySupernaturalOptionChange(
      game,
      createTestBuildState({ raceId: "nord" }),
      VAMPIRE_OPTION_ID,
      SUPERNATURAL_CLAIMED_CHOICE,
    );

    const racialBonus = getVampireRacialBonus(game, state);
    expect(racialBonus?.name).toBe("Preserved Blood");

    const vampireOption = game.characterOptions.find((entry) => entry.id === VAMPIRE_OPTION_ID)!;
    const choice = vampireOption.choices.find((entry) => entry.id === SUPERNATURAL_CLAIMED_CHOICE)!;
    const summaryLines = getCharacterOptionSummaryLines(
      game,
      vampireOption,
      choice,
      {},
      {},
      state,
    );

    expect(summaryLines).toEqual([{ key: "vampire-racial", text: "Preserved Blood" }]);
  });

  it("selecting werewolf clears vampire perks and blocks the vampire option", () => {
    const withVampirePerk = createTestBuildState({
      characterOptionChoices: { [VAMPIRE_OPTION_ID]: SUPERNATURAL_CLAIMED_CHOICE },
      selectedPerkIds: ["vampire-stage-2", "werewolf-lycanthropic-speed"],
      traitIds: ["silent-dovah", "angler"],
    });

    const state = applySupernaturalOptionChange(
      game,
      withVampirePerk,
      WEREWOLF_OPTION_ID,
      SUPERNATURAL_CLAIMED_CHOICE,
    );

    expect(isWerewolfActive(state)).toBe(true);
    expect(isVampireActive(state)).toBe(false);
    expect(state.selectedPerkIds).toEqual(["werewolf-lycanthropic-speed"]);
    expect(state.traitIds).toEqual(["angler"]);
    expect(isSupernaturalOptionBlocked(game, state, VAMPIRE_OPTION_ID)).toBe(true);
    expect(isTraitBlockedBySupernatural(game, state, "silent-dovah")).toBe(true);
    expect(canSelectTrait(game, state, "silent-dovah")).toBe(false);
  });

  it("disabling a curse strips that tree's perks", () => {
    const state = applySupernaturalOptionChange(
      game,
      createTestBuildState({
        characterOptionChoices: { [WEREWOLF_OPTION_ID]: SUPERNATURAL_CLAIMED_CHOICE },
        selectedPerkIds: ["werewolf-lycanthropic-speed", "destiny-01"],
      }),
      WEREWOLF_OPTION_ID,
      "none",
    );

    expect(isWerewolfActive(state)).toBe(false);
    expect(state.selectedPerkIds).toEqual(["destiny-01"]);
  });

  it("stripPerksForSkillTree removes only the requested tree", () => {
    const stripped = stripPerksForSkillTree(
      game,
      createTestBuildState({
        selectedPerkIds: ["vampire-stage-1", "werewolf-lycanthropic-speed", "destiny-01"],
      }),
      VAMPIRE_SKILL_ID,
    );

    expect(stripped.selectedPerkIds).toEqual([
      "werewolf-lycanthropic-speed",
      "destiny-01",
    ]);
  });

  it("migrates legacy vampirismId/lycanthropyId into character options", () => {
    const migrated = migrateLegacySupernaturalBuild(
      createTestBuildState({
        vampirismId: "stage-2",
        lycanthropyId: "none",
      } as never),
    );

    expect(migrated.characterOptionChoices[VAMPIRE_OPTION_ID]).toBe(SUPERNATURAL_CLAIMED_CHOICE);
    expect("vampirismId" in migrated).toBe(false);
  });

  it("reconcileBuild normalizes conflicting supernatural options", () => {
    const state = reconcileBuild(
      game,
      createTestBuildState({
        characterOptionChoices: {
          [VAMPIRE_OPTION_ID]: SUPERNATURAL_CLAIMED_CHOICE,
          [WEREWOLF_OPTION_ID]: SUPERNATURAL_CLAIMED_CHOICE,
        },
        traitIds: ["silent-dovah"],
      }),
    );

    expect(isVampireActive(state)).toBe(true);
    expect(isWerewolfActive(state)).toBe(false);
    expect(hasSupernaturalCurse(state)).toBe(true);
    expect(state.traitIds).not.toContain("silent-dovah");
  });

  it("normalizeSupernaturalState removes incompatible traits only", () => {
    const state = normalizeSupernaturalState(
      game,
      createTestBuildState({
        characterOptionChoices: { [VAMPIRE_OPTION_ID]: SUPERNATURAL_CLAIMED_CHOICE },
        traitIds: ["silent-dovah", "angler"],
      }),
    );

    expect(state.traitIds).toEqual(["angler"]);
  });
});
