import { expect, test } from "@playwright/test";
import { openApp } from "../../helpers/app";
import { earnedPerkPoints, getMechanicsLeveling } from "../../helpers/labels";
import { claimOghmaInfinium, closeToOverview, openCharacterOptions } from "../../helpers/planner";

const leveling = getMechanicsLeveling();

test.describe("Oghma Infinium", () => {
  test.beforeEach(async ({ page }) => {
    await openApp(page, "/planner");
  });

  test("claims the book and assigns skill choices that grant bonus perk points", async ({
    page,
  }) => {
    await openCharacterOptions(page);
    await claimOghmaInfinium(page, ["Block", "One-Handed", "Smithing"]);

    await closeToOverview(page);
    await expect(
      page
        .getByText(String(earnedPerkPoints(leveling.baseLevel) + 3), { exact: true })
        .filter({ visible: true }),
    ).toBeVisible();
  });
});
