import { describe, expect, it } from "vitest";
import { collectBuildChanges } from "@/lib/buildModifications";
import {
  applyLycanthropySelection,
  applyVampirismSelection,
  hasSupernaturalCurse,
  isTraitBlockedBySupernatural,
  normalizeSupernaturalState,
} from "@/lib/supernatural";
import { canSelectTrait, reconcileBuild } from "@/engine/buildEngine";
import { createTestBuildState, getTestGameData } from "@/test/helpers";

describe("supernatural", () => {
  const game = getTestGameData();

  it("applies vampirism stage effects to build modifications", () => {
    const state = createTestBuildState({ vampirismId: "stage-2", lycanthropyId: "none" });
    const collected = collectBuildChanges(game, state);
    const sources = collected.sourcedEffects.map((entry) => entry.source);

    expect(sources).toContain("Stage 2");
    expect(collected.sourcedEffects.some((entry) => entry.effect.type === "flag" && entry.effect.stat === "waterbreathing")).toBe(true);
  });

  it("applies werewolf effects and blocks vampirism", () => {
    const state = applyLycanthropySelection(
      game,
      createTestBuildState({ vampirismId: "stage-3", traitIds: ["silent-dovah"] }),
      "werewolf",
    );

    expect(state.vampirismId).toBe("none");
    expect(state.lycanthropyId).toBe("werewolf");
    expect(state.traitIds).not.toContain("silent-dovah");
    expect(hasSupernaturalCurse(state)).toBe(true);

    const collected = collectBuildChanges(game, state);
    expect(collected.sourcedEffects.some((entry) => entry.source === "Werewolf")).toBe(true);
  });

  it("selecting vampirism clears lycanthropy and incompatible traits", () => {
    const state = applyVampirismSelection(
      game,
      createTestBuildState({ lycanthropyId: "werewolf", traitIds: ["silent-dovah", "angler"] }),
      "stage-1",
    );

    expect(state.lycanthropyId).toBe("none");
    expect(state.vampirismId).toBe("stage-1");
    expect(state.traitIds).toEqual(["angler"]);
    expect(isTraitBlockedBySupernatural(game, state, "silent-dovah")).toBe(true);
    expect(canSelectTrait(game, state, "silent-dovah")).toBe(false);
  });

  it("reconcileBuild normalizes unknown supernatural ids", () => {
    const state = reconcileBuild(
      game,
      createTestBuildState({
        vampirismId: "invalid",
        lycanthropyId: "invalid",
        traitIds: ["silent-dovah"],
      }),
    );

    expect(state.vampirismId).toBe("none");
    expect(state.lycanthropyId).toBe("none");
    expect(state.traitIds).toContain("silent-dovah");
  });

  it("normalizeSupernaturalState resolves mutual exclusion in favor of vampirism", () => {
    const state = normalizeSupernaturalState(
      game,
      createTestBuildState({ vampirismId: "stage-2", lycanthropyId: "werewolf" }),
    );

    expect(state.vampirismId).toBe("stage-2");
    expect(state.lycanthropyId).toBe("none");
  });
});
