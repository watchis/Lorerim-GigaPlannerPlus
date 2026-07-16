import { expect, test } from "@playwright/test";
import { openApp, setPlayerLevel } from "../../helpers/app";
import { formatLabel, getMechanicsLeveling, getUiLabels } from "../../helpers/labels";

const labels = getUiLabels();
const leveling = getMechanicsLeveling();

test.describe("Level 101 and easy mode", () => {
  test.beforeEach(async ({ page }) => {
    await openApp(page, "/planner");
  });

  test("allows standard max level without warning and flags easy-mode levels above it", async ({
    page,
  }) => {
    const standardMax = leveling.standardMaxPlayerLevel;
    const warning = formatLabel(labels["level-bar"].easyModeLevelWarning, {
      standardMax,
    });

    await setPlayerLevel(page, standardMax);
    await expect(page.getByRole("button", { name: warning, exact: true })).toHaveCount(0);

    await setPlayerLevel(page, standardMax + 1);
    await expect(page.getByRole("button", { name: warning, exact: true })).toBeVisible();

    await setPlayerLevel(page, leveling.maxPlayerLevel);
    await expect(page.getByRole("button", { name: warning, exact: true })).toBeVisible();
  });
});
