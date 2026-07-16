import { expect, type Page } from "@playwright/test";
import { getUiLabels } from "./labels";

const labels = getUiLabels();
const setup = labels.panels["character-setup"];
const skillTrees = labels.panels["skill-trees"];

export type MobilePlannerSection =
  | typeof setup.title
  | typeof setup.overviewTitle
  | typeof skillTrees.title;

/** True when the stacked planner tab bar is present (viewport &lt; 720px layout). */
export async function isStackedPlanner(page: Page): Promise<boolean> {
  return page.getByRole("tablist", { name: "Planner sections" }).isVisible();
}

export async function goToMobilePlannerSection(
  page: Page,
  section: MobilePlannerSection,
): Promise<void> {
  const tablist = page.getByRole("tablist", { name: "Planner sections" });
  if (!(await tablist.isVisible().catch(() => false))) return;

  const tab = tablist.getByRole("tab", { name: section, exact: true });
  await tab.click();
  await expect(tab).toHaveAttribute("aria-selected", "true");
}

export async function goToCharacterSetup(page: Page): Promise<void> {
  await goToMobilePlannerSection(page, setup.title);
}

export async function goToCharacterOverview(page: Page): Promise<void> {
  await goToMobilePlannerSection(page, setup.overviewTitle);
}

export async function goToSkillTrees(page: Page): Promise<void> {
  await goToMobilePlannerSection(page, skillTrees.title);
}
