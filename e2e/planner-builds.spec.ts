import { expect, test } from "@playwright/test";
import {
  goToNav,
  openApp,
  playerLevelInput,
  racePickerButton,
  readPlayerLevel,
  selectRace,
  setPlayerLevel,
} from "./helpers/app";
import { earnedPerkPoints, getMechanicsLeveling, getUiLabels } from "./helpers/labels";
import {
  addAttributeChoice,
  claimOghmaInfinium,
  closeToOverview,
  createNewVariant,
  enableVampireCurse,
  expectPerkSelected,
  openCharacterOptions,
  openSkillTree,
  removePerk,
  selectSingleSetupOption,
  setupPickerButton,
  readSkillLevel,
  setSkillLevel,
  switchVariant,
  takePerk,
  toggleMultiSetupOptions,
} from "./helpers/planner";

const labels = getUiLabels();
const setup = labels.panels["character-setup"];
const skillTrees = labels.panels["skill-trees"];
const leveling = getMechanicsLeveling();

test.describe("Planner complex builds", () => {
  test.describe.configure({ timeout: 90_000 });

  test.beforeEach(async ({ page }) => {
    await openApp(page, "/planner");
  });

  test("builds a Nord warrior with majors, attributes, and combat perk chains", async ({
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

    // Ranked perks / force-allocate may spend more than one point per named node.
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

  test("force-allocating a deep perk raises skill and player level automatically", async ({
    page,
  }) => {
    await selectRace(page, "Nord");
    await closeToOverview(page);

    await expect(playerLevelInput(page)).toHaveValue(String(leveling.baseLevel));

    await openSkillTree(page, "Block");
    await takePerk(page, "Defensive Stance");

    // Chain: Improved Blocking → Strong Grip → Elemental Protection → Defensive Stance (75).
    expect(await readSkillLevel(page)).toBeGreaterThanOrEqual(75);
    expect(await readPlayerLevel(page)).toBeGreaterThan(leveling.baseLevel);

    await expectPerkSelected(page, "Improved Blocking");
    await expectPerkSelected(page, "Strong Grip");
    await expectPerkSelected(page, "Elemental Protection");
  });

  test("removes a selected perk with right-click and restores the perk point", async ({
    page,
  }) => {
    await setPlayerLevel(page, 5);
    await openSkillTree(page, "Block");
    await takePerk(page, "Improved Blocking");

    const remainingAfterTake = earnedPerkPoints(5) - 1;
    await expect(
      page
        .getByText(String(remainingAfterTake), { exact: true })
        .filter({ visible: true }),
    ).toBeVisible();

    await removePerk(page, "Improved Blocking");
    await expect(
      page
        .getByText(String(earnedPerkPoints(5)), { exact: true })
        .filter({ visible: true }),
    ).toBeVisible();

    // Tooltip should no longer report Selected after removal.
    await page.getByRole("button", { name: "Improved Blocking", exact: true }).hover();
    await expect(page.getByText(skillTrees.available, { exact: true }).first()).toBeVisible();
  });

  test("trains a skill through Training mode and spends training budget", async ({ page }) => {
    await setPlayerLevel(page, 10);
    await openSkillTree(page, "Block");

    await page.getByRole("button", { name: skillTrees.trainingMode, exact: true }).click();
    await expect(page.getByText(skillTrees.trainingModeActive)).toBeVisible();
    await expect(page.getByText(skillTrees.trainingRangesTitle)).toBeVisible();

    await expect(page.getByText(skillTrees.trainingRangesTitle, { exact: true })).toBeVisible();
    const firstTier = page.getByRole("textbox", { name: /^Levels / }).first();
    await page.getByRole("button", { name: /^Increase training Levels / }).first().click();
    await expect(firstTier).toHaveValue("1");
    await expect(
      page
        .locator("div")
        .filter({ hasText: skillTrees.trainingSkillTotal })
        .filter({ hasText: /^1$|:\s*1\b|\b1\s*\// })
        .first(),
    ).toBeVisible();
  });

  test("enables Vampire curse and opens the Vampire perk tree from Character Setup", async ({
    page,
  }) => {
    await selectRace(page, "Nord");
    await closeToOverview(page);

    await openCharacterOptions(page);
    await enableVampireCurse(page);
    await page.getByRole("button", { name: setup.backToOverview }).click();

    await expect(page.getByText(/Vampiric curse active|Vampire/i).first()).toBeVisible();

    const vampireTree = page
      .locator("button")
      .filter({ has: page.getByText(setup.vampireTree, { exact: true }) })
      .first();
    await expect(vampireTree).toBeVisible();
    await vampireTree.click();
    await expect(page.getByRole("heading", { name: setup.vampireTree })).toBeVisible();
  });

  test("claims Oghma Infinium and assigns skill choices", async ({ page }) => {
    await openCharacterOptions(page);
    await claimOghmaInfinium(page, ["Block", "One-Handed", "Smithing"]);

    // Oghma grants bonus perk points on top of the level budget.
    await page.getByRole("button", { name: setup.backToOverview }).click();
    await expect(
      page
        .getByText(String(earnedPerkPoints(leveling.baseLevel) + 3), { exact: true })
        .filter({ visible: true }),
    ).toBeVisible();
  });

  test("creates a build variant and keeps edits isolated between variants", async ({
    page,
  }) => {
    await selectRace(page, "Nord");
    await closeToOverview(page);
    await setPlayerLevel(page, 15);
    await openSkillTree(page, "Block");
    await takePerk(page, "Improved Blocking");

    await createNewVariant(page);

    // New variants start fresh at level 1 / no race.
    await expect(playerLevelInput(page)).toHaveValue(String(leveling.baseLevel));
    await expect(racePickerButton(page)).toContainText(setup.noneSelected);

    await selectRace(page, "Breton");
    await closeToOverview(page);
    await setPlayerLevel(page, 8);

    await switchVariant(page, labels.milestones.fullBuild);
    await expect(racePickerButton(page)).toContainText("Nord");
    await expect(playerLevelInput(page)).toHaveValue("15");

    await switchVariant(page, /^Level 1/);
    await expect(racePickerButton(page)).toContainText("Breton");
    await expect(playerLevelInput(page)).toHaveValue("8");
  });

  test("raising a skill far above the floor auto-advances player level", async ({
    page,
  }) => {
    await expect(playerLevelInput(page)).toHaveValue(String(leveling.baseLevel));

    await openSkillTree(page, "Block");
    await setSkillLevel(page, 60);

    // skillLevelIncreasesPerPlayerLevel = 5, so +60-ish above baseline needs many levels.
    expect(await readPlayerLevel(page)).toBeGreaterThan(leveling.baseLevel);
    await expect(
      page.getByRole("button", { name: labels["level-bar"].ensurePlayerLevel }),
    ).toBeDisabled();
  });

  test("round-trips a completed combat build through share code import", async ({ page }) => {
    await selectRace(page, "Nord");
    await closeToOverview(page);
    await selectSingleSetupOption(page, setup.birthsign, "Warrior");
    await toggleMultiSetupOptions(page, setup.majorSkills, ["Block", "One-Handed"]);
    await setPlayerLevel(page, 25);
    await addAttributeChoice(page, "Health");
    await openSkillTree(page, "Block");
    await takePerk(page, "Improved Blocking");
    await takePerk(page, "Strong Grip");
    await openSkillTree(page, "One-Handed");
    await takePerk(page, "Weapon Mastery");

    await goToNav(page, labels.nav.builds);
    const codeButton = page
      .locator("button")
      .filter({ has: page.locator("code") })
      .filter({ hasText: /^3\./ });
    const shareCode = (await codeButton.locator("code").innerText()).trim();

    await openApp(page);
    await page.getByPlaceholder(labels.landing.importPlaceholder).fill(shareCode);
    await page.getByRole("button", { name: labels.landing.importButton }).click();

    await expect(racePickerButton(page)).toContainText("Nord");
    await expect(playerLevelInput(page)).toHaveValue("25");
    await expect(setupPickerButton(page, setup.birthsign)).toContainText("Warrior");
    await expect(page.getByRole("button", { name: "Block", exact: true }).first()).toBeVisible();
    await expect(page.getByRole("button", { name: "One-Handed", exact: true }).first()).toBeVisible();

    await openSkillTree(page, "Block");
    await page.getByRole("button", { name: "Improved Blocking", exact: true }).hover();
    await expect(page.getByText(skillTrees.selected, { exact: true }).first()).toBeVisible();
  });
});
