import { cleanDescription, cleanName, slugify } from "../lib/transform-utils.mjs";
import { resolveFormIdentity } from "../lib/formid.mjs";
import { spellRecordToEffects } from "../lib/effects/spell-to-effects.mjs";
import { parseWeaponAnimType, parseWeaponData, weaponTypeToSlot } from "../lib/gear/weapon-data.mjs";
import {
  parseArmorData,
  parseArmorRating,
  parseBodySlots,
  primaryArmorSlot,
} from "../lib/gear/armor-data.mjs";
import {
  isStaticKeyword,
  resolveItemDisplayName,
  shouldKeepGearRecord,
} from "../lib/gear/filters.mjs";

function pluginMasters(record, mastersByPath, plugins) {
  const pluginPath = plugins.find(
    (plugin) => plugin.pluginName.toLowerCase() === String(record.plugin ?? "").toLowerCase(),
  )?.path;
  return pluginPath ? (mastersByPath.get(pluginPath) ?? []) : [];
}

function buildKeywordLookup(keywordRecords) {
  const byIdentity = new Map();
  const byEdid = new Map();
  for (const record of keywordRecords) {
    if (record.formIdentity) byIdentity.set(record.formIdentity, record.edid);
    if (record.edid) byEdid.set(record.edid.toLowerCase(), record.edid);
  }
  return { byIdentity, byEdid };
}

function resolveKeywordEdids(record, keywordLookup, mastersByPath, plugins) {
  const masters = pluginMasters(record, mastersByPath, plugins);
  const ownerPluginLower = String(record.plugin ?? "").toLowerCase();
  const edids = [];

  for (const formId of record.keywordFormIds ?? []) {
    const identity = resolveFormIdentity(ownerPluginLower, masters, formId);
    const edid = keywordLookup.byIdentity.get(identity);
    if (edid) edids.push(edid);
  }

  return [...new Set(edids)].sort();
}

function resolveEnchantId(record, enchantByIdentity, mastersByPath, plugins) {
  if (record.enchantFormId == null) return null;
  const masters = pluginMasters(record, mastersByPath, plugins);
  const identity = resolveFormIdentity(
    String(record.plugin ?? "").toLowerCase(),
    masters,
    record.enchantFormId,
  );
  return enchantByIdentity.get(identity) ?? null;
}

function allocateUniqueId(baseId, usedIds) {
  if (!usedIds.has(baseId)) {
    usedIds.add(baseId);
    return baseId;
  }

  let suffix = 2;
  while (usedIds.has(`${baseId}-${suffix}`)) suffix += 1;
  const id = `${baseId}-${suffix}`;
  usedIds.add(id);
  return id;
}

function transformEnchantments(enchantRecords, mgefIndex, mastersByPath, plugins) {
  const usedIds = new Set();
  const enchantments = [];
  const byIdentity = new Map();

  for (const record of enchantRecords) {
    if (!shouldKeepGearRecord(record)) continue;

    const name = resolveItemDisplayName(record.name, record.edid);
    const baseId = slugify(record.edid) || slugify(name) || "enchantment";
    const id = allocateUniqueId(baseId, usedIds);
    const effects = spellRecordToEffects(record, mgefIndex, pluginMasters(record, mastersByPath, plugins));

    const entry = {
      id,
      edid: record.edid,
      name: cleanName(name),
      description: cleanDescription(record.description || ""),
      effects,
      plugin: record.plugin ?? "",
    };

    enchantments.push(entry);
    if (record.formIdentity) byIdentity.set(record.formIdentity, id);
  }

  enchantments.sort((a, b) => a.name.localeCompare(b.name) || a.id.localeCompare(b.id));
  return { enchantments, byIdentity };
}

function transformWeapons(weaponRecords, context) {
  const {
    keywordLookup,
    enchantByIdentity,
    mastersByPath,
    plugins,
    usedIds,
  } = context;
  const weapons = [];

  for (const record of weaponRecords) {
    if (!shouldKeepGearRecord(record)) continue;

    const name = resolveItemDisplayName(record.name, record.edid);
    const baseId = slugify(record.edid) || slugify(name) || "weapon";
    const id = allocateUniqueId(baseId, usedIds);
    const keywordIds = resolveKeywordEdids(record, keywordLookup, mastersByPath, plugins);
    const enchantId = resolveEnchantId(record, enchantByIdentity, mastersByPath, plugins);
    const weaponType = record.weaponType ?? "unknown";
    const staticItem = Boolean(enchantId) || keywordIds.some((edid) => isStaticKeyword(edid));

    weapons.push({
      id,
      edid: record.edid,
      name: cleanName(name),
      kind: "weapon",
      weaponType,
      slot: weaponTypeToSlot(weaponType),
      value: record.value ?? 0,
      weight: record.weight ?? 0,
      damage: record.damage ?? 0,
      enchantId,
      keywordIds,
      description: cleanDescription(record.description || ""),
      static: staticItem,
      plugin: record.plugin ?? "",
    });
  }

  weapons.sort((a, b) => a.name.localeCompare(b.name) || a.id.localeCompare(b.id));
  return weapons;
}

function transformArmor(armorRecords, context) {
  const {
    keywordLookup,
    enchantByIdentity,
    mastersByPath,
    plugins,
    usedIds,
  } = context;
  const armor = [];

  for (const record of armorRecords) {
    if (!shouldKeepGearRecord(record)) continue;

    const name = resolveItemDisplayName(record.name, record.edid);
    const baseId = slugify(record.edid) || slugify(name) || "armor";
    const id = allocateUniqueId(baseId, usedIds);
    const keywordIds = resolveKeywordEdids(record, keywordLookup, mastersByPath, plugins);
    const enchantId = resolveEnchantId(record, enchantByIdentity, mastersByPath, plugins);
    const equipmentSlots = record.equipmentSlots?.length
      ? record.equipmentSlots
      : ["body"];
    const staticItem = Boolean(enchantId) || keywordIds.some((edid) => isStaticKeyword(edid));

    armor.push({
      id,
      edid: record.edid,
      name: cleanName(name),
      kind: "armor",
      armorType: record.armorType ?? "clothing",
      slot: primaryArmorSlot(equipmentSlots),
      equipmentSlots,
      value: record.value ?? 0,
      weight: record.weight ?? 0,
      armorRating: record.armorRating ?? 0,
      enchantId,
      keywordIds,
      description: cleanDescription(record.description || ""),
      static: staticItem,
      plugin: record.plugin ?? "",
    });
  }

  armor.sort((a, b) => a.name.localeCompare(b.name) || a.id.localeCompare(b.id));
  return armor;
}

export function transformGearCatalog({
  weaponRecords = [],
  armorRecords = [],
  enchantRecords = [],
  keywordRecords = [],
  mgefIndex,
  mastersByPath = new Map(),
  plugins = [],
}) {
  const keywordLookup = buildKeywordLookup(keywordRecords);
  const { enchantments, byIdentity: enchantByIdentity } = transformEnchantments(
    enchantRecords,
    mgefIndex ?? { byIdentity: new Map(), byEdid: new Map() },
    mastersByPath,
    plugins,
  );

  const usedIds = new Set(enchantments.map((entry) => entry.id));
  const context = {
    keywordLookup,
    enchantByIdentity,
    mastersByPath,
    plugins,
    usedIds,
  };

  const weapons = transformWeapons(weaponRecords, context);
  const armor = transformArmor(armorRecords, context);

  const index = {
    categories: ["weapons", "armor", "enchantments"],
    counts: {
      weapons: weapons.length,
      armor: armor.length,
      enchantments: enchantments.length,
      staticWeapons: weapons.filter((item) => item.static).length,
      staticArmor: armor.filter((item) => item.static).length,
    },
    slots: [
      "head",
      "body",
      "hands",
      "feet",
      "amulet",
      "ring",
      "weaponMain",
      "weaponOff",
    ],
    weaponTypes: [...new Set(weapons.map((item) => item.weaponType))].sort(),
    armorTypes: [...new Set(armor.map((item) => item.armorType))].sort(),
  };

  return {
    index,
    weapons: { weapons },
    armor: { armor },
    enchantments: { enchantments },
    summary: {
      weapons: weapons.length,
      armor: armor.length,
      enchantments: enchantments.length,
      staticItems:
        weapons.filter((item) => item.static).length +
        armor.filter((item) => item.static).length,
      skippedStubs:
        weaponRecords.length +
        armorRecords.length +
        enchantRecords.length -
        (weapons.length + armor.length + enchantments.length),
    },
  };
}

export async function importGear(context) {
  const catalog = transformGearCatalog({
    weaponRecords: context.scan.weaponRecords ?? [],
    armorRecords: context.scan.armorRecords ?? [],
    enchantRecords: context.scan.enchantRecords ?? [],
    keywordRecords: context.scan.keywordRecords ?? [],
    mgefIndex: context.derived.mgefIndex,
    mastersByPath: context.scan.mastersByPath ?? new Map(),
    plugins: context.plugins ?? [],
  });

  return {
    files: [
      ["items/index.json", catalog.index],
      ["items/weapons.json", catalog.weapons],
      ["items/armor.json", catalog.armor],
      ["items/enchantments.json", catalog.enchantments],
    ],
    summary: catalog.summary,
  };
}
