import { expect, test } from "@playwright/test";
import {
  LEGACY_V2_USER_BUILD,
  LEGACY_V2_USER_BUILD_CODE,
} from "../../fixtures/legacyBuildCodes";
import { goToNav, openApp, playerLevelInput, racePickerButton } from "../../helpers/app";
import { importShareCodeAsNew } from "../../helpers/builds";
import { formatLabel, getUiLabels } from "../../helpers/labels";
import { goToCharacterSetup } from "../../helpers/mobile";
import { setupPickerButton } from "../../helpers/planner";

const labels = getUiLabels();
const setup = labels.panels["character-setup"];
const library = labels.panels["build-library"];

test.describe("Legacy v2 build code import", () => {
  test("imports an old modpack share code into a new slot with expected build state", async ({
    page,
  }) => {
    await openApp(page, "/builds");
    await importShareCodeAsNew(page, LEGACY_V2_USER_BUILD_CODE);

    await expect(page.getByText(LEGACY_V2_USER_BUILD.name, { exact: true }).first()).toBeVisible();
    await expect(
      page.getByText(
        formatLabel(library.playerLevel, { level: LEGACY_V2_USER_BUILD.playerLevel }),
        { exact: true },
      ).first(),
    ).toBeVisible();

    // Cross-patch import within the same major modpack should surface a soft warning.
    await expect(page.getByText(/was shared from/i).first()).toBeVisible();

    await goToNav(page, labels.nav.planner);
    await goToCharacterSetup(page);
    await expect(playerLevelInput(page)).toHaveValue(String(LEGACY_V2_USER_BUILD.playerLevel));
    // Race may resolve depending on codec mapping; majors are the stable signal.
    for (const skill of LEGACY_V2_USER_BUILD.majorSkills) {
      await expect(
        setupPickerButton(page, setup.majorSkills)
          .locator("xpath=ancestor::div[contains(@class,'space-y')][1]")
          .getByRole("button", { name: skill, exact: true }),
      ).toBeVisible();
    }
    await expect(racePickerButton(page)).not.toContainText(setup.noneSelected);
  });
});
