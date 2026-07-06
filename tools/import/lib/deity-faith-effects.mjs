import { cleanDescription, slugify } from "./transform-utils.mjs";

export const FAITH_EFFECTS_SHEET_URL =
  "https://docs.google.com/spreadsheets/d/1ZbhJkIHqEoVKzVtASmupizGPFuDUG84_/gviz/tq?tqx=out:csv";

const SPREADSHEET_DEITY_ID_ALIASES = new Map([
  ["baan daar", "baan-dar"],
  ["boethia", "boethiah"],
  ["morhwa", "morwha"],
  ["st allesia", "st-alessia"],
  ["the magne-ge", "the-magna-ge"],
]);

const METADATA_ROW_MARKERS = [
  /^dieties with no prayer cooldown/i,
  /^riddle thar cycle:/i,
  /^sai devotee chances:/i,
  /^vivec equilibrium/i,
  /^vivec 36 lessons/i,
  /^vivec chim/i,
  /^example:/i,
];

function spreadsheetDeityId(name) {
  const cleaned = cleanDescription(name).toLowerCase();
  const alias = SPREADSHEET_DEITY_ID_ALIASES.get(cleaned);
  if (alias) return alias;
  return slugify(cleanDescription(name));
}

function isMetadataRow(name) {
  const cleaned = cleanDescription(name);
  if (!cleaned) return true;
  return METADATA_ROW_MARKERS.some((pattern) => pattern.test(cleaned));
}

function parseCsvRows(text) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;

  for (let index = 0; index < text.length; index++) {
    const char = text[index];
    const next = text[index + 1];

    if (inQuotes) {
      if (char === '"' && next === '"') {
        field += '"';
        index += 1;
        continue;
      }
      if (char === '"') {
        inQuotes = false;
        continue;
      }
      field += char;
      continue;
    }

    if (char === '"') {
      inQuotes = true;
      continue;
    }
    if (char === ",") {
      row.push(field);
      field = "";
      continue;
    }
    if (char === "\n" || char === "\r") {
      if (char === "\r" && next === "\n") index += 1;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
      continue;
    }
    field += char;
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows;
}

export function parseFaithEffectsCsv(text) {
  const byId = new Map();

  for (const row of parseCsvRows(String(text ?? ""))) {
    const name = cleanDescription(row[0] ?? "");
    if (!name || /^diety$/i.test(name) || isMetadataRow(name)) continue;

    const shrine = cleanDescription(row[1] ?? "");
    const follower = cleanDescription(row[2] ?? "");
    const devotee = cleanDescription(row[3] ?? "");
    if (!shrine && !follower && !devotee) continue;

    byId.set(spreadsheetDeityId(name), {
      name,
      shrine: shrine || "-",
      follower: follower || "-",
      devotee: devotee || "-",
    });
  }

  return byId;
}

export async function fetchFaithEffectsFromSheet(url = FAITH_EFFECTS_SHEET_URL) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch faith effects sheet (${response.status})`);
  }
  return parseFaithEffectsCsv(await response.text());
}

export function resolveFaithEffects(deityId, faithEffectsById) {
  return faithEffectsById.get(deityId) ?? null;
}
