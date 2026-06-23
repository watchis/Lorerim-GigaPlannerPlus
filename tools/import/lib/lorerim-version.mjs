import { execFileSync } from "node:child_process";
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

const LORERIM_NEXUS_MOD_ID = "112590";
const FINGERPRINT_ARCHIVE_PATTERN = new RegExp(
  `^LoreRim .+-${LORERIM_NEXUS_MOD_ID}-\\d+-\\d+-\\d+\\.(7z|zip)$`,
  "i",
);

export function parseNexusMetaFileId(metaText) {
  const match = String(metaText ?? "").match(/^fileID=(\d+)/m);
  return match?.[1] ?? null;
}

export function collectInstallFingerprints(installDir) {
  const downloadsDir = join(installDir, "downloads");
  if (!existsSync(downloadsDir)) {
    return { archiveNames: [], fileIds: [] };
  }

  const archiveNames = [];
  const fileIds = [];

  for (const entry of readdirSync(downloadsDir)) {
    if (!FINGERPRINT_ARCHIVE_PATTERN.test(entry)) {
      continue;
    }

    archiveNames.push(entry);

    const metaPath = join(downloadsDir, `${entry}.meta`);
    if (!existsSync(metaPath)) {
      continue;
    }

    const fileId = parseNexusMetaFileId(readFileSync(metaPath, "utf8"));
    if (fileId) {
      fileIds.push(fileId);
    }
  }

  return { archiveNames, fileIds };
}

export function scoreWabbajackMatch(modlist, fingerprints) {
  if (!fingerprints.archiveNames.length && !fingerprints.fileIds.length) {
    return 0;
  }

  let score = 0;
  for (const archive of modlist.Archives ?? []) {
    const archiveName = String(archive.Name ?? "");
    if (fingerprints.archiveNames.includes(archiveName)) {
      score += 1;
    }

    const fileId = parseNexusMetaFileId(archive.Meta);
    if (fileId && fingerprints.fileIds.includes(fileId)) {
      score += 2;
    }
  }

  return score;
}

export function readModlistFromWabbajack(wabbajackPath) {
  const tempDir = mkdtempSync(join(tmpdir(), "lorerim-wj-"));
  try {
    execFileSync("tar", ["-xf", wabbajackPath, "-C", tempDir, "modlist"], {
      stdio: "pipe",
    });
    return JSON.parse(readFileSync(join(tempDir, "modlist"), "utf8"));
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
}

function findWabbajackRoot(startDir) {
  let current = startDir;
  while (true) {
    if (existsSync(join(current, "Wabbajack.exe"))) {
      return current;
    }

    const parent = dirname(current);
    if (parent === current) {
      return null;
    }
    current = parent;
  }
}

export function findWabbajackCandidates(installDir) {
  const candidates = new Set();
  const installDownloads = join(installDir, "downloads");

  if (existsSync(installDownloads)) {
    for (const entry of readdirSync(installDownloads)) {
      if (/lorerim/i.test(entry) && entry.toLowerCase().endsWith(".wabbajack")) {
        candidates.add(join(installDownloads, entry));
      }
    }
  }

  const wabbajackRoot = findWabbajackRoot(installDir);
  if (wabbajackRoot) {
    for (const entry of readdirSync(wabbajackRoot)) {
      const downloadedLists = join(wabbajackRoot, entry, "downloaded_mod_lists");
      if (!existsSync(downloadedLists)) {
        continue;
      }

      for (const fileName of readdirSync(downloadedLists)) {
        if (/lorerim/i.test(fileName) && fileName.toLowerCase().endsWith(".wabbajack")) {
          candidates.add(join(downloadedLists, fileName));
        }
      }
    }
  }

  return [...candidates].sort((left, right) => {
    return statSync(right).mtimeMs - statSync(left).mtimeMs;
  });
}

function readCompilerSettingsVersion(installDir) {
  const settingsPath = join(installDir, "LoreRim.compiler_settings");
  if (!existsSync(settingsPath)) {
    return null;
  }

  try {
    const settings = JSON.parse(readFileSync(settingsPath, "utf8"));
    return typeof settings.Version === "string" ? settings.Version : null;
  } catch {
    return null;
  }
}

export function detectLorerimVersion(installDir) {
  const fingerprints = collectInstallFingerprints(installDir);
  const candidates = findWabbajackCandidates(installDir);
  let bestMatch = null;

  for (const wabbajackPath of candidates) {
    let modlist;
    try {
      modlist = readModlistFromWabbajack(wabbajackPath);
    } catch {
      continue;
    }

    const score = scoreWabbajackMatch(modlist, fingerprints);
    if (!modlist.Version || score <= 0) {
      continue;
    }

    if (!bestMatch || score > bestMatch.score) {
      bestMatch = {
        version: modlist.Version,
        source: "wabbajack",
        wabbajackPath,
        score,
      };
    }
  }

  if (bestMatch) {
    return bestMatch;
  }

  const compilerVersion = readCompilerSettingsVersion(installDir);
  if (compilerVersion) {
    return {
      version: compilerVersion,
      source: "compiler_settings",
    };
  }

  return {
    version: null,
    source: "unknown",
    fingerprintArchives: fingerprints.archiveNames.length,
    wabbajackCandidates: candidates.length,
  };
}
