import { IMPORT_DOMAINS } from "./import-cli.mjs";
import { importPerks } from "../importers/perks.mjs";
import { importTraits } from "../importers/traits.mjs";
import { importRaces } from "../importers/races.mjs";
import { importBirthsigns } from "../importers/birthsigns.mjs";
import { importDeities } from "../importers/deities.mjs";
import { importManifest } from "../importers/manifest.mjs";

const DOMAIN_IMPORTERS = {
  perks: importPerks,
  traits: importTraits,
  races: importRaces,
  birthsigns: importBirthsigns,
  deities: importDeities,
  manifest: importManifest,
};

export function resolveDomainList(only = null) {
  if (!only || only.length === 0) return [...IMPORT_DOMAINS];
  return only;
}

/**
 * @param {import('./import-context.mjs').ImportContext} context
 * @param {string[]} domains
 * @param {import('./import-progress.mjs').ImportReporter} [progress]
 */
export async function runDomainImports(context, domains, progress = null) {
  const results = [];
  const track = progress?.track("Transform steps", domains.length);

  for (const domain of domains) {
    const importer = DOMAIN_IMPORTERS[domain];
    if (!importer) {
      throw new Error(`No importer registered for domain "${domain}"`);
    }

    track?.tick(domain);
    const result = await importer(context);
    results.push({ domain, ...result });
  }

  track?.finish(`${domains.length} data set(s) transformed`);
  return results;
}

export function buildAggregateSummary(context, domainResults, scanMeta = {}) {
  const summary = {
    installDir: context.install.installDir,
    profile: context.install.profile,
    perkRecords: context.scan.perkRecords.length,
    avifSkills: context.derived.avifMembership.identitiesBySkill.size,
    avifPerks: context.derived.avifMembership.allDisplayedIdentities.size,
    ...scanMeta,
  };

  for (const result of domainResults) {
    Object.assign(summary, result.summary);
  }

  if (summary.modpackVersion) {
    summary.version = summary.modpackVersion;
  }

  return summary;
}

export function reportDomainSummaries(domainResults, progress) {
  for (const result of domainResults) {
    switch (result.domain) {
      case "perks":
        progress.step(
          `Perk trees — ${result.summary.perkTrees} trees, ` +
            `${result.summary.importedPerks} perks` +
            (result.summary.addedPerks > 0 ? ` (+${result.summary.addedPerks} new)` : "") +
            (result.summary.removedPerks > 0 ? ` (−${result.summary.removedPerks} removed)` : "") +
            (result.summary.extensionBindingsApplied > 0
              ? ` (${result.summary.extensionBindingsApplied} extension-linked)`
              : ""),
        );
        for (const warning of result.summary.extensionBindingWarnings ?? []) {
          progress.step(`Warning: ${warning}`);
        }
        break;
      case "traits":
        progress.step(`Traits — ${result.summary.traits} entries`);
        break;
      case "races":
        progress.step(`Races — ${result.summary.races} playable races`);
        break;
      case "birthsigns":
        progress.step(`Birthsigns — ${result.summary.birthsigns} entries`);
        break;
      case "deities":
        progress.step(`Deities — ${result.summary.deities} entries`);
        break;
      case "manifest": {
        const { modpackVersion, previousVersion } = result.summary;
        if (modpackVersion && modpackVersion !== previousVersion) {
          progress.step(
            `Modpack version: ${modpackVersion}` +
              (previousVersion ? ` (was ${previousVersion})` : ""),
          );
        } else if (modpackVersion) {
          progress.step(`Modpack version: ${modpackVersion}`);
        } else {
          progress.step("Warning: could not detect modpack version; manifest version unchanged.");
        }
        break;
      }
      default:
        break;
    }
  }
}
