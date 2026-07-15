import { expect, test } from "@playwright/test";
import { openApp } from "./helpers/app";
import { getUiLabels } from "./helpers/labels";

const labels = getUiLabels();

test.describe("Landing page", () => {
  test("loads the home experience with brand, guidance, and import entry points", async ({
    page,
  }) => {
    await openApp(page);

    await expect(page.getByText(labels.app.title).first()).toBeVisible();
    await expect(page.getByText(labels.landing.howItWorksTitle)).toBeVisible();
    await expect(page.getByText(labels.landing.featuresTitle)).toBeVisible();
    await expect(page.getByText(labels.landing.recentBuildsTitle)).toBeVisible();
    // Fresh installs always seed one default library slot.
    await expect(page.getByText(/Level \d+/).first()).toBeVisible();
    await expect(page.getByText(labels.panels["build-library"].activeBadge)).toBeVisible();

    await expect(page.getByText(labels.landing.importTitle)).toBeVisible();
    await expect(
      page.getByPlaceholder(labels.landing.importPlaceholder),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: labels.landing.importButton }),
    ).toBeDisabled();

    await expect(page.getByRole("link", { name: "GitHub" })).toHaveAttribute(
      "href",
      /github\.com/,
    );
    await expect(page.getByRole("link", { name: "Discord" })).toHaveAttribute(
      "href",
      /discord/,
    );
  });

  test("rejects an invalid build code on the landing importer", async ({ page }) => {
    await openApp(page);

    const input = page.getByPlaceholder(labels.landing.importPlaceholder);
    await input.fill("not-a-real-build-code");
    await page.getByRole("button", { name: labels.landing.importButton }).click();

    await expect(page.getByRole("alert")).toHaveText(labels.errors.invalidBuildCode);
    await expect(page).toHaveURL(/\/?$/);
  });
});
