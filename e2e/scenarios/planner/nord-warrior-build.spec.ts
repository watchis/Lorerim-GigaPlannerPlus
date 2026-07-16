import { expect, test } from "@playwright/test";
import {
  goToNav,
  openApp,
  selectRace,
  setPlayerLevel,
} from "../../helpers/app";
import { earnedPerkPoints, getUiLabels } from "../../helpers/labels";
import {
  addAttributeChoice,
  closeToOverview,
  openSkillTree,
  readSkillLevel,
  selectSingleSetupOption,
  takePerk,
  toggleMultiSetupOptions,
} from "../../helpers/planner";

const labels = getUiLabels();
const setup = labels.panels["character-setup"];

test.describe("Nord warrior full build", () => {
  test.beforeEach(async ({ page }) => {
    await openApp(page, "/planner");
  });

  test("assembles race, skills, attributes, and combat perk chains into a shareable build", async ({
    page,
  }) => {
    await selectRace(page, "Nord");
    await closeToOverview(page);
    await selectSingleSetupOption(page, setup.birthsign, "Warrior");
    await selectSingleSetupOption(page, setup.deity, "Talos");

    await toggleMultiSetupOptions(page, setup.majorSkills, [
      "Block",
      "One-Handed",
      "Heavy Armor",
    ]);
    await toggleMultiSetupOptions(page, setup.minorSkills, ["Smithing", "Speech"]);
    await toggleMultiSetupOptions(page, setup.traits, ["Adrenaline Rush"]);

    await setPlayerLevel(page, 20);
    await addAttributeChoice(page, "Health");
    await addAttributeChoice(page, "Health");
    await addAttributeChoice(page, "Stamina");

    const perkBudgetBefore = earnedPerkPoints(20);

    await openSkillTree(page, "Block");
    await takePerk(page, "Improved Blocking");
    await takePerk(page, "Strong Grip");
    await takePerk(page, "Elemental Protection");

    await openSkillTree(page, "One-Handed");
    await takePerk(page, "Weapon Mastery");

    // Force-allocate bumps skill level to the deepest perk's requirement (50).
    await openSkillTree(page, "Block");
    expect(await readSkillLevel(page)).toBeGreaterThanOrEqual(50);
    await expect(page.getByText(/\d+\/\d+ perks selected/)).toBeVisible();

    await expect(
      page.getByText(labels["level-bar"].perkPointsRemaining).filter({ visible: true }),
    ).toBeVisible();
    await expect(
      page.getByText(/\(\d+ spent\)/).filter({ visible: true }).first(),
    ).toBeVisible();
    const remainingText = await page
      .locator("div, span")
      .filter({ hasText: labels["level-bar"].perkPointsRemaining })
      .filter({ visible: true })
      .first()
      .evaluate((el) => el.parentElement?.textContent ?? el.textContent ?? "");
    const remaining = Number(remainingText.match(/Perk points remaining:\s*(-?\d+)/)?.[1]);
    expect(remaining).toBeLessThan(perkBudgetBefore);

    await goToNav(page, labels.nav.builds);
    await expect(page.getByText(/Nord · Level 20/)).toBeVisible();
    await expect(page.getByRole("button", { name: /^3\./ })).toBeVisible();
  });
});
