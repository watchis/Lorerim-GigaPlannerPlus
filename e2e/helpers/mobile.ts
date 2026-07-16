import { expect, type Page } from "@playwright/test";
import { getUiLabels } from "./labels";

const labels = getUiLabels();
const setup = labels.panels["character-setup"];
const skillTrees = labels.panels["skill-trees"];

/** Matches `STACKED_LAYOUT_MAX_WIDTH` in `src/layout/plannerLayout.ts`. */
const STACKED_LAYOUT_MAX_WIDTH = 720;

export type MobilePlannerSection =
  | typeof setup.title
  | typeof setup.overviewTitle
  | typeof skillTrees.title;

function plannerTablist(page: Page) {
  return page.getByRole("tablist", { name: "Planner sections" });
}

export function isNarrowPlannerViewport(page: Page): boolean {
  const viewport = page.viewportSize();
  return (viewport?.width ?? STACKED_LAYOUT_MAX_WIDTH) < STACKED_LAYOUT_MAX_WIDTH;
}

/** True when the stacked planner tab bar is present (viewport &lt; 720px layout). */
export async function isStackedPlanner(page: Page): Promise<boolean> {
  return plannerTablist(page).isVisible();
}

export async function goToMobilePlannerSection(
  page: Page,
  section: MobilePlannerSection,
): Promise<void> {
  if (!isNarrowPlannerViewport(page)) return;

  const tablist = plannerTablist(page);
  await expect(tablist).toBeVisible({ timeout: 10_000 });
  const tab = tablist.getByRole("tab", { name: section, exact: true });
  await tab.click();
  await expect(tab).toHaveAttribute("aria-selected", "true");
}

/**
 * Center tab clears setup pickers, character options, and open skill trees.
 * Wait until aria-selected is true — that only happens when no skill tree is pinned.
 */
export async function goToCharacterOverview(page: Page): Promise<void> {
  await goToMobilePlannerSection(page, setup.overviewTitle);
  await expect(page.getByText(/\d+\/\d+ perks selected/)).toHaveCount(0);
}

export async function goToCharacterSetup(page: Page): Promise<void> {
  if (!isNarrowPlannerViewport(page)) return;

  const tablist = plannerTablist(page);
  await expect(tablist).toBeVisible({ timeout: 10_000 });

  // Open skill trees pin the center pane via an effect; clear them before switching.
  await goToCharacterOverview(page);

  const setupTab = tablist.getByRole("tab", { name: setup.title, exact: true });
  await setupTab.click();
  await expect(setupTab).toHaveAttribute("aria-selected", "true");
  await expect(page.getByRole("tabpanel", { name: setup.title })).toBeVisible();
  await expect(page.getByText(/\d+\/\d+ perks selected/)).toHaveCount(0);
}

export async function goToSkillTrees(page: Page): Promise<void> {
  await goToMobilePlannerSection(page, skillTrees.title);
}
