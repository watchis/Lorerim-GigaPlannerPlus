import { expect, test } from "@playwright/test";
import {
  goToNav,
  openApp,
  playerLevelInput,
  selectRace,
  setPlayerLevel,
} from "../../helpers/app";
import { getUiLabels } from "../../helpers/labels";
import {
  goToCharacterOverview,
  goToCharacterSetup,
  goToSkillTrees,
  isStackedPlanner,
} from "../../helpers/mobile";
import {
  closeToOverview,
  enableVampireCurse,
  openCharacterOptions,
  openSkillTree,
  openVampireSkillTree,
  selectSingleSetupOption,
  selectVampireHungerStage,
  takePerk,
  toggleMultiSetupOptions,
} from "../../helpers/planner";

const labels = getUiLabels();
const setup = labels.panels["character-setup"];
const characterOptions = labels.panels["character-options"];

test.describe("Mobile stacked planner", () => {
  test.beforeEach(async ({ page }) => {
    await openApp(page, "/planner");
    await expect.poll(async () => isStackedPlanner(page)).toBe(true);
  });

  test("builds a vampire Nord through section tabs, pickers, and skill trees", async ({
    page,
  }) => {
    await goToCharacterSetup(page);
    await selectRace(page, "Nord");
    await closeToOverview(page);
    await selectSingleSetupOption(page, setup.birthsign, "Lady");
    await toggleMultiSetupOptions(page, setup.majorSkills, ["Block", "One-Handed"]);
    await setPlayerLevel(page, 18);

    await openCharacterOptions(page);
    await enableVampireCurse(page);
    await selectVampireHungerStage(page, characterOptions.vampireStage2Short);
    await closeToOverview(page);

    await goToCharacterOverview(page);
    await expect(playerLevelInput(page)).toHaveValue("18");

    await openVampireSkillTree(page);
    await takePerk(page, "Scion");

    await goToSkillTrees(page);
    await openSkillTree(page, "Block");
    await takePerk(page, "Improved Blocking");

    // Persistence across routes is the final signal — returning to planner can leave a
    // skill-tree subview pinned on the center pane, which is covered above via tabs.
    await goToNav(page, labels.nav.builds);
    await expect(page.getByText(/Nord · Level 18/)).toBeVisible();
  });
});
