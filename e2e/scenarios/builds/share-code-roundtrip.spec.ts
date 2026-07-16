import { expect, test } from "@playwright/test";
import {
  goToNav,
  openApp,
  playerLevelInput,
  racePickerButton,
  selectRace,
  setPlayerLevel,
} from "../../helpers/app";
import { importShareCodeFromLanding } from "../../helpers/builds";
import { getUiLabels } from "../../helpers/labels";
import {
  addAttributeChoice,
  closeToOverview,
  openSkillTree,
  selectSingleSetupOption,
  setupPickerButton,
  takePerk,
  toggleMultiSetupOptions,
} from "../../helpers/planner";

const labels = getUiLabels();
const setup = labels.panels["character-setup"];
const skillTrees = labels.panels["skill-trees"];

test.describe("Share code round-trip", () => {
  test("exports a completed combat build and re-imports it from the landing page", async ({
    page,
  }) => {
    await openApp(page, "/planner");
    await selectRace(page, "Nord");
    await closeToOverview(page);
    await selectSingleSetupOption(page, setup.birthsign, "Warrior");
    await toggleMultiSetupOptions(page, setup.majorSkills, ["Block", "One-Handed"]);
    await setPlayerLevel(page, 25);
    await addAttributeChoice(page, "Health");
    await openSkillTree(page, "Block");
    await takePerk(page, "Improved Blocking");
    await takePerk(page, "Strong Grip");
    await openSkillTree(page, "One-Handed");
    await takePerk(page, "Weapon Mastery");

    await goToNav(page, labels.nav.builds);
    const codeButton = page
      .locator("button")
      .filter({ has: page.locator("code") })
      .filter({ hasText: /^3\./ });
    const shareCode = (await codeButton.locator("code").innerText()).trim();

    await openApp(page);
    await importShareCodeFromLanding(page, shareCode);

    await expect(racePickerButton(page)).toContainText("Nord");
    await expect(playerLevelInput(page)).toHaveValue("25");
    await expect(setupPickerButton(page, setup.birthsign)).toContainText("Warrior");
    await expect(page.getByRole("button", { name: "Block", exact: true }).first()).toBeVisible();
    await expect(page.getByRole("button", { name: "One-Handed", exact: true }).first()).toBeVisible();

    await openSkillTree(page, "Block");
    await page.getByRole("button", { name: "Improved Blocking", exact: true }).hover();
    await expect(page.getByText(skillTrees.selected, { exact: true }).first()).toBeVisible();
  });
});
