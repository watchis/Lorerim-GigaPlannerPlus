import { expect, test } from "@playwright/test";
import {
  goToNav,
  openApp,
  playerLevelInput,
  racePickerButton,
  selectRace,
  setPlayerLevel,
} from "../../helpers/app";
import {
  createNewBuildSlot,
  exportActiveBuildDownload,
  exportFullLibraryDownload,
  importBackupFile,
  saveDownloadToTemp,
} from "../../helpers/builds";
import { getUiLabels } from "../../helpers/labels";
import { closeToOverview, selectSingleSetupOption } from "../../helpers/planner";

const labels = getUiLabels();
const setup = labels.panels["character-setup"];
const library = labels.panels["build-library"];

test.describe(".gpp backup export / re-import", () => {
  test("exports the active build and re-imports it as a new slot", async ({ page }) => {
    await openApp(page, "/planner");
    await selectRace(page, "Nord");
    await closeToOverview(page);
    await selectSingleSetupOption(page, setup.birthsign, "Warrior");
    await setPlayerLevel(page, 33);

    const download = await exportActiveBuildDownload(page);
    const filePath = await saveDownloadToTemp(download);

    await openApp(page, "/builds");
    await importBackupFile(page, filePath);
    await expect(page.getByText(library.importedAsNew, { exact: true })).toBeVisible();

    await goToNav(page, labels.nav.planner);
    await expect(racePickerButton(page)).toContainText("Nord");
    await expect(playerLevelInput(page)).toHaveValue("33");
  });

  test("exports the full library and restores multiple builds", async ({ page }) => {
    await openApp(page, "/planner");
    await selectRace(page, "Nord");
    await closeToOverview(page);
    await setPlayerLevel(page, 20);

    await createNewBuildSlot(page);
    await goToNav(page, labels.nav.planner);
    await selectRace(page, "Breton");
    await closeToOverview(page);
    await setPlayerLevel(page, 12);

    const download = await exportFullLibraryDownload(page);
    const filePath = await saveDownloadToTemp(download);

    await openApp(page, "/builds");
    await importBackupFile(page, filePath);
    await expect(page.getByText(library.importedLibrary, { exact: true })).toBeVisible();

    await expect(page.getByText(/Nord/i).first()).toBeVisible();
    await expect(page.getByText(/Breton/i).first()).toBeVisible();
    await expect(page.getByText(/Level 20/i).first()).toBeVisible();
    await expect(page.getByText(/Level 12/i).first()).toBeVisible();
  });
});
