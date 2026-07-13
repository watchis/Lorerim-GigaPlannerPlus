import { describe, expect, it } from "vitest";
import {
  buildItemsCatalog,
  equipmentStatesEqual,
  itemFitsEquipmentSlot,
  sanitizeEquipment,
  sanitizeWishlist,
  suggestedSlotsForItem,
} from "@/lib/gearLibrary";
import type { GearArmor, GearWeapon, ItemsIndex } from "@/data/schemas";

const index: ItemsIndex = {
  categories: ["weapons", "armor", "enchantments"],
  counts: {
    weapons: 1,
    armor: 1,
    enchantments: 1,
    staticWeapons: 0,
    staticArmor: 1,
  },
  slots: ["body", "weaponMain"],
  weaponTypes: ["oneHandSword"],
  armorTypes: ["heavy"],
};

const sword: GearWeapon = {
  id: "iron-sword",
  edid: "IronSword",
  name: "Iron Sword",
  kind: "weapon",
  weaponType: "oneHandSword",
  slot: "weaponMain",
  value: 25,
  weight: 9,
  damage: 7,
  enchantId: null,
  keywordIds: [],
  description: "",
  static: false,
  plugin: "Skyrim.esm",
};

const cuirass: GearArmor = {
  id: "iron-cuirass",
  edid: "ArmorIronCuirass",
  name: "Iron Armor",
  kind: "armor",
  armorType: "heavy",
  slot: "body",
  equipmentSlots: ["body"],
  value: 125,
  weight: 30,
  armorRating: 25,
  enchantId: "fortify-health",
  keywordIds: [],
  description: "",
  static: true,
  plugin: "Skyrim.esm",
};

describe("gearLibrary", () => {
  const catalog = buildItemsCatalog({
    index,
    weapons: [sword],
    armor: [cuirass],
    enchantments: [
      {
        id: "fortify-health",
        edid: "EnchArmorFortifyHealth",
        name: "Fortify Health",
        description: "",
        effects: [],
        plugin: "Skyrim.esm",
      },
    ],
  });
  const game = { items: catalog } as never;

  it("fits slots and suggests equipment targets", () => {
    expect(itemFitsEquipmentSlot(sword, "weaponMain")).toBe(true);
    expect(itemFitsEquipmentSlot(cuirass, "body")).toBe(true);
    expect(suggestedSlotsForItem(cuirass)).toEqual(["body"]);
  });

  it("sanitizes unknown equipment and wishlist ids", () => {
    expect(
      sanitizeEquipment(game, {
        body: { itemId: "iron-cuirass", enchantId: "fortify-health" },
        head: { itemId: "missing" },
      }),
    ).toEqual({
      body: { itemId: "iron-cuirass", enchantId: "fortify-health" },
    });

    expect(
      sanitizeWishlist(game, [
        { kind: "item", id: "iron-sword" },
        { kind: "enchant", id: "missing" },
        { kind: "item", id: "iron-sword" },
      ]),
    ).toEqual([{ kind: "item", id: "iron-sword" }]);
  });

  it("compares equipment maps", () => {
    expect(
      equipmentStatesEqual(
        { body: { itemId: "iron-cuirass", enchantId: null } },
        { body: { itemId: "iron-cuirass", enchantId: null } },
      ),
    ).toBe(true);
  });
});
