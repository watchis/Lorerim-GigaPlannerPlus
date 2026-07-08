import { definePerk } from "@/extension-api";

export default definePerk({
  id: "enchanting-artifact-enchanter",
  allocation: { kind: "perkPointsBudget", totalLabel: "infinity" },
  getModifications({ perk, isSelected }) {
    if (!isSelected) return [];

    return [
      {
        source: { name: perk.name },
        plannerNotes: [
          "Enchant one item at 2× strength",
          "Place up to 3 enchantments at 50% strength each",
        ],
      },
    ];
  },
});
