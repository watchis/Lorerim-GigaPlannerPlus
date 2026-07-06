import { existsSync, readFileSync, statSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { classifyPluginMechanics } from "./plugin-classifier.mjs";
import { formatCount } from "./import-progress.mjs";
import { mapConcurrent } from "./plugin-io.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DEFAULT_CACHE_PATH = join(__dirname, "..", "cache", "non-mechanics-plugins.json");

const DEFAULT_CLASSIFY_CONCURRENCY =
  Number(process.env.IMPORT_CLASSIFY_CONCURRENCY) > 0
    ? Number(process.env.IMPORT_CLASSIFY_CONCURRENCY)
    : 16;

function pluginStats(path) {
  const stat = statSync(path);
  return { size: stat.size, mtimeMs: stat.mtimeMs };
}

function statsMatch(cached, current) {
  return cached.size === current.size && cached.mtimeMs === current.mtimeMs;
}

export function defaultSkipCachePath() {
  return DEFAULT_CACHE_PATH;
}

export function loadSkipCache(cachePath = DEFAULT_CACHE_PATH) {
  if (!existsSync(cachePath)) {
    return { version: 1, plugins: {} };
  }

  try {
    const parsed = JSON.parse(readFileSync(cachePath, "utf8"));
    if (!parsed || typeof parsed !== "object" || !parsed.plugins) {
      return { version: 1, plugins: {} };
    }
    return parsed;
  } catch {
    return { version: 1, plugins: {} };
  }
}

export function saveSkipCache(cache, cachePath = DEFAULT_CACHE_PATH) {
  mkdirSync(dirname(cachePath), { recursive: true });
  writeFileSync(cachePath, `${JSON.stringify(cache, null, 2)}\n`);
}

function cacheKey(pluginName) {
  return pluginName.toLowerCase();
}

/**
 * Decide which plugins need a full mechanics scan. Non-mechanics plugins are
 * recorded in the skip cache (keyed by filename + size/mtime) for later runs.
 */
export async function filterPluginsForImport(plugins, options = {}) {
  const {
    cachePath = DEFAULT_CACHE_PATH,
    rescanAll = false,
    progress = null,
    concurrency = DEFAULT_CLASSIFY_CONCURRENCY,
    classifyFn = classifyPluginMechanics,
  } = options;

  const cache = rescanAll ? { version: 1, plugins: {} } : loadSkipCache(cachePath);
  const toScan = [];
  const skipped = [];
  const classify = classifyFn;
  const classifyProgress = progress?.pluginScan?.("Classifying plugins", plugins.length);

  const candidates = [];
  for (const plugin of plugins) {
    const key = cacheKey(plugin.pluginName);
    const cached = cache.plugins[key];

    if (!rescanAll && cached) {
      try {
        const current = pluginStats(plugin.path);
        if (statsMatch(cached, current)) {
          skipped.push({ ...plugin, reason: "cached-non-mechanics" });
          classifyProgress?.tick(plugin.pluginName, "cached skip");
          continue;
        }
      } catch {
        // File missing or unreadable — fall through to classify.
      }
    }

    candidates.push(plugin);
  }

  const classifications = await mapConcurrent(candidates, concurrency, async (plugin) => {
    const mechanics = await classify(plugin.path);
    return { plugin, mechanics };
  });

  for (const { plugin, mechanics } of classifications) {
    const key = cacheKey(plugin.pluginName);

    if (!mechanics.hasMechanics) {
      cache.plugins[key] = {
        pluginName: plugin.pluginName,
        ...pluginStats(plugin.path),
        classifiedAt: new Date().toISOString(),
      };
      skipped.push({ ...plugin, reason: "non-mechanics" });
      classifyProgress?.tick(plugin.pluginName, "no mechanics records");
      continue;
    }

    delete cache.plugins[key];
    toScan.push(plugin);
    classifyProgress?.tick(
      plugin.pluginName,
      mechanics.recordTypes.length > 0 ? mechanics.recordTypes.join(", ") : "",
    );
  }

  saveSkipCache(cache, cachePath);
  classifyProgress?.finish(
    `${formatCount(toScan.length)} to scan, ${formatCount(skipped.length)} skipped`,
  );

  return { toScan, skipped, cachePath };
}
