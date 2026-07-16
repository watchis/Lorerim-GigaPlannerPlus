import { expect, test } from "@playwright/test";
import { openApp, selectRace, setPlayerLevel } from "../../helpers/app";
import { getUiLabels } from "../../helpers/labels";
import {
  closeToOverview,
  enableVampireCurse,
  openCharacterOptions,
  openVampireSkillTree,
  selectVampireHungerStage,
  takePerk,
} from "../../helpers/planner";

const characterOptions = getUiLabels().panels["character-options"];

test.describe("Vampire build", () => {
  test.beforeEach(async ({ page }) => {
    await openApp(page, "/planner");
  });

  test("enables the curse, picks a hunger stage, and takes a Vampire tree perk", async ({
    page,
  }) => {
    await selectRace(page, "Nord");
    await closeToOverview(page);
    await setPlayerLevel(page, 15);

    await openCharacterOptions(page);
    await enableVampireCurse(page);
    await selectVampireHungerStage(page, characterOptions.vampireStage3Short);
    await closeToOverview(page);

    await expect(page.getByText(/Vampiric curse active|Vampire/i).first()).toBeVisible();

    await openVampireSkillTree(page);
    await takePerk(page, "Scion");
  });
});
