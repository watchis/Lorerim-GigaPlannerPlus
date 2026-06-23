import assert from "node:assert/strict";
import {
  collectInstallFingerprints,
  parseNexusMetaFileId,
  scoreWabbajackMatch,
} from "./lorerim-version.mjs";

assert.equal(parseNexusMetaFileId("[General]\nfileID=756268\n"), "756268");
assert.equal(parseNexusMetaFileId(""), null);

const modlist = {
  Version: "5.0.3.2",
  Archives: [
    {
      Name: "LoreRim - DynDOLOD Output-112590-5-0-1779751632.7z",
      Meta: "[General]\nmodID=112590\nfileID=756268",
    },
  ],
};

const fingerprints = {
  archiveNames: ["LoreRim - DynDOLOD Output-112590-5-0-1779751632.7z"],
  fileIds: ["756268"],
};

assert.equal(scoreWabbajackMatch(modlist, fingerprints), 3);
assert.equal(scoreWabbajackMatch(modlist, { archiveNames: [], fileIds: [] }), 0);

const installDir = process.env.LORERIM_INSTALL;
if (installDir) {
  const detected = collectInstallFingerprints(installDir);
  assert.ok(detected.archiveNames.length > 0 || detected.fileIds.length > 0);
}

console.log("lorerim-version tests passed");
