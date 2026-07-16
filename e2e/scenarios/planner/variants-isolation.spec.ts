import { expect, test } from "@playwright/test";
import {
  openApp,
  playerLevelInput,
  racePickerButton,
  selectRace,
  setPlayerLevel,
} from "../../helpers/app";
import { getMechanicsLeveling, getUiLabels } from "../../helpers/labels";
import {
  closeToOverview,
  createNewVariant,
  openSkillTree,
  switchVariant,
  takePerk,
} from "../../helpers/planner";

const labels = getUiLabels();
const setup = labels.panels["character-setup"];
const leveling = getMechanicsLeveling();

test.describe("Build variants", () => {
  test.beforeEach(async ({ page }) => {
    await openApp(page, "/planner");
  });

  test("keeps race, level, and perk edits isolated between variants", async ({ page }) => {
    await selectRace(page, "Nord");
    await closeToOverview(page);
    await setPlayerLevel(page, 15);
    await openSkillTree(page, "Block");
    await takePerk(page, "Improved Blocking");

    await createNewVariant(page);

    // New variants start fresh at level 1 / no race.
    await expect(playerLevelInput(page)).toHaveValue(String(leveling.baseLevel));
    await expect(racePickerButton(page)).toContainText(setup.noneSelected);

    await selectRace(page, "Breton");
    await closeToOverview(page);
    await setPlayerLevel(page, 8);

    await switchVariant(page, labels.milestones.fullBuild);
    await expect(racePickerButton(page)).toContainText("Nord");
    await expect(playerLevelInput(page)).toHaveValue("15");

    await switchVariant(page, /^Level 1/);
    await expect(racePickerButton(page)).toContainText("Breton");
    await expect(playerLevelInput(page)).toHaveValue("8");
  });
});
