import { defineCharacterOption } from "@/extension-api";

export default defineCharacterOption({
  id: "supernatural-werewolf",
  getModifications({ choice, option, game }) {
    if (choice.id === option.defaultChoice) return [];

    const form = game.supernatural.lycanthropy.forms.find((entry) => entry.id === "werewolf");
    if (!form?.effects.length) return [];

    return [
      {
        source: { labelKey: option.titleLabel },
        effects: form.effects,
      },
    ];
  },
});
