import { defineCharacterOption } from "@/extension-api";

export default defineCharacterOption({
  id: "supernatural-vampire",
  getModifications({ choice, option, game }) {
    if (choice.id === option.defaultChoice) return [];

    const form = game.supernatural.vampirism.forms.find((entry) => entry.id === "vampire");
    if (!form?.effects.length) return [];

    return [
      {
        source: { labelKey: option.titleLabel },
        effects: form.effects,
      },
    ];
  },
});
