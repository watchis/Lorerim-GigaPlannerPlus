/**
 * LoreRim 5.0 faith-effects reference (Google Sheet export).
 * Used only to cross-check numeric magnitudes during import tests — not to rewrite
 * shrine wording. In-game MGEF DNAM templates (e.g. "Increases your Health and
 * Stamina by <mag> points.") are preserved; only <mag> is substituted.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { deityNameFromAltarKey } from "./deity-eligibility.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REFERENCE_CSV_PATH = join(__dirname, "deity-faith-blessing-reference.csv");

const DEITY_NAME_TO_ALTAR_KEY = {
  Akatosh: "Divine_Akatosh",
  Arkay: "Divine_Arkay",
  Dibella: "Divine_Dibella",
  Julianos: "Divine_Julianos",
  Kynareth: "Divine_Kynareth",
  Mara: "Divine_Mara",
  Stendarr: "Divine_Stendarr",
  Talos: "Divine_Talos",
  Zenithar: "Divine_Zenithar",
  Auriel: "Divine_Auriel",
  Trinimac: "Divine_Trinimac",
  Morhwa: "Divine_Morwha",
  Morwha: "Divine_Morwha",
  Xarxes: "Divine_Xarxes",
  Phynaster: "Divine_Phynaster",
  Syrabane: "Divine_Syrabane",
  Magnus: "Divine_Magnus",
  Jephre: "Divine_Jephre",
  Morwha: "Divine_Morwha",
  Leki: "Divine_Leki",
  Sai: "Divine_Sai",
  Rajhin: "Divine_Rajhin",
  "Tall Papa": "Divine_TallPapa",
  "St Allesia": "StAlessia",
  "St. Alessia": "StAlessia",
  Azura: "Daedra_Azura",
  Boethia: "Daedra_Boethia",
  Clavicus: "Daedra_Clavicus",
  "Clavicus Vile": "Daedra_Clavicus",
  Hermaeus: "Daedra_Herma",
  "Hermaeus Mora": "Daedra_Herma",
  Hircine: "Daedra_Hircine",
  Malacath: "Daedra_Malacath",
  Mehrunes: "Daedra_Mehrunes",
  "Mehrunes Dagon": "Daedra_Mehrunes",
  Mephala: "Daedra_Mephala",
  Meridia: "Daedra_Meridia",
  Molag: "Daedra_MolagBal",
  "Molag Bal": "Daedra_MolagBal",
  Namira: "Daedra_Namira",
  Nocturnal: "Daedra_Nocturnal",
  Peryite: "Daedra_Peryite",
  Sanguine: "Daedra_Sanguine",
  Sheogorath: "Daedra_Sheogorath",
  Vaermina: "Daedra_Vaermina",
  Mannimarco: "Daedra_Mannimarco",
  Jyggalag: "Daedra_Jyggalag",
  "Baan Daar": "BaanDar",
  "Baan Dar": "BaanDar",
  Ebonarm: "Daedra_Ebonarm",
  "The HoonDing": "HoonDing",
  "The Magne-Ge": "TheMagnaGe",
  "The Magna-Ge": "TheMagnaGe",
  "The All-Maker": "TheAllMaker",
  "The Hist": "TheHist",
  "The Old Ways": "Totems",
  "Riddle'Thar": "RiddleThar",
  "The Riddle Thar": "RiddleThar",
  "Riddle'Thar": "RiddleThar",
  "Z'en": "Zen",
  Almalexia: "Tribunal_Almalexia",
  "Sotha Sil": "Tribunal_SothaSil",
  Vivec: "Tribunal_Vivec",
  Shor: "Nordic_Shor",
  Sithis: "DarkBrotherhood_Sithis",
  Satakal: "Yokuda_Satakal",
};

const DIVINE_NAMES = new Set([
  "Akatosh",
  "Arkay",
  "Dibella",
  "Julianos",
  "Kynareth",
  "Mara",
  "Stendarr",
  "Talos",
  "Zenithar",
  "Auriel",
  "Trinimac",
  "Xarxes",
  "Phynaster",
  "Syrabane",
  "Magnus",
  "Jephre",
  "Morwha",
  "Leki",
  "Sai",
  "Rajhin",
  "Tall Papa",
]);

const DAEDRA_NAMES = new Set([
  "Azura",
  "Boethia",
  "Clavicus Vile",
  "Hermaeus Mora",
  "Hircine",
  "Malacath",
  "Mehrunes Dagon",
  "Mephala",
  "Meridia",
  "Molag Bal",
  "Namira",
  "Nocturnal",
  "Peryite",
  "Sanguine",
  "Sheogorath",
  "Vaermina",
  "Mannimarco",
  "Jyggalag",
  "Ebonarm",
]);

export function inferAltarKeyFromDeityName(deityName) {
  const name = String(deityName ?? "").trim();
  if (!name) return null;
  if (DEITY_NAME_TO_ALTAR_KEY[name]) return DEITY_NAME_TO_ALTAR_KEY[name];

  const compact = name.replace(/[^a-z0-9]/gi, "");
  if (DIVINE_NAMES.has(name)) return `Divine_${compact}`;
  if (DAEDRA_NAMES.has(name)) {
    if (name === "Molag Bal") return "Daedra_MolagBal";
    if (name === "Clavicus Vile") return "Daedra_Clavicus";
    if (name === "Hermaeus Mora") return "Daedra_Herma";
    if (name === "Mehrunes Dagon") return "Daedra_Mehrunes";
    return `Daedra_${compact}`;
  }

  return compact;
}

/**
 * Extract numeric magnitudes from LoreRim 5.0 reference blessing text for cross-checking imports.
 * These are the values that should appear after substituting <mag> in shrine MGEF descriptions.
 */
export function extractReferenceBlessingMagnitudes(blessingText) {
  const text = String(blessingText ?? "").trim();
  if (!text || /random/i.test(text)) return [];

  const magnitudes = [];
  const add = (value) => {
    const number = Number(value);
    if (!Number.isFinite(number) || number <= 0) return;
    if (!magnitudes.includes(number)) magnitudes.push(number);
  };

  for (const match of text.matchAll(/\b(\d+(?:\.\d+)?)\s*%/g)) add(match[1]);
  for (const match of text.matchAll(/\b(\d+(?:\.\d+)?)\s+More\b/gi)) add(match[1]);
  for (const match of text.matchAll(/\b(\d+(?:\.\d+)?)\s+Lockpicking Expertise\b/gi)) add(match[1]);
  for (const match of text.matchAll(/\b(\d+(?:\.\d+)?)\s+Armor Rating\b/gi)) add(match[1]);
  for (const match of text.matchAll(/\b(\d+(?:\.\d+)?)\s+More Unarmed\b/gi)) add(match[1]);
  for (const match of text.matchAll(/\bincreased by (\d+(?:\.\d+)?)\b/gi)) add(match[1]);

  return magnitudes;
}

export function shrineTextContainsMagnitudes(shrineText, magnitudes) {
  const text = String(shrineText ?? "");
  return magnitudes.every((value) => new RegExp(`\\b${value}\\b`).test(text));
}

function parseReferenceCsv(csvText) {
  const lines = csvText.trim().split(/\r?\n/);
  const rows = [];

  for (const line of lines) {
    if (!line.trim() || /^,LoreRim/i.test(line) || /^Diety,/i.test(line)) continue;
    const cells = [];
    let current = "";
    let inQuotes = false;
    for (let index = 0; index < line.length; index++) {
      const char = line[index];
      if (char === '"') {
        inQuotes = !inQuotes;
        continue;
      }
      if (char === "," && !inQuotes) {
        cells.push(current.trim());
        current = "";
        continue;
      }
      current += char;
    }
    cells.push(current.trim());
    if (!cells[0] || cells[0].startsWith(",")) continue;
    rows.push({
      deityName: cells[0],
      blessing: cells[1] ?? "",
      altarKey: inferAltarKeyFromDeityName(cells[0]),
      expectedMagnitudes: extractReferenceBlessingMagnitudes(cells[1] ?? ""),
    });
  }

  return rows;
}

export function loadBlessingReferenceRows(csvPath = REFERENCE_CSV_PATH) {
  return parseReferenceCsv(readFileSync(csvPath, "utf8"));
}

export function verifyAltarKeyMapping(rows = loadBlessingReferenceRows()) {
  const mismatches = [];
  for (const row of rows) {
    if (!row.altarKey || row.expectedMagnitudes.length === 0) continue;
    const inferredName = deityNameFromAltarKey(row.altarKey);
    const normalizedExpected = row.deityName.replace(/\./g, "").trim().toLowerCase();
    const normalizedInferred = inferredName.replace(/\./g, "").trim().toLowerCase();
    if (
      normalizedExpected !== normalizedInferred &&
      !normalizedExpected.includes(normalizedInferred) &&
      !normalizedInferred.includes(normalizedExpected)
    ) {
      mismatches.push({ deityName: row.deityName, altarKey: row.altarKey, inferredName });
    }
  }
  return mismatches;
}
