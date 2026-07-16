import { expect, test } from "@playwright/test";
import {
  goToNav,
  openApp,
  playerLevelInput,
  racePickerButton,
  readActiveBuildCode,
  selectRace,
  setPlayerLevel,
  waitForAppReady,
} from "./helpers/app";
import { getUiLabels } from "./helpers/labels";

const labels = getUiLabels();

test.describe("Build import flows", () => {
  test("loads a share code from the landing page into the planner", async ({ page }) => {
    await openApp(page, "/planner");
    await selectRace(page, "Nord");
    await setPlayerLevel(page, 12);
    const code = await readActiveBuildCode(page);

    await openApp(page);
    await page.getByPlaceholder(labels.landing.importPlaceholder).fill(code);
    await page.getByRole("button", { name: labels.landing.importButton }).click();

    await waitForAppReady(page);
    await expect(page).toHaveURL(/\/planner/);
    await expect(racePickerButton(page)).toContainText("Nord");
    await expect(playerLevelInput(page)).toHaveValue("12");

    await goToNav(page, labels.nav.builds);
    await expect(
      page.getByText(labels.panels["build-library"].importedBadge).first(),
    ).toBeVisible();
  });

  test("imports a build from a planner link query parameter", async ({ page }) => {
    await openApp(page, "/planner");
    await selectRace(page, "Breton");
    await setPlayerLevel(page, 7);
    const code = await readActiveBuildCode(page);

    await openApp(page, `/planner?build=${encodeURIComponent(code)}`);
    await expect(racePickerButton(page)).toContainText("Breton");
    await expect(playerLevelInput(page)).toHaveValue("7");

    // Query param should be cleared after successful import.
    await expect(page).toHaveURL(/\/planner\/?$/);

    await goToNav(page, labels.nav.builds);
    await expect(
      page.getByText(labels.panels["build-library"].importedBadge).first(),
    ).toBeVisible();
  });

  test("home redirects into the planner when a build query is present", async ({ page }) => {
    await openApp(page, "/planner");
    await selectRace(page, "Nord");
    const code = await readActiveBuildCode(page);

    await openApp(page, `/?build=${encodeURIComponent(code)}`);
    await expect(page).toHaveURL(/\/planner/);
    await expect(racePickerButton(page)).toContainText("Nord");
  });
});
