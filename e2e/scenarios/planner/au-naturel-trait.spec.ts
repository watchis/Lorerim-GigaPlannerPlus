import { expect, test } from "@playwright/test";
import { openApp, selectRace, setPlayerLevel } from "../../helpers/app";
import { formatLabel, getUiLabels } from "../../helpers/labels";
import {
  closeToOverview,
  openCharacterOptions,
  setAuNaturelGearPieces,
  toggleMultiSetupOptions,
} from "../../helpers/planner";

const labels = getUiLabels();
const setup = labels.panels["character-setup"];
const characterOptions = labels.panels["character-options"];

test.describe("Au Naturel trait", () => {
  test.beforeEach(async ({ page }) => {
    await openApp(page, "/planner");
  });

  test("unlocks gear-equipped controls and applies empty-slot attribute bonuses", async ({
    page,
  }) => {
    await selectRace(page, "Nord");
    await closeToOverview(page);
    await toggleMultiSetupOptions(page, setup.traits, ["Au Naturel"]);
    await setPlayerLevel(page, 10);

    await openCharacterOptions(page);
    await expect(
      page.getByRole("heading", { name: characterOptions.auNaturelGear, exact: true }),
    ).toBeVisible();

    // Per-level bonus = empty armor slots × player level (4 × 10).
    await setAuNaturelGearPieces(page, 0);
    await expect(
      page.getByText(formatLabel(characterOptions.auNaturelPerLevelBonus, { count: 40 }), {
        exact: true,
      }),
    ).toBeVisible();

    await setAuNaturelGearPieces(page, 2);
    await expect(
      page.getByText(formatLabel(characterOptions.auNaturelPerLevelBonus, { count: 20 }), {
        exact: true,
      }),
    ).toBeVisible();
    await expect(
      page.getByText(formatLabel(characterOptions.auNaturelGearPenalty, { count: 80 }), {
        exact: true,
      }),
    ).toBeVisible();
  });
});
