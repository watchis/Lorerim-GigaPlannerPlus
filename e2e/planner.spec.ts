import { expect, test } from "@playwright/test";
import {
  goToNav,
  openApp,
  racePickerButton,
  selectRace,
  setPlayerLevel,
} from "./helpers/app";
import { earnedPerkPoints, getMechanicsLeveling, getUiLabels } from "./helpers/labels";

const labels = getUiLabels();
const leveling = getMechanicsLeveling();

test.describe("Planner", () => {
  test.beforeEach(async ({ page }) => {
    await openApp(page, "/planner");
  });

  test("renders the core planner chrome and panels", async ({ page }) => {
    await expect(page.getByText(labels.panels["character-setup"].title)).toBeVisible();
    await expect(page.getByText(labels.panels["skill-trees"].title).first()).toBeVisible();
    await expect(
      page.getByRole("textbox", { name: labels["level-bar"].playerLevel }),
    ).toHaveValue(String(leveling.baseLevel));
    await expect(page.getByText(labels["level-bar"].perkPointsRemaining)).toBeVisible();
    await expect(page.getByText(String(earnedPerkPoints(leveling.baseLevel)))).toBeVisible();

    await expect(racePickerButton(page)).toContainText(
      labels.panels["character-setup"].noneSelected,
    );
    await expect(
      page.getByRole("button", {
        name: labels.panels["character-setup"].openOptions,
      }),
    ).toBeVisible();
  });

  test("selects a race from Character Setup", async ({ page }) => {
    await selectRace(page, "Nord");
    await expect(racePickerButton(page)).toContainText("Nord");

    await page
      .getByRole("button", { name: `Clear ${labels.panels["character-setup"].race}` })
      .click();
    await expect(racePickerButton(page)).toContainText(
      labels.panels["character-setup"].noneSelected,
    );
  });

  test("updates player level and earned perk points from the level bar", async ({
    page,
  }) => {
    const targetLevel = leveling.baseLevel + 4;
    await page.getByRole("button", { name: `Increase ${labels["level-bar"].playerLevel}` }).click();
    await expect(
      page.getByRole("textbox", { name: labels["level-bar"].playerLevel }),
    ).toHaveValue(String(leveling.baseLevel + 1));
    await expect(
      page.getByText(String(earnedPerkPoints(leveling.baseLevel + 1)), { exact: true }),
    ).toBeVisible();

    await setPlayerLevel(page, targetLevel);
    await expect(
      page.getByText(String(earnedPerkPoints(targetLevel)), { exact: true }),
    ).toBeVisible();

    await page.getByRole("button", { name: `Decrease ${labels["level-bar"].playerLevel}` }).click();
    await expect(
      page.getByRole("textbox", { name: labels["level-bar"].playerLevel }),
    ).toHaveValue(String(targetLevel - 1));
  });

  test("opens Character Options from Character Setup", async ({ page }) => {
    await page
      .getByRole("button", {
        name: labels.panels["character-setup"].openOptions,
      })
      .click();

    await expect(page.getByText(labels.panels["character-options"].title)).toBeVisible();
    await expect(
      page.getByText(labels.panels["character-options"].supernaturalSectionTitle),
    ).toBeVisible();
    await expect(
      page.getByText(labels.panels["character-options"].playthroughSectionTitle),
    ).toBeVisible();
  });

  test("persists planner edits across a full reload", async ({ page }) => {
    await selectRace(page, "Nord");
    await setPlayerLevel(page, 8);

    // Debounced localStorage persist (250ms) + beforeunload flush must settle.
    await expect
      .poll(async () =>
        page.evaluate(() => {
          for (let i = 0; i < window.localStorage.length; i += 1) {
            const key = window.localStorage.key(i);
            if (!key) continue;
            const value = window.localStorage.getItem(key) ?? "";
            if (value.includes("nord") && value.includes('"playerLevel":8')) return true;
          }
          return false;
        }),
      )
      .toBe(true);

    await page.reload();
    await expect(racePickerButton(page)).toContainText("Nord");
    await expect(
      page.getByRole("textbox", { name: labels["level-bar"].playerLevel }),
    ).toHaveValue("8");

    await goToNav(page, labels.nav.builds);
    await expect(page.getByText("Nord").first()).toBeVisible();
    await expect(page.getByText(/Level 8/).first()).toBeVisible();
  });
});
