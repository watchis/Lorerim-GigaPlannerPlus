import { describe, expect, it } from "vitest";
import { collectBuildChanges } from "@/lib/buildModifications";
import { getCharacterOptionSummaryLines } from "@/lib/characterOptions";
import {
  applySupernaturalOptionChange,
  getActiveSupernaturalSkillId,
  getVampireStageRewardLabel,
  isSupernaturalPerkTreeSkillId,
  getVampireRacialBonus,
  getVampireRacialBonusForRace,
  getWerewolfRacialBonusForRace,
  hasSupernaturalCurse,
  isLichActive,
  isTraitBlockedBySupernatural,
  isVampireActive,
  isVampireStageOnlyChange,
  isWerewolfActive,
  LICH_OPTION_ID,
  LICH_SKILL_ID,
  migrateLegacySupernaturalBuild,
  normalizeSupernaturalState,
  stripPerksForSkillTree,
  SUPERNATURAL_CLAIMED_CHOICE,
  VAMPIRE_OPTION_ID,
  VAMPIRE_SKILL_ID,
  WEREWOLF_OPTION_ID,
  WEREWOLF_SKILL_ID,
} from "@/lib/supernatural";
import { canSelectTrait, computeBuild, reconcileBuild } from "@/engine/buildEngine";
import { createTestBuildState, getTestGameData } from "@/test/helpers";

describe("supernatural", () => {
  const game = getTestGameData();

  it("activates vampire via stage choice and applies curse effects", () => {
    const state = applySupernaturalOptionChange(
      game,
      createTestBuildState(),
      VAMPIRE_OPTION_ID,
      "stage-4",
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

  it("applies stage-specific vampire bonuses", () => {
    const stage1 = applySupernaturalOptionChange(
      game,
      createTestBuildState(),
      VAMPIRE_OPTION_ID,
      "stage-1",
    );
    const stage4 = applySupernaturalOptionChange(
      game,
      createTestBuildState(),
      VAMPIRE_OPTION_ID,
      "stage-4",
    );

    const stage1Health = collectBuildChanges(game, stage1).sourcedEffects.find(
      (entry) => entry.effect.type === "attribute" && entry.effect.stat === "health",
    );
    const stage4Health = collectBuildChanges(game, stage4).sourcedEffects.find(
      (entry) => entry.effect.type === "attribute" && entry.effect.stat === "health",
    );

    expect(stage1Health?.effect.value).toBe(50);
    expect(stage4Health?.effect.value).toBe(100);
  });

  it("detects vampire hunger stage-only changes", () => {
    const vampireBuild = applySupernaturalOptionChange(
      game,
      createTestBuildState(),
      VAMPIRE_OPTION_ID,
      "stage-2",
    );

    expect(isVampireStageOnlyChange(vampireBuild, VAMPIRE_OPTION_ID, "stage-3")).toBe(true);
    expect(isVampireStageOnlyChange(vampireBuild, VAMPIRE_OPTION_ID, "none")).toBe(false);
    expect(isVampireStageOnlyChange(vampireBuild, WEREWOLF_OPTION_ID, "claimed")).toBe(false);
    expect(
      isVampireStageOnlyChange(createTestBuildState(), VAMPIRE_OPTION_ID, "stage-1"),
    ).toBe(false);
  });

  it("looks up racial curse abilities by race id for picker preview", () => {
    const nordBonus = getVampireRacialBonusForRace(game, "nord");
    const bretonBonus = getVampireRacialBonusForRace(game, "breton");

    expect(nordBonus?.name).toBe("Preserved Blood");
    expect(bretonBonus?.name).toBe("Dolmen Haunt");
    expect(getVampireRacialBonusForRace(game, "none")).toBeUndefined();
  });

  it("formats vampire stage reward labels for active rewards", () => {
    expect(getVampireStageRewardLabel("stage-1")).toBe("Fed Vampire");
    expect(getVampireStageRewardLabel("stage-2")).toBe("Hungry Vampire");
    expect(getVampireStageRewardLabel("stage-3")).toBe("Starving Vampire");
    expect(getVampireStageRewardLabel("stage-4")).toBe("Blood Starved Vampire");
    expect(getVampireStageRewardLabel("none")).toBeUndefined();
  });

  it("includes the racial vampire ability for the selected race", () => {
    const state = applySupernaturalOptionChange(
      game,
      createTestBuildState({ raceId: "nord" }),
      VAMPIRE_OPTION_ID,
      "stage-2",
    );

    const racialBonus = getVampireRacialBonus(game, state);
    expect(racialBonus?.name).toBe("Preserved Blood");

    const vampireOption = game.characterOptions.find((entry) => entry.id === VAMPIRE_OPTION_ID)!;
    const choice = vampireOption.choices.find((entry) => entry.id === "stage-2")!;
    const summaryLines = getCharacterOptionSummaryLines(
      game,
      vampireOption,
      choice,
      {},
      {},
      state,
    );

    expect(summaryLines).toEqual([
      { key: "vampire-stage", text: "Hungry Vampire" },
      { key: "vampire-racial", text: "Preserved Blood" },
    ]);
  });

  it("applies werewolf disease immunity and strong stomach effects", () => {
    const state = createTestBuildState({
      raceId: "none",
      characterOptionChoices: { [WEREWOLF_OPTION_ID]: SUPERNATURAL_CLAIMED_CHOICE },
    });
    const computed = computeBuild(game, state);
    const diseaseImmunity = computed.appliedBonuses.find((entry) => entry.id === "diseaseImmunity");
    const strongStomach = computed.appliedBonuses.find((entry) => entry.id === "strongStomach");
    const collected = collectBuildChanges(game, state);
    const werewolfDiseaseEffect = collected.sourcedEffects.find(
      (entry) =>
        entry.labelKey === "werewolfOption" &&
        entry.effect.type === "derivedStat" &&
        entry.effect.stat === "diseaseResist",
    );

    expect(werewolfDiseaseEffect?.effect).toMatchObject({
      type: "derivedStat",
      stat: "diseaseResist",
      value: 1000,
    });
    expect(diseaseImmunity).toBeTruthy();
    expect(strongStomach).toBeTruthy();
  });

  it("resolves the active supernatural skill tree id for setup placement", () => {
    expect(
      getActiveSupernaturalSkillId(
        createTestBuildState({
          characterOptionChoices: { [VAMPIRE_OPTION_ID]: "stage-3" },
        }),
      ),
    ).toBe("vampire");
    expect(getActiveSupernaturalSkillId(createTestBuildState())).toBeNull();
  });

  it("identifies supernatural perk tree skill ids", () => {
    expect(isSupernaturalPerkTreeSkillId(VAMPIRE_SKILL_ID)).toBe(true);
    expect(isSupernaturalPerkTreeSkillId(WEREWOLF_SKILL_ID)).toBe(true);
    expect(isSupernaturalPerkTreeSkillId(LICH_SKILL_ID)).toBe(false);
    expect(isSupernaturalPerkTreeSkillId("alchemy")).toBe(false);
  });

  it("activates lich and applies undead curse effects", () => {
    const state = applySupernaturalOptionChange(
      game,
      createTestBuildState(),
      LICH_OPTION_ID,
      "0",
    );

    expect(isLichActive(state)).toBe(true);
    expect(isVampireActive(state)).toBe(false);
    expect(isWerewolfActive(state)).toBe(false);
    expect(getActiveSupernaturalSkillId(state)).toBeNull();
    expect(state.characterOptionChoices[LICH_OPTION_ID]).toBe("0");

    const collected = collectBuildChanges(game, state);
    const magickaEffects = collected.sourcedEffects.filter(
      (entry) => entry.effect.type === "attribute" && entry.effect.stat === "magicka",
    );
    expect(magickaEffects).toHaveLength(0);
    expect(collected.sourcedEffects.some((entry) => entry.labelKey === "lichOption")).toBe(true);
  });

  it("selecting lich while vampire is active switches curses and clears vampire perks", () => {
    const withVampirePerk = createTestBuildState({
      characterOptionChoices: { [VAMPIRE_OPTION_ID]: "stage-2" },
      selectedPerkIds: ["vampire-hemomancer"],
      traitIds: ["silent-dovah", "angler"],
    });

    const state = applySupernaturalOptionChange(
      game,
      withVampirePerk,
      LICH_OPTION_ID,
      "15",
    );

    expect(isLichActive(state)).toBe(true);
    expect(isVampireActive(state)).toBe(false);
    expect(isWerewolfActive(state)).toBe(false);
    expect(state.characterOptionChoices[LICH_OPTION_ID]).toBe("15");
    expect(state.selectedPerkIds).toEqual([]);
    expect(state.traitIds).toEqual(["angler"]);
  });

  it("migrates legacy claimed lich choice to 0 souls", () => {
    const state = normalizeSupernaturalState(
      game,
      createTestBuildState({
        characterOptionChoices: { [LICH_OPTION_ID]: SUPERNATURAL_CLAIMED_CHOICE },
        selectedPerkIds: ["vampire-hemomancer"],
      }),
    );

    expect(state.characterOptionChoices[LICH_OPTION_ID]).toBe("0");
    expect(isLichActive(state)).toBe(true);
  });

  it("applies phylactery per-soul and threshold effects", () => {
    const state = applySupernaturalOptionChange(
      game,
      createTestBuildState(),
      LICH_OPTION_ID,
      "15",
    );

    const collected = collectBuildChanges(game, state);
    const armor = collected.sourcedEffects.find(
      (entry) =>
        entry.effect.type === "derivedStat" &&
        entry.effect.stat === "armorRating" &&
        entry.source === "Phylactery souls",
    );
    const soulMagicka = collected.sourcedEffects.find(
      (entry) =>
        entry.effect.type === "attribute" &&
        entry.effect.stat === "magicka" &&
        entry.source === "Phylactery souls",
    );
    const absorb = collected.sourcedEffects.find(
      (entry) =>
        entry.effect.type === "derivedStat" &&
        entry.effect.stat === "magicAbsorb" &&
        entry.source === "Phylactery souls",
    );
    const fireResist = collected.sourcedEffects.find(
      (entry) =>
        entry.effect.type === "derivedStat" &&
        entry.effect.stat === "fireResist" &&
        entry.source === "Phylactery thresholds",
    );

    expect(armor?.effect).toMatchObject({ type: "derivedStat", value: 30 });
    expect(soulMagicka?.effect).toMatchObject({ type: "attribute", value: 60 });
    expect(absorb?.effect).toMatchObject({ type: "derivedStat", value: 7.5, isPercent: true });
    expect(fireResist?.effect).toMatchObject({ type: "derivedStat", value: 50, isPercent: true });

    const floodBase = collected.sourcedEffects.find(
      (entry) =>
        entry.effect.type === "attribute" &&
        entry.effect.stat === "magicka" &&
        entry.source === "Phylactery thresholds",
    );
    expect(floodBase?.effect).toMatchObject({ type: "attribute", value: 50 });
  });

  it("selecting werewolf while vampire is active switches curses and clears vampire perks", () => {
    const withVampirePerk = createTestBuildState({
      characterOptionChoices: { [VAMPIRE_OPTION_ID]: "stage-2" },
      selectedPerkIds: ["vampire-hemomancer", "werewolf-lycanthropic-speed"],
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
    expect(isTraitBlockedBySupernatural(game, state, "silent-dovah")).toBe(true);
    expect(canSelectTrait(game, state, "silent-dovah")).toBe(false);
  });

  it("selecting vampire while werewolf is active switches curses and clears werewolf perks", () => {
    const withWerewolfPerk = createTestBuildState({
      characterOptionChoices: { [WEREWOLF_OPTION_ID]: SUPERNATURAL_CLAIMED_CHOICE },
      selectedPerkIds: ["werewolf-animal-vigor", "vampire-hemomancer"],
    });

    const state = applySupernaturalOptionChange(
      game,
      withWerewolfPerk,
      VAMPIRE_OPTION_ID,
      "stage-1",
    );

    expect(isVampireActive(state)).toBe(true);
    expect(isWerewolfActive(state)).toBe(false);
    expect(state.selectedPerkIds).toEqual(["vampire-hemomancer"]);
    expect(state.characterOptionChoices[VAMPIRE_OPTION_ID]).toBe("stage-1");
    expect(state.characterOptionChoices[WEREWOLF_OPTION_ID]).toBe("none");
  });

  it("disabling a curse strips that tree's perks", () => {
    const state = applySupernaturalOptionChange(
      game,
      createTestBuildState({
        characterOptionChoices: { [WEREWOLF_OPTION_ID]: SUPERNATURAL_CLAIMED_CHOICE },
        selectedPerkIds: ["werewolf-animal-vigor", "destiny-01"],
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
        selectedPerkIds: ["vampire-hemomancer", "werewolf-animal-vigor", "destiny-01"],
      }),
      VAMPIRE_SKILL_ID,
    );

    expect(stripped.selectedPerkIds).toEqual([
      "werewolf-animal-vigor",
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

    expect(migrated.characterOptionChoices[VAMPIRE_OPTION_ID]).toBe("stage-2");
    expect("vampirismId" in migrated).toBe(false);
  });

  it("normalizes legacy claimed vampire choice to stage 4", () => {
    const state = normalizeSupernaturalState(
      game,
      createTestBuildState({
        characterOptionChoices: { [VAMPIRE_OPTION_ID]: SUPERNATURAL_CLAIMED_CHOICE },
      }),
    );

    expect(state.characterOptionChoices[VAMPIRE_OPTION_ID]).toBe("stage-4");
  });

  it("reconcileBuild normalizes conflicting supernatural options", () => {
    const state = reconcileBuild(
      game,
      createTestBuildState({
        characterOptionChoices: {
          [VAMPIRE_OPTION_ID]: "stage-4",
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
        characterOptionChoices: { [VAMPIRE_OPTION_ID]: "stage-1" },
        traitIds: ["silent-dovah", "angler"],
      }),
    );

    expect(state.traitIds).toEqual(["angler"]);
  });
});
