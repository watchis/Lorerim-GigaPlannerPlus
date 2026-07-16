import { expect, test } from "@playwright/test";
import {
  openApp,
  playerLevelInput,
  readPlayerLevel,
  selectRace,
} from "../../helpers/app";
import { getMechanicsLeveling } from "../../helpers/labels";
import {
  closeToOverview,
  expectPerkSelected,
  openSkillTree,
  readSkillLevel,
  takePerk,
} from "../../helpers/planner";

const leveling = getMechanicsLeveling();

test.describe("Deep perk force-allocate", () => {
  test.beforeEach(async ({ page }) => {
    await openApp(page, "/planner");
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
});
