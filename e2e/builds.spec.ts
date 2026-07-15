import { expect, test } from "@playwright/test";
import { goToNav, openApp, selectRace, waitForAppReady } from "./helpers/app";
import { getUiLabels } from "./helpers/labels";

const labels = getUiLabels();
const buildLabels = labels.panels["build-library"];

test.describe("My Builds library", () => {
  test("creates an additional build slot and can open the planner", async ({ page }) => {
    await openApp(page, "/builds");

    await expect(page.getByText(/1 saved builds/)).toBeVisible();

    await page.getByRole("button", { name: buildLabels.newBuild }).click();
    await expect(page.getByText(/2 saved builds/)).toBeVisible();

    await page.getByRole("link", { name: buildLabels.openPlanner }).click();
    await waitForAppReady(page);
    await expect(page).toHaveURL(/\/planner\/?$/);
    await expect(page.getByText(labels.panels["character-setup"].title)).toBeVisible();
  });

  test("filters the build list by search", async ({ page }) => {
    await openApp(page, "/planner");
    await selectRace(page, "Nord");
    await goToNav(page, labels.nav.builds);

    const search = page.getByPlaceholder(buildLabels.searchBuilds);
    await search.fill("Nord");
    await expect(page.getByText("Nord").first()).toBeVisible();

    await search.fill("zzzz-no-such-build");
    await expect(page.getByText(buildLabels.noSearchResults)).toBeVisible();
  });

  test("imports a share code as a new library entry", async ({ page }) => {
    await openApp(page, "/planner");
    await selectRace(page, "Nord");

    await goToNav(page, labels.nav.builds);
    const codeButton = page
      .locator("button")
      .filter({ has: page.locator("code") })
      .filter({ hasText: /^3\./ });
    const code = (await codeButton.locator("code").innerText()).trim();

    await page.getByRole("button", { name: buildLabels.newBuild }).click();
    await expect(page.getByText(/2 saved builds/)).toBeVisible();

    const importBox = page.getByPlaceholder(buildLabels.importCodePlaceholder);
    await importBox.fill(code);
    await page.getByRole("button", { name: buildLabels.importAsNew }).click();

    await expect(page.getByText(buildLabels.importedAsNew)).toBeVisible();
    await expect(page.getByText(/3 saved builds/)).toBeVisible();
    await expect(page.getByText(buildLabels.importedBadge).first()).toBeVisible();
  });
});
