import { expect, test } from "@playwright/test";
import { desktopNav, goToNav, openApp, waitForAppReady } from "./helpers/app";
import { getUiLabels } from "./helpers/labels";

const labels = getUiLabels();

test.describe("App navigation", () => {
  test("desktop nav moves between Home, Planner, and My Builds", async ({ page }) => {
    await openApp(page);

    const nav = desktopNav(page);
    await expect(nav.getByRole("link", { name: labels.nav.home })).toBeVisible();
    await expect(nav.getByRole("link", { name: labels.nav.planner })).toBeVisible();
    await expect(nav.getByRole("link", { name: labels.nav.builds })).toBeVisible();

    await goToNav(page, labels.nav.planner);
    await expect(page).toHaveURL(/\/planner\/?$/);
    await expect(page.getByText(labels.panels["character-setup"].title)).toBeVisible();

    await goToNav(page, labels.nav.builds);
    await expect(page).toHaveURL(/\/builds\/?$/);
    await expect(
      page.getByRole("heading", { name: labels.panels["build-library"].title }),
    ).toBeVisible();

    await goToNav(page, labels.nav.home);
    await expect(page).toHaveURL(/\/?$/);
    await expect(page.getByText(labels.landing.howItWorksTitle)).toBeVisible();
  });

  test("mobile menu navigates and closes after route changes", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await openApp(page);

    await expect(desktopNav(page)).toBeHidden();

    await page.getByRole("button", { name: "Open menu" }).click();
    const mobileNav = page.locator("#mobile-nav");
    await expect(mobileNav).toBeVisible();
    await expect(mobileNav).not.toHaveAttribute("hidden", "");

    await mobileNav.getByRole("link", { name: labels.nav.planner }).click();
    await waitForAppReady(page);
    await expect(page).toHaveURL(/\/planner\/?$/);
    await expect(mobileNav).toHaveAttribute("hidden", "");
  });

  test("unknown routes redirect home", async ({ page }) => {
    await openApp(page, "/does-not-exist");
    await expect(page).toHaveURL(/\/?$/);
    await expect(page.getByText(labels.landing.howItWorksTitle)).toBeVisible();
  });
});
