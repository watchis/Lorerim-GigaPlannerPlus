import { expect, type Download, type Page } from "@playwright/test";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { goToNav } from "./app";
import { getUiLabels } from "./labels";

const labels = getUiLabels();
const library = labels.panels["build-library"];

export async function importShareCodeAsNew(page: Page, code: string): Promise<void> {
  await goToNav(page, labels.nav.builds);
  await page.getByPlaceholder(library.importCodePlaceholder).fill(code);
  await page.getByRole("button", { name: library.importAsNew, exact: true }).click();
  await expect(page.getByText(library.importedAsNew, { exact: true })).toBeVisible();
}

export async function importShareCodeFromLanding(page: Page, code: string): Promise<void> {
  await page.getByPlaceholder(labels.landing.importPlaceholder).fill(code);
  await page.getByRole("button", { name: labels.landing.importButton, exact: true }).click();
}

export async function exportActiveBuildDownload(page: Page): Promise<Download> {
  await goToNav(page, labels.nav.builds);
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: library.exportActive, exact: true }).click(),
  ]);
  return download;
}

export async function exportFullLibraryDownload(page: Page): Promise<Download> {
  await goToNav(page, labels.nav.builds);
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: library.exportAll, exact: true }).click(),
  ]);
  return download;
}

export async function saveDownloadToTemp(download: Download, extension = ".gpp"): Promise<string> {
  const dir = mkdtempSync(path.join(tmpdir(), "gpp-e2e-"));
  const suggested = download.suggestedFilename() || `backup${extension}`;
  const filePath = path.join(dir, suggested.endsWith(extension) ? suggested : `${suggested}${extension}`);
  await download.saveAs(filePath);
  return filePath;
}

export async function importBackupFile(page: Page, filePath: string): Promise<void> {
  await goToNav(page, labels.nav.builds);
  await page.locator('input[type="file"]').setInputFiles(filePath);
}

export async function createNewBuildSlot(page: Page): Promise<void> {
  await goToNav(page, labels.nav.builds);
  await page.getByRole("button", { name: library.newBuild, exact: true }).click();
}
