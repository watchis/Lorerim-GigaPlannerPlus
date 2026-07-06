import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const PLUGIN_EXTENSIONS = new Set([".esp", ".esm", ".esl"]);

function isPluginFile(filename) {
  const extension = filename.slice(filename.lastIndexOf(".")).toLowerCase();
  return PLUGIN_EXTENSIONS.has(extension);
}

function registerPluginsInDir(index, dir, modName) {
  if (!existsSync(dir)) return;

  for (const entry of readdirSync(dir)) {
    if (!isPluginFile(entry)) continue;
    index.set(entry.toLowerCase(), { path: join(dir, entry), modName });
  }
}

const STOCK_PLUGIN_DIRS = ["Stock Game/Data", "Stock Game"];

/** LoreRim patched plugin copies — always win over the same filename in upstream mods. */
const LORE_RIM_OUTPUT_MODS = ["LoreRim - Synthesis Output", "LoreRim - xEdit64 Output"];

function isLorerimOutputMod(modName) {
  return LORE_RIM_OUTPUT_MODS.includes(modName);
}

/** Build plugin path map: MO2 modlist priority, with LoreRim output mods winning conflicts. */
export function buildPluginSourceIndex(installDir, enabledMods) {
  const index = new Map();
  const enabled = new Set(enabledMods);

  for (const relativeDir of STOCK_PLUGIN_DIRS) {
    registerPluginsInDir(index, join(installDir, relativeDir), "Stock Game");
  }

  for (const modName of enabledMods) {
    if (isLorerimOutputMod(modName)) continue;
    const modRoot = join(installDir, "mods", modName);
    registerPluginsInDir(index, modRoot, modName);
    registerPluginsInDir(index, join(modRoot, "Data"), modName);
  }

  for (const modName of LORE_RIM_OUTPUT_MODS) {
    if (!enabled.has(modName)) continue;
    const modRoot = join(installDir, "mods", modName);
    registerPluginsInDir(index, modRoot, modName);
    registerPluginsInDir(index, join(modRoot, "Data"), modName);
  }

  return index;
}

export function resolveLorerimInstall(path) {
  if (!path) {
    throw new Error("LoreRim install path is required.");
  }
  const installDir = path;
  if (!existsSync(join(installDir, "ModOrganizer.exe"))) {
    throw new Error(
      `Not a LoreRim / MO2 install (ModOrganizer.exe missing): ${installDir}`,
    );
  }
  return installDir;
}

export function resolveActiveProfile(installDir) {
  const iniPath = join(installDir, "ModOrganizer.ini");
  const ini = readFileSync(iniPath, "utf8");
  const match = ini.match(/selected_profile=@ByteArray\(([^)]+)\)/);
  const profile = match?.[1] ?? "Default";
  const profileDir = join(installDir, "profiles", profile);
  if (!existsSync(profileDir)) {
    throw new Error(`MO2 profile not found: ${profileDir}`);
  }
  return { profile, profileDir };
}

export function readLoadOrder(profileDir) {
  const loadOrderPath = join(profileDir, "loadorder.txt");
  if (!existsSync(loadOrderPath)) {
    throw new Error(`loadorder.txt not found in ${profileDir}`);
  }

  return readFileSync(loadOrderPath, "utf8")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#"));
}

/**
 * Parse plugins.txt lines. Active plugins are prefixed with `*` and listed
 * top-to-bottom (low → high priority; later entries override earlier ones).
 */
export function parsePluginsTxtContent(content) {
  const enabled = [];

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;

    if (line.startsWith("*")) {
      const pluginName = line.slice(1).trim();
      if (pluginName) enabled.push(pluginName);
    }
  }

  return enabled;
}

export function readPluginsTxtFromPath(pluginsTxtPath) {
  if (!existsSync(pluginsTxtPath)) return null;
  return parsePluginsTxtContent(readFileSync(pluginsTxtPath, "utf8"));
}

/** Resolve plugin load order from MO2 profile loadorder.txt. */
export function resolvePluginLoadOrder(profileDir) {
  const sourcePath = join(profileDir, "loadorder.txt");
  return {
    loadOrder: readLoadOrder(profileDir),
    source: "loadorder.txt",
    sourcePath,
  };
}

/** Warn when MO2 loadorder.txt disagrees with the enabled plugins.txt order. */
export function compareLoadOrderSources(pluginsTxtOrder, loadOrderPath) {
  if (!existsSync(loadOrderPath)) return null;

  const loadOrder = readFileSync(loadOrderPath, "utf8")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#"));

  const pluginsLower = pluginsTxtOrder.map((name) => name.toLowerCase());
  const loadLower = loadOrder.map((name) => name.toLowerCase());

  if (pluginsLower.length !== loadLower.length) {
    return {
      kind: "count-mismatch",
      pluginsTxtCount: pluginsTxtOrder.length,
      loadOrderCount: loadOrder.length,
    };
  }

  for (let index = 0; index < pluginsLower.length; index++) {
    if (pluginsLower[index] !== loadLower[index]) {
      return {
        kind: "order-mismatch",
        index,
        pluginsTxt: pluginsTxtOrder[index],
        loadOrder: loadOrder[index],
      };
    }
  }

  return null;
}

/** Enabled mods in MO2 list order (top = lowest file priority, bottom = wins conflicts). */
export function readEnabledMods(profileDir) {
  const modlistPath = join(profileDir, "modlist.txt");
  if (!existsSync(modlistPath)) {
    throw new Error(`modlist.txt not found in ${profileDir}`);
  }

  const enabledMods = [];
  for (const line of readFileSync(modlistPath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    if (trimmed.startsWith("+")) {
      enabledMods.push(trimmed.slice(1));
    }
  }

  return enabledMods;
}

/** Resolve which on-disk file to read for a plugin. */
export function resolvePluginFile(pluginIndex, pluginName) {
  return pluginIndex.get(pluginName.toLowerCase()) ?? null;
}

export function resolvePluginPaths(loadOrder, installDir, enabledMods) {
  const pluginIndex = buildPluginSourceIndex(installDir, enabledMods);
  const resolved = [];
  const missing = [];

  for (const pluginName of loadOrder) {
    const hit = resolvePluginFile(pluginIndex, pluginName);
    if (!hit) {
      missing.push(pluginName);
      continue;
    }
    resolved.push({ pluginName, path: hit.path, modName: hit.modName });
  }

  if (missing.length > 0) {
    console.warn(`Warning: ${missing.length} plugins from load order were not found on disk.`);
  }

  return resolved;
}

export function summarizePluginSources(plugins) {
  const byMod = new Map();
  for (const plugin of plugins) {
    byMod.set(plugin.modName, (byMod.get(plugin.modName) ?? 0) + 1);
  }

  return [...byMod.entries()]
    .sort((left, right) => right[1] - left[1])
    .map(([modName, count]) => ({ modName, count }));
}

export function discoverInstall(installPath) {
  const installDir = resolveLorerimInstall(installPath);
  const { profile, profileDir } = resolveActiveProfile(installDir);
  const { loadOrder, source: loadOrderSource, sourcePath: loadOrderSourcePath } =
    resolvePluginLoadOrder(profileDir);
  const enabledMods = readEnabledMods(profileDir);
  const plugins = resolvePluginPaths(loadOrder, installDir, enabledMods);

  return {
    installDir,
    profile,
    profileDir,
    loadOrder,
    loadOrderSource,
    loadOrderSourcePath,
    enabledMods,
    plugins,
  };
}
