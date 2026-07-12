import { parseTraitBody } from "../lib/parse-trait-body.mjs";
import { collectTraitAbilitySpells } from "../lib/trait-ability-list.mjs";
import { cleanDescription, cleanName, slugify } from "../lib/transform-utils.mjs";
import { extractConditionalBonusDetails } from "../lib/parse-bonus-effects.mjs";
import { resolveEffects } from "../lib/effects/resolve-effects.mjs";

function resolveTraitText(spellRecord) {
  const name = cleanName(spellRecord.name);
  const id = slugify(name);
  const rawText = cleanDescription(spellRecord.description || "");
  if (!rawText) {
    return { id, name, description: "", bonus: "" };
  }

  const parsed = parseTraitBody(rawText);
  return { id, name, ...parsed };
}

export async function transformTraitRecords(spellRecords, install = null, plugins = [], scanContext = {}, derived = {}) {
  const traitSpells =
    install && plugins.length > 0
      ? await collectTraitAbilitySpells(
          plugins,
          install.installDir,
          install.enabledMods,
          spellRecords,
          {
            traitsFormList: scanContext.traitsFormList,
            mastersByPath: scanContext.mastersByPath,
          },
        )
      : spellRecords.filter(
          (record) =>
            /^(Traits_|LoreTraits_|LoreRim_)\w+Ab$/i.test(record.edid) && record.name,
        );

  const traits = [];

  for (const spell of traitSpells) {
    const { id, name, description, bonus } = resolveTraitText(spell);
    const effects = resolveEffects({
      bonusText: bonus,
      spellRecords: spell,
      mgefIndex: derived.mgefIndex ?? { byIdentity: new Map(), byEdid: new Map() },
      mastersByPath: scanContext.mastersByPath ?? new Map(),
      plugins,
    });

    traits.push({
      id,
      name,
      description,
      bonus,
      effects,
      bonusDetails: extractConditionalBonusDetails(bonus, effects),
    });
  }

  traits.sort((left, right) => left.name.localeCompare(right.name));
  return { traits };
}

export async function importTraits(context) {
  const traits = await transformTraitRecords(
    context.scan.spellRecords,
    context.install,
    context.plugins,
    {
      traitsFormList: context.scan.traitsFormList,
      mastersByPath: context.scan.mastersByPath,
    },
    context.derived,
  );

  return {
    files: [["traits.json", traits]],
    summary: {
      traits: traits.traits.length,
    },
  };
}
