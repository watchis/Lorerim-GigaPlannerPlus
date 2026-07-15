import { expect, type Locator, type Page } from "@playwright/test";
import { getUiLabels } from "./labels";

const labels = getUiLabels();

/** Fresh browser storage for each test — mirrors a first-time visitor. */
export async function openApp(page: Page, path = "/"): Promise<void> {
  // Hit the origin once so we can clear persisted builds without an init script
  // that would wipe storage again on later navigations/reloads.
  await page.goto("/");
  await page.evaluate(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });
  await page.goto(path);
  await waitForAppReady(page);
}

export async function waitForAppReady(page: Page): Promise<void> {
  await expect(page.getByText("Loading...")).toHaveCount(0, { timeout: 30_000 });
  await expect(page.getByText(labels.app.title).first()).toBeVisible({ timeout: 30_000 });
}

export function desktopNav(page: Page): Locator {
  return page.locator("header nav").filter({ has: page.getByRole("link", { name: labels.nav.home }) });
}

export async function goToNav(page: Page, name: string): Promise<void> {
  await desktopNav(page).getByRole("link", { name, exact: true }).click();
  await waitForAppReady(page);
}

export function racePickerButton(page: Page): Locator {
  return page
    .locator("button")
    .filter({ has: page.getByText(labels.panels["character-setup"].race, { exact: true }) })
    .first();
}

export async function selectRace(page: Page, raceName: string): Promise<void> {
  await racePickerButton(page).click();
  const option = page.getByRole("button", { name: raceName, exact: true });
  await expect(option).toBeVisible();
  await option.click();
  await expect(racePickerButton(page)).toContainText(raceName);
}

export async function readActiveBuildCode(page: Page): Promise<string> {
  await goToNav(page, labels.nav.builds);
  const codeButton = page
    .locator("button")
    .filter({ has: page.locator("code") })
    .filter({ hasText: /^3\./ });
  await expect(codeButton).toBeVisible();
  const code = (await codeButton.locator("code").innerText()).trim();
  expect(code.startsWith("3.")).toBeTruthy();
  return code;
}

export async function setPlayerLevel(page: Page, level: number): Promise<void> {
  const input = page.getByRole("textbox", { name: labels["level-bar"].playerLevel });
  await input.fill(String(level));
  await input.press("Enter");
  await expect(input).toHaveValue(String(level));
}
