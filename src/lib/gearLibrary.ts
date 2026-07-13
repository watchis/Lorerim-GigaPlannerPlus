import type {
  EquipmentSlotId,
  GameData,
  GearArmor,
  GearEnchantment,
  GearItem,
  GearWeapon,
  ItemsCatalog,
} from "@/data/schemas";

export const EQUIPMENT_SLOT_IDS = [
  "head",
  "body",
  "hands",
  "feet",
  "amulet",
  "ringLeft",
  "ringRight",
  "weaponMain",
  "weaponOff",
] as const satisfies readonly EquipmentSlotId[];

export const EQUIPMENT_SLOT_LABELS: Record<EquipmentSlotId, string> = {
  head: "Head",
  body: "Body",
  hands: "Hands",
  feet: "Feet",
  amulet: "Amulet",
  ringLeft: "Ring (left)",
  ringRight: "Ring (right)",
  weaponMain: "Main hand",
  weaponOff: "Off hand",
};

export type EquipmentSelection = {
  itemId: string;
  enchantId?: string | null;
};

export type WishlistEntry = {
  kind: "item" | "enchant";
  id: string;
};

export function emptyEquipment(): Partial<Record<EquipmentSlotId, EquipmentSelection>> {
  return {};
}

export function emptyWishlist(): WishlistEntry[] {
  return [];
}

export function buildItemsCatalog(input: {
  index: ItemsCatalog["index"];
  weapons: GearWeapon[];
  armor: GearArmor[];
  enchantments: GearEnchantment[];
}): ItemsCatalog {
  const itemById: Record<string, GearItem> = {};
  for (const weapon of input.weapons) itemById[weapon.id] = weapon;
  for (const armor of input.armor) itemById[armor.id] = armor;

  const enchantmentById: Record<string, GearEnchantment> = {};
  for (const enchantment of input.enchantments) {
    enchantmentById[enchantment.id] = enchantment;
  }

  return {
    index: input.index,
    weapons: input.weapons,
    armor: input.armor,
    enchantments: input.enchantments,
    itemById,
    enchantmentById,
  };
}

export function getGearItem(game: GameData, itemId: string | null | undefined): GearItem | undefined {
  if (!itemId) return undefined;
  return game.items.itemById[itemId];
}

export function getGearEnchantment(
  game: GameData,
  enchantId: string | null | undefined,
): GearEnchantment | undefined {
  if (!enchantId) return undefined;
  return game.items.enchantmentById[enchantId];
}

export function itemFitsEquipmentSlot(item: GearItem, slot: EquipmentSlotId): boolean {
  if (item.kind === "weapon") {
    if (slot === "weaponMain") return true;
    if (slot === "weaponOff") {
      return !item.weaponType.startsWith("twoHand") && item.weaponType !== "bow" && item.weaponType !== "crossbow";
    }
    return false;
  }

  const slots = item.equipmentSlots ?? [item.slot];
  if (slot === "ringLeft" || slot === "ringRight") return slots.includes("ring");
  if (slot === "weaponOff") return slots.includes("weaponOff") || item.slot === "weaponOff";
  return slots.includes(slot) || item.slot === slot;
}

export function suggestedSlotsForItem(item: GearItem): EquipmentSlotId[] {
  if (item.kind === "weapon") {
    const slots: EquipmentSlotId[] = ["weaponMain"];
    if (itemFitsEquipmentSlot(item, "weaponOff")) slots.push("weaponOff");
    return slots;
  }

  const slots: EquipmentSlotId[] = [];
  for (const raw of item.equipmentSlots ?? [item.slot]) {
    if (raw === "ring") {
      slots.push("ringLeft", "ringRight");
      continue;
    }
    if ((EQUIPMENT_SLOT_IDS as readonly string[]).includes(raw)) {
      slots.push(raw as EquipmentSlotId);
    }
  }
  return slots.length > 0 ? slots : ["body"];
}

export function sanitizeEquipment(
  game: GameData,
  equipment: Partial<Record<EquipmentSlotId, EquipmentSelection>> | undefined,
): Partial<Record<EquipmentSlotId, EquipmentSelection>> {
  const next: Partial<Record<EquipmentSlotId, EquipmentSelection>> = {};
  for (const slot of EQUIPMENT_SLOT_IDS) {
    const selection = equipment?.[slot];
    if (!selection?.itemId) continue;
    const item = getGearItem(game, selection.itemId);
    if (!item || !itemFitsEquipmentSlot(item, slot)) continue;
    const enchantId = selection.enchantId
      ? (getGearEnchantment(game, selection.enchantId)?.id ?? null)
      : (item.enchantId ?? null);
    next[slot] = {
      itemId: item.id,
      enchantId,
    };
  }
  return next;
}

export function sanitizeWishlist(
  game: GameData,
  wishlist: WishlistEntry[] | undefined,
): WishlistEntry[] {
  const seen = new Set<string>();
  const next: WishlistEntry[] = [];

  for (const entry of wishlist ?? []) {
    if (!entry?.id || (entry.kind !== "item" && entry.kind !== "enchant")) continue;
    const key = `${entry.kind}:${entry.id}`;
    if (seen.has(key)) continue;
    if (entry.kind === "item" && !getGearItem(game, entry.id)) continue;
    if (entry.kind === "enchant" && !getGearEnchantment(game, entry.id)) continue;
    seen.add(key);
    next.push({ kind: entry.kind, id: entry.id });
  }

  return next;
}

export function equipmentStatesEqual(
  a: Partial<Record<EquipmentSlotId, EquipmentSelection>> | undefined,
  b: Partial<Record<EquipmentSlotId, EquipmentSelection>> | undefined,
): boolean {
  const left = a ?? {};
  const right = b ?? {};
  for (const slot of EQUIPMENT_SLOT_IDS) {
    const leftSel = left[slot];
    const rightSel = right[slot];
    if (!leftSel && !rightSel) continue;
    if (!leftSel || !rightSel) return false;
    if (leftSel.itemId !== rightSel.itemId) return false;
    if ((leftSel.enchantId ?? null) !== (rightSel.enchantId ?? null)) return false;
  }
  return true;
}

export function wishlistStatesEqual(
  a: WishlistEntry[] | undefined,
  b: WishlistEntry[] | undefined,
): boolean {
  const left = a ?? [];
  const right = b ?? [];
  if (left.length !== right.length) return false;
  return left.every(
    (entry, index) => entry.kind === right[index]?.kind && entry.id === right[index]?.id,
  );
}
