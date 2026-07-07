import * as tesData from "@fcrick/tes-data";
import { open } from "node:fs/promises";
import { SKILL_IDS, SKILL_NAMES } from "./skill-constants.mjs";
import { formatCount } from "./import-progress.mjs";
import { cleanName } from "./transform-utils.mjs";
import { scanSubrecords } from "./perk-record-parser.mjs";
import { parseMasters, resolveFormIdentity } from "./formid.mjs";
import { getRecordBufferAsync, visitAsync } from "./plugin-io.mjs";

const AVIF_SKILL_ALIASES = new Map([
  ["mysticism", "illusion"],
  ["pickpocket", "finesse"],
  ["speechcraft", "speech"],
  ["lightarmor", "evasion"],
  ["marksmanship", "marksman"],
  ["onehanded", "one-handed"],
  ["twohanded", "two-handed"],
  ["heavyarmor", "heavy-armor"],
]);

function readU32(data) {
  const buffer = Buffer.isBuffer(data) ? data : Buffer.from(data);
  return buffer.length >= 4 ? buffer.readUInt32LE(0) : 0;
}

function skillIdFromAvif(edid, fullName) {
  const normalizedFull = cleanName(fullName).toLowerCase();
  const fullIndex = SKILL_NAMES.findIndex(
    (name) => name.toLowerCase() === normalizedFull,
  );
  if (fullIndex >= 0) return SKILL_IDS[fullIndex];

  const body = String(edid ?? "")
    .replace(/^AV/, "")
    .toLowerCase();
  return AVIF_SKILL_ALIASES.get(body) ?? null;
}

function parseAvifPerkSections(buffer, ownerPluginLower, masters) {
  const sections = [];
  let current = null;

  for (const sub of scanSubrecords(buffer)) {
    if (sub.type === "PNAM") {
      if (current) sections.push(current);
      current = {
        identity: resolveFormIdentity(ownerPluginLower, masters, readU32(sub.data)),
        x: null,
        y: null,
        inam: null,
        cnam: [],
      };
      continue;
    }

    if (!current) continue;
    if (sub.type === "XNAM") current.x = readU32(sub.data);
    if (sub.type === "YNAM") current.y = readU32(sub.data);
    if (sub.type === "INAM") current.inam = readU32(sub.data);
    if (sub.type === "CNAM") current.cnam.push(readU32(sub.data));
  }

  if (current) sections.push(current);
  return sections;
}

function addPrerequisiteNames(sections, identityToName) {
  const inamToSection = new Map();
  const prerequisiteSourcesByInam = new Map();

  for (const section of sections) {
    if (section.inam != null) {
      inamToSection.set(section.inam, section);
    }

    for (const childInam of section.cnam) {
      if (!prerequisiteSourcesByInam.has(childInam)) {
        prerequisiteSourcesByInam.set(childInam, []);
      }
      prerequisiteSourcesByInam.get(childInam).push(section);
    }
  }

  for (const section of sections) {
    const prerequisiteNames = [];
    if (section.inam != null) {
      for (const source of prerequisiteSourcesByInam.get(section.inam) ?? []) {
        const name = identityToName.get(source.identity);
        if (name) prerequisiteNames.push(name);
      }
    }

    section.prerequisiteNames = prerequisiteNames;
    section.name = identityToName.get(section.identity) ?? null;
    section.childNames = section.cnam
      .map((inam) => identityToName.get(inamToSection.get(inam)?.identity))
      .filter(Boolean);
  }

  return sections;
}

export function buildIdentityToPerkName(perkRecords) {
  const identityToName = new Map();

  for (const record of perkRecords) {
    const identity = record.perkMeta?.formIdentity;
    const name = cleanName(record.name);
    if (!identity || !name) continue;
    identityToName.set(identity, name);
  }

  return identityToName;
}

async function readAvifMasters(fd, offsets) {
  const header = offsets.find(([, type]) => type === "TES4");
  if (!header) return [];
  try {
    const buffer = await getRecordBufferAsync(fd, header[0]);
    return parseMasters(buffer);
  } catch {
    return [];
  }
}

export function parseAvifRecord(buffer, ownerPluginLower, masters) {
  const record = tesData.getRecord(buffer);
  if (record.compressed) return null;

  const edid = record.subRecords?.find((sub) => sub.type === "EDID")?.value;
  const fullName = record.subRecords?.find((sub) => sub.type === "FULL")?.value ?? "";
  const skillId = skillIdFromAvif(edid, fullName);
  if (!skillId) return null;

  const sections = parseAvifPerkSections(buffer, ownerPluginLower, masters);
  if (sections.length === 0) return null;

  return { skillId, avifEdid: edid, sections };
}

export async function collectAvifPerkTrees(plugins, progress = null) {
  const trees = new Map();
  const scan = progress?.pluginScan?.("Scanning AVIF perk trees", plugins.length);

  for (const { pluginName, path } of plugins) {
    const ownerPluginLower = (pluginName || path.split(/[/\\]/).pop() || "").toLowerCase();
    const fh = await open(path, "r");
    const offsets = await visitAsync(fh.fd);
    const masters = await readAvifMasters(fh.fd, offsets);

    for (const [offset, type] of offsets) {
      if (type !== "AVIF") continue;

      try {
        const buffer = await getRecordBufferAsync(fh.fd, offset);
        const parsed = parseAvifRecord(buffer, ownerPluginLower, masters);
        if (!parsed) continue;

        trees.set(parsed.skillId, parsed);
      } catch {
        // Skip malformed records.
      }
    }

    await fh.close();
    scan?.tick(trees.size > 0 ? `${trees.size} skill trees` : "");
  }

  scan?.finish(`${formatCount(trees.size)} skill trees`);
  return trees;
}

export function finalizeAvifPerkTrees(avifTrees, identityToName) {
  const finalized = new Map();

  for (const [skillId, tree] of avifTrees) {
    finalized.set(skillId, {
      ...tree,
      sections: addPrerequisiteNames(tree.sections.map((section) => ({ ...section })), identityToName),
    });
  }

  return finalized;
}
