import assert from "node:assert/strict";
import { parseFlmTraitAbilityAdditions } from "./trait-ability-list.mjs";

const sampleFlm = `
; LoreRim Traits
FormList = Traits_AbilityList|LoreTraits_PhalanxAb
FormList = Traits_EffectsList|LoreTraits_Phalanx

FormList = Traits_AbilityList|LoreTraits_WizardsWardrobeAb
FormList = Traits_AbilityList|Traits_AddictAb
`;

assert.deepEqual(parseFlmTraitAbilityAdditions(sampleFlm), [
  "LoreTraits_PhalanxAb",
  "LoreTraits_WizardsWardrobeAb",
  "Traits_AddictAb",
]);

console.log("trait-ability-list: ok");
