import { definePerk } from "@/extension-api";

export default definePerk({
  id: "enchanting-artifact-enchanter",
  allocation: { kind: "perkPointsBudget", totalLabel: "infinity" },
  getModifications() {
    return [];
  },
});
