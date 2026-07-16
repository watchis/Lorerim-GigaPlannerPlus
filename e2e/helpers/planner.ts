import { expect, type Locator, type Page } from "@playwright/test";
import { getUiLabels } from "./labels";
import {
  goToCharacterOverview,
  goToCharacterSetup,
  goToSkillTrees,
  isStackedPlanner,
} from "./mobile";

const labels = getUiLabels();
const setup = labels.panels["character-setup"];
const skillTrees = labels.panels["skill-trees"];
const characterOptions = labels.panels["character-options"];
const attributes = labels.panels.attributes;
const variantsManager = labels.panels["variants-manager"];

export function setupPickerButton(page: Page, pickerLabel: string): Locator {
  // Multi-select rows append "(N left)"; single-select rows append the selection name with
  // no guaranteed whitespace, so match on the label prefix only.
  return page
    .getByRole("button")
    .filter({ hasText: new RegExp(`^${escapeRegExp(pickerLabel)}`) })
    .first();
}

async function openSetupPicker(page: Page, pickerLabel: string): Promise<void> {
  await goToCharacterSetup(page);
  const button = setupPickerButton(page, pickerLabel);
  await button.scrollIntoViewIfNeeded();
  await button.click();
}

/**
 * Leave a setup picker / character-options subview and return to Character Setup rows.
 * Desktop uses the picker header back control; stacked layout clears via the overview tab
 * (the header back control is hidden below 720px).
 */
export async function closeToOverview(page: Page): Promise<void> {
  if (await isStackedPlanner(page)) {
    await goToCharacterOverview(page);
    await goToCharacterSetup(page);
    return;
  }

  const overview = page.getByRole("button", { name: setup.backToOverview, exact: true });
  if (await overview.isVisible().catch(() => false)) {
    await overview.click();
  }
}

async function confirmPickerSelection(page: Page, optionName: string): Promise<void> {
  const selectBtn = page.getByRole("button", { name: `Select ${optionName}`, exact: true });
  if (await selectBtn.isVisible().catch(() => false)) {
    await selectBtn.click();
  }
}

export async function selectSingleSetupOption(
  page: Page,
  pickerLabel: string,
  optionName: string,
): Promise<void> {
  await openSetupPicker(page, pickerLabel);
  await page.getByRole("button", { name: optionName, exact: true }).click();
  await confirmPickerSelection(page, optionName);
  await closeToOverview(page);
  await expect(setupPickerButton(page, pickerLabel)).toContainText(optionName);
}

export async function toggleMultiSetupOptions(
  page: Page,
  pickerLabel: string,
  optionNames: string[],
): Promise<void> {
  await openSetupPicker(page, pickerLabel);
  for (const optionName of optionNames) {
    await page.getByRole("button", { name: optionName, exact: true }).click();
  }
  await closeToOverview(page);
  // Multi-select rows show chips beneath the picker button, not the option names in the button.
  for (const optionName of optionNames) {
    await expect(
      setupPickerButton(page, pickerLabel)
        .locator("xpath=ancestor::div[contains(@class,'space-y')][1]")
        .getByRole("button", { name: optionName, exact: true }),
    ).toBeVisible();
  }
}

export async function addAttributeChoice(
  page: Page,
  attribute: "Health" | "Magicka" | "Stamina",
): Promise<void> {
  await goToCharacterSetup(page);
  await page.getByRole("button", { name: `Add ${attribute} choice` }).click();
}

export async function openSkillTree(page: Page, skillName: string): Promise<void> {
  await goToSkillTrees(page);
  // Skill chips in Character Setup are span[role=button]; sidebar tiles are real <button>s.
  const tile = page
    .locator("button")
    .filter({ has: page.getByText(skillName, { exact: true }) })
    .filter({ hasText: /View skill level bonuses|\d+/ })
    .first();
  await tile.click();
  await expect(page.getByRole("heading", { name: skillName })).toBeVisible();
}

export async function takePerk(page: Page, perkName: string): Promise<void> {
  // Ranked perks share a display name; target the first matching node.
  const perk = page.getByRole("button", { name: perkName, exact: true }).first();
  await expect(perk).toBeVisible();
  await perk.dblclick();
  await expectPerkSelected(page, perkName);
}

export async function expectPerkSelected(page: Page, perkName: string): Promise<void> {
  const perk = page.getByRole("button", { name: perkName, exact: true }).first();
  await expect(perk).toBeVisible();
  const selectedTip = page.getByText(skillTrees.selected, { exact: true }).first();

  // Desktop: hover opens the perk tooltip.
  await perk.hover();
  if (await selectedTip.isVisible().catch(() => false)) {
    await page.mouse.move(0, 0);
    return;
  }

  // Touch / non-hover: a short tap opens the tooltip without deselecting.
  await perk.tap();
  await expect(selectedTip).toBeVisible();
  await page.mouse.move(0, 0);
}

export async function removePerk(page: Page, perkName: string): Promise<void> {
  const perk = page.getByRole("button", { name: perkName, exact: true }).first();
  await perk.click({ button: "right" });
}

export function skillLevelInput(page: Page): Locator {
  return page.getByRole("textbox", { name: skillTrees.skillLevel, exact: true });
}

export async function readSkillLevel(page: Page): Promise<number> {
  const input = skillLevelInput(page);
  await expect(input).toBeVisible();
  return Number(await input.inputValue());
}

export async function setSkillLevel(page: Page, level: number): Promise<void> {
  const input = skillLevelInput(page);
  await input.fill(String(level));
  await input.press("Enter");
  await expect(input).toHaveValue(String(level));
}

export async function visibleBudgetValue(page: Page, label: string): Promise<string> {
  const row = page
    .locator("span, div")
    .filter({ hasText: new RegExp(`${escapeRegExp(label)}:?`) })
    .filter({ visible: true })
    .first();
  await expect(row).toBeVisible();
  const text = (
    await row.evaluate((el) => {
      const root = el.closest("div") ?? el.parentElement;
      return root?.textContent ?? el.textContent ?? "";
    })
  ).replace(/\s+/g, " ");
  const match = text.match(/(-?\d+)/);
  expect(match).toBeTruthy();
  return match![1];
}

export async function openCharacterOptions(page: Page): Promise<void> {
  await goToCharacterSetup(page);
  await page.getByRole("button", { name: setup.openOptions }).click();
  await expect(page.getByRole("heading", { name: characterOptions.title })).toBeVisible();
}

export async function enableVampireCurse(page: Page): Promise<void> {
  const vampire = page
    .locator("article")
    .filter({ has: page.getByRole("heading", { name: characterOptions.vampireOption, exact: true }) });
  await vampire.getByRole("checkbox").check();
  await expect(vampire.getByText(characterOptions.curseActiveBadge, { exact: true })).toBeVisible();
}

export async function selectVampireHungerStage(
  page: Page,
  stageShortLabel: string,
): Promise<void> {
  const group = page.getByRole("radiogroup", { name: characterOptions.vampireStageLabel });
  await group.getByRole("radio", { name: new RegExp(escapeRegExp(stageShortLabel)) }).click();
  await expect(
    group.getByRole("radio", { name: new RegExp(escapeRegExp(stageShortLabel)) }),
  ).toHaveAttribute("aria-checked", "true");
}

export async function openVampireSkillTree(page: Page): Promise<void> {
  await goToCharacterSetup(page);
  const vampireTree = page
    .locator("button")
    .filter({ has: page.getByText(setup.vampireTree, { exact: true }) })
    .first();
  await expect(vampireTree).toBeVisible();
  await vampireTree.click();
  await expect(page.getByRole("heading", { name: setup.vampireTree })).toBeVisible();
}

export async function setAuNaturelGearPieces(page: Page, pieces: 0 | 1 | 2 | 3 | 4): Promise<void> {
  const group = page.getByRole("group", { name: characterOptions.auNaturelGear });
  await group.getByRole("button", { name: String(pieces), exact: true }).click();
  await expect(group.getByRole("button", { name: String(pieces), exact: true })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
}

export async function claimOghmaInfinium(page: Page, skillNames: string[]): Promise<void> {
  const oghma = page
    .locator("section")
    .filter({ has: page.getByRole("heading", { name: characterOptions.oghmaInfinium, exact: true }) })
    .first();
  await oghma.getByRole("checkbox", { name: characterOptions.oghmaNone }).check();
  await expect(oghma.getByText(characterOptions.oghmaClaimed)).toBeVisible();

  await oghma
    .getByRole("button")
    .filter({ hasText: new RegExp(`^${escapeRegExp(characterOptions.oghmaSkills)}`) })
    .click();

  for (const skillName of skillNames) {
    await page.getByRole("button", { name: skillName, exact: true }).click();
  }

  await page.getByRole("button", { name: characterOptions.backToOptions, exact: true }).click();
  for (const skillName of skillNames) {
    await expect(oghma.getByText(skillName, { exact: true })).toBeVisible();
  }
}

export async function createNewVariant(page: Page): Promise<void> {
  await page.getByRole("combobox").filter({ hasText: /Default|Lv / }).click();
  await page.getByRole("option", { name: labels.milestones.manageVariants }).click();
  await expect(page.getByRole("heading", { name: variantsManager.title })).toBeVisible();
  await page
    .locator("button")
    .filter({ has: page.getByText(variantsManager.createNew, { exact: true }) })
    .click();
  await expect(page.getByText(/2 variants/i)).toBeVisible();
  await page.getByRole("button", { name: variantsManager.back, exact: true }).click();
}

export async function switchVariant(page: Page, optionPattern: RegExp | string): Promise<void> {
  await page.getByRole("combobox").filter({ hasText: /Default|Lv / }).click();
  await page.getByRole("option", { name: optionPattern }).click();
}

export function attributeLabel(attribute: "health" | "magicka" | "stamina"): string {
  return attributes[attribute];
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
