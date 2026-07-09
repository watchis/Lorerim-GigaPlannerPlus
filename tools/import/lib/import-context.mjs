import { join } from "node:path";
import { collectImportPluginData } from "./esp-reader.mjs";
import { buildIdentityToPerkName } from "./avif-perk-tree.mjs";
import { buildAvifMembershipIndex } from "./avif-perk-membership.mjs";
import { buildPerkMetadataIndex } from "./perk-tree-metadata.mjs";
import { formatCount } from "./import-progress.mjs";
import { resolveImportPaths } from "./import-cli.mjs";

/**
 * @param {object} params
 * @param {import('./lorerim-install.mjs').LorerimInstall} params.install
 * @param {Array} params.plugins Filtered plugin list to scan
 * @param {import('./import-progress.mjs').ImportReporter | null} [params.progress]
 */
export async function buildImportContext({ install, plugins, progress = null }) {
  const paths = resolveImportPaths();

  progress?.phase("Scanning plugin records", 2, 5);
  const scan = await collectImportPluginData(plugins, progress);

  progress?.activity("Building perk metadata index…");
  const avifMembership = buildAvifMembershipIndex(
    scan.avifTrees,
    buildIdentityToPerkName(scan.perkRecords),
  );
  const perkMetadataIndex = buildPerkMetadataIndex(
    scan.perkRecords,
    scan.avifTrees,
    avifMembership,
  );

  progress?.step(
    `Indexed perks — ${formatCount(scan.perkRecords.length)} PERK records, ` +
      `${formatCount(avifMembership.allDisplayedIdentities.size)} AVIF-displayed perks`,
  );

  return {
    install,
    plugins,
    scan,
    derived: {
      perkMetadataIndex,
      avifMembership,
    },
    paths: {
      ...paths,
      racesPath: join(paths.dataDir, "races.json"),
      birthsignsPath: join(paths.dataDir, "birthsigns.json"),
      deitiesPath: join(paths.dataDir, "deities.json"),
      supernaturalPath: join(paths.dataDir, "supernatural.json"),
      manifestPath: join(paths.dataDir, "manifest.json"),
    },
  };
}
