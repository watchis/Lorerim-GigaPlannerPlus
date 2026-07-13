/**
 * Classical Lichdom (UndeathFixes) vs Prelude Magicka Weave detection and
 * phylactery threshold import from winning MESG records.
 */

import { cleanDescription } from "./transform-utils.mjs";

/** Soul count → MESG Editor ID in Classical Lichdom / UndeathFixes.esp. */
export const CLASSICAL_PHYLACTERY_MSG_BY_SOULS = new Map([
  [1, "NecroPhyMsg1"],
  [2, "NecroPhyMsg2"],
  [3, "NecroPhyMsg3"],
  [5, "NecroPhyMsg5"],
  [8, "NecroPhyMsg8"],
  [10, "NecroPhyMsg10"],
  [12, "NecroPhyMsg12"],
  [15, "NecroPhyMsg15"],
  [18, "NecroPhyMsg18"],
  [20, "NecroPhyMsg20"],
  [22, "NecroPhyMsg22"],
  [25, "NecroPhyMsg25"],
  [30, "NecroPhyMsg30"],
  [35, "NecroPhyMsg35"],
  [40, "NecroPhyMsg40"],
  [45, "NecroPhyMsg45"],
  [50, "NecroPhyMsg50"],
]);

/**
 * Script-accurate unlock copy. MESG for souls 1–2 is incomplete or stale
 * (Msg2 still claims 1% absorb; script uses souls/2).
 */
export const CLASSICAL_THRESHOLD_META = {
  1: {
    name: "Magicka Flood",
    description:
      "Gain 50 magicka. For each soul fed to your phylactery, gain an additional 4 magicka. Spells in lich form last 0.5% longer for each soul fed.",
    effects: [{ type: "attribute", stat: "magicka", value: 50 }],
    bonusDetails: [
      "Base +50 magicka from Magicka Flood.",
      "+4 magicka per soul in the phylactery.",
      "+0.5% spell duration in lich form per soul.",
    ],
  },
  2: {
    name: "Lich Barrier",
    description:
      "For each soul fed to your phylactery, gain 2 armor rating and 0.5% spell absorption, with an additional 0.5% in lich form.",
    effects: [],
    bonusDetails: [
      "+2 armor rating per soul.",
      "+0.5% spell absorption per soul.",
      "+0.5% spell absorption in lich form per soul.",
    ],
  },
  3: { name: "Bane of Life" },
  5: { name: "Necromantic Affinity" },
  8: { name: "Phylactery Conduit" },
  10: { name: "Improved Physical Form" },
  12: { name: "Mighty Lich Form" },
  15: {
    name: "Tempered Form",
    effects: [{ type: "derivedStat", stat: "fireResist", value: 50, isPercent: true }],
  },
  18: { name: "Apocryphal Clarity" },
  20: { name: "Mind Flay" },
  22: { name: "Enslave Mind" },
  25: { name: "Veil of Deceit" },
  30: { name: "Enslave Undead" },
  35: { name: "Mannimarco's Favor" },
  40: { name: "Mass Reanimate" },
  45: { name: "Call Dracolich" },
  50: { name: "Devour Soul" },
};

/** From NecroUCLPhylacterySoulScript.RefreshScalingEffects (Classical Lichdom). */
export const CLASSICAL_PHYLACTERY_RATES = {
  maxSouls: 50,
  perSoul: {
    armorRating: 2,
    magicka: 4,
    magicAbsorb: 0.5,
    magicAbsorbInForm: 0.5,
    spellDurationInForm: 0.5,
  },
};

const PHYLACTERY_MSG_RE = /^NecroPhyMsg(\d+)$/i;
const HARVEST_PREAMBLE_RE =
  /^You harvest the animus in the black soul gem and imbue your phylactery with its magical energy\.?\s*(?:Your power grows\.?\s*)?/i;

export function cleanPhylacteryMessage(text) {
  return cleanDescription(String(text ?? ""))
    .replace(/<([^<>]+)>/g, "$1")
    .replace(HARVEST_PREAMBLE_RE, "")
    .trim();
}

export function pluginNameOf(entry) {
  if (!entry) return "";
  if (typeof entry === "string") return entry;
  return entry.pluginName ?? entry.name ?? "";
}

export function hasClassicalLichdomSignals({ plugins = [], mesgRecords = [] } = {}) {
  const hasMsg = mesgRecords.some((record) => PHYLACTERY_MSG_RE.test(record.edid ?? ""));
  if (hasMsg) return true;

  return plugins.some((entry) => {
    const name = pluginNameOf(entry).toLowerCase();
    return (
      name === "undeathfixes.esp" ||
      name.includes("classical lichdom") ||
      name.includes("undeathfixes")
    );
  });
}

export function hasPreludeLichSignals({ plugins = [], avifMembership = null } = {}) {
  const hasPlugin = plugins.some((entry) => {
    const name = pluginNameOf(entry).toLowerCase();
    return name.includes("preludetopurgatory") || name.includes("prelude to purgatory");
  });
  const hasAvif = Boolean(avifMembership?.hasAvifForSkill?.("lich"));
  return hasPlugin || hasAvif;
}

/**
 * @returns {{ mode: "phylactery" | "perk-tree" | "preserve", hasClassical: boolean, hasPrelude: boolean }}
 */
export function detectLichFramework({
  plugins = [],
  mesgRecords = [],
  avifMembership = null,
} = {}) {
  const hasClassical = hasClassicalLichdomSignals({ plugins, mesgRecords });
  const hasPrelude = hasPreludeLichSignals({ plugins, avifMembership });

  // Prelude Magicka Weave perk tree wins when its AVIF/plugin is present.
  if (hasPrelude && !hasClassical) {
    return { mode: "perk-tree", hasClassical, hasPrelude };
  }
  if (hasClassical) {
    return { mode: "phylactery", hasClassical, hasPrelude };
  }
  if (hasPrelude) {
    return { mode: "perk-tree", hasClassical, hasPrelude };
  }
  return { mode: "preserve", hasClassical, hasPrelude };
}

export function discoverPhylacteryMessageSouls(mesgRecords = []) {
  const souls = new Set();
  for (const record of mesgRecords) {
    const match = PHYLACTERY_MSG_RE.exec(record.edid ?? "");
    if (!match) continue;
    souls.add(Number.parseInt(match[1], 10));
  }
  return [...souls].sort((a, b) => a - b);
}

/**
 * Build phylactery thresholds from Classical Lichdom MESG + script-accurate rates.
 * Prior effects / bonusDetails / hand-tuned names are merged in by the caller.
 */
export function buildClassicalPhylacteryFromMessages(mesgRecords = []) {
  const byEdid = new Map(
    mesgRecords.filter((record) => record.edid).map((record) => [record.edid, record]),
  );

  const soulCounts = discoverPhylacteryMessageSouls(mesgRecords);
  const thresholds = (soulCounts.length > 0 ? soulCounts : [...CLASSICAL_PHYLACTERY_MSG_BY_SOULS.keys()])
    .filter((souls) => CLASSICAL_PHYLACTERY_MSG_BY_SOULS.has(souls))
    .map((souls) => {
      const edid = CLASSICAL_PHYLACTERY_MSG_BY_SOULS.get(souls);
      const meta = CLASSICAL_THRESHOLD_META[souls] ?? {};
      const mesg = byEdid.get(edid);
      const fromMesg = mesg?.description ? cleanPhylacteryMessage(mesg.description) : "";

      return {
        souls,
        name: meta.name ?? `Phylactery ${souls}`,
        description: meta.description || fromMesg || "",
        effects: meta.effects ? structuredClone(meta.effects) : [],
        ...(meta.bonusDetails ? { bonusDetails: [...meta.bonusDetails] } : {}),
      };
    });

  return {
    ...structuredClone(CLASSICAL_PHYLACTERY_RATES),
    thresholds,
  };
}

export function mergePhylactery(prior, imported) {
  if (!imported) return structuredClone(prior ?? { ...CLASSICAL_PHYLACTERY_RATES, thresholds: [] });
  if (!prior) return structuredClone(imported);

  const priorBySouls = new Map((prior.thresholds ?? []).map((entry) => [entry.souls, entry]));

  return {
    maxSouls: imported.maxSouls ?? prior.maxSouls ?? CLASSICAL_PHYLACTERY_RATES.maxSouls,
    perSoul: { ...CLASSICAL_PHYLACTERY_RATES.perSoul, ...(prior.perSoul ?? {}), ...(imported.perSoul ?? {}) },
    thresholds: (imported.thresholds ?? []).map((entry) => {
      const previous = priorBySouls.get(entry.souls);
      return {
        ...entry,
        // Planner-authored numeric effects (e.g. Tempered Form fire resist) win when present.
        effects:
          previous?.effects?.length > 0 ? structuredClone(previous.effects) : (entry.effects ?? []),
        bonusDetails:
          previous?.bonusDetails?.length > 0
            ? [...previous.bonusDetails]
            : entry.bonusDetails
              ? [...entry.bonusDetails]
              : undefined,
      };
    }),
  };
}

export function defaultLichdomShell() {
  return {
    forms: [
      {
        id: "none",
        name: "None",
        description: "",
        bonus: "",
        effects: [],
        bonusDetails: [],
      },
    ],
    racialBonuses: {},
    phylactery: {
      ...structuredClone(CLASSICAL_PHYLACTERY_RATES),
      thresholds: [],
    },
  };
}
