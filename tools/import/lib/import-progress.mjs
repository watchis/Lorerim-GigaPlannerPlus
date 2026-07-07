const DEFAULT_BAR_WIDTH = 28;

export function formatDuration(ms) {
  if (ms < 1000) return `${ms}ms`;
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return remainder > 0 ? `${minutes}m ${remainder}s` : `${minutes}m`;
}

export function formatCount(value) {
  return value.toLocaleString("en-US");
}

function truncateEnd(text, maxLen) {
  const value = String(text ?? "");
  if (value.length <= maxLen) return value;
  if (maxLen <= 1) return "…";
  return `…${value.slice(-(maxLen - 1))}`;
}

function formatTrackLine(label, bar, current, total, percent, detail, maxWidth) {
  const prefix = `  ${label} ${bar} ${formatCount(current)}/${formatCount(total)} (${percent}%)`;
  if (!detail) return truncateEnd(prefix, maxWidth);

  const separator = " — ";
  const maxDetailLen = Math.max(8, maxWidth - prefix.length - separator.length);
  if (maxDetailLen <= 8) return truncateEnd(prefix, maxWidth);

  const clippedDetail = truncateEnd(detail, maxDetailLen);
  return prefix + separator + clippedDetail;
}

function renderBar(ratio, width = DEFAULT_BAR_WIDTH) {
  const clamped = Math.max(0, Math.min(1, ratio));
  const filled = Math.round(clamped * width);
  return `[${"=".repeat(filled)}${" ".repeat(width - filled)}]`;
}

function isInteractive(stream = process.stderr) {
  return stream.isTTY === true;
}

function clearProgressLine(stream = process.stderr) {
  if (!isInteractive(stream)) return;
  stream.write("\r\x1b[2K");
}

export function formatImportSummary(summary, { elapsed, dryRun = false } = {}) {
  const lines = [
    dryRun
      ? `Dry run complete in ${elapsed} (no files written)`
      : `Import complete in ${elapsed}`,
    `Install: ${summary.installDir}`,
    `MO2 profile: ${summary.profile}`,
    `Plugins in load order: ${formatCount(summary.pluginsInLoadOrder)}`,
  ];

  if (summary.pluginsSkippedNonMechanics > 0) {
    lines.push(
      `Plugins skipped (asset-only): ${formatCount(summary.pluginsSkippedNonMechanics)}`,
    );
  }

  lines.push(
    `Plugins scanned: ${formatCount(summary.pluginsScanned)}`,
    `Perk records: ${formatCount(summary.perkRecords)}`,
    `Perk trees: ${formatCount(summary.perkTrees)}`,
    `Imported perks: ${formatCount(summary.importedPerks)}`,
  );

  if (summary.addedPerks > 0) {
    lines.push(`New perks: ${formatCount(summary.addedPerks)}`);
  }
  if (summary.removedPerks > 0) {
    lines.push(`Removed perks: ${formatCount(summary.removedPerks)}`);
  }

  lines.push(
    `AVIF skills: ${formatCount(summary.avifSkills)}`,
    `AVIF-displayed perks: ${formatCount(summary.avifPerks)}`,
    `Traits: ${formatCount(summary.traits)}`,
    `Races: ${formatCount(summary.races)}`,
    `Birthsigns: ${formatCount(summary.birthsigns)}`,
    `Deities: ${formatCount(summary.deities)}`,
  );

  if (summary.modpackVersion) {
    lines.push(`Modpack version: ${summary.modpackVersion}`);
  }

  return lines;
}

export function printImportSummary(progress, summary, options = {}) {
  const lines = formatImportSummary(summary, options);
  progress.step("");
  for (const line of lines) {
    progress.step(line);
  }
}

/**
 * Reporter for long-running import steps. Progress ticks go to stderr so stdout
 * stays clean for machine-readable output at the end.
 */
export function createImportReporter(options = {}) {
  const stream = options.stream ?? process.stderr;
  const interactive = options.interactive ?? isInteractive(stream);
  const updateIntervalMs = options.updateIntervalMs ?? 250;
  const importStarted = Date.now();
  let lastActivityWrite = 0;

  function writeProgressLine(line, { forceNewline = false } = {}) {
    const maxWidth = Math.max(40, (stream.columns ?? 100) - 1);
    const clipped = truncateEnd(line, maxWidth);

    if (interactive && !forceNewline) {
      clearProgressLine(stream);
      stream.write(clipped);
      return;
    }

    const now = Date.now();
    if (forceNewline || now - lastActivityWrite >= updateIntervalMs) {
      lastActivityWrite = now;
      stream.write(`${clipped}\n`);
    }
  }

  function phase(title, index = null, total = null) {
    if (activeLiveBlock) {
      clearLiveBlock(activeLiveBlock);
      activeLiveBlock = null;
    }
    clearProgressLine(stream);
    const prefix =
      index != null && total != null ? `[${index}/${total}] ` : "";
    stream.write(`\n▶ ${prefix}${title}\n`);
  }

  function step(message) {
    if (activeLiveBlock) {
      clearLiveBlock(activeLiveBlock);
      activeLiveBlock = null;
    }
    clearProgressLine(stream);
    stream.write(`  ${message}\n`);
  }

  /** Ephemeral status line — overwritten by the next activity or track tick. */
  function activity(message) {
    writeProgressLine(`  ${message}`);
  }

  function clearLiveBlock(block) {
    if (!interactive || !block || block.liveBlockLines <= 0) return;
    stream.write(`\x1b[${block.liveBlockLines}A`);
    for (let index = 0; index < block.liveBlockLines; index++) {
      stream.write("\x1b[2K\n");
    }
    stream.write(`\x1b[${block.liveBlockLines}A`);
    block.liveBlockLines = 0;
  }

  let activeLiveBlock = null;

  function track(label, total) {
    const started = Date.now();
    let current = 0;
    let lastWrite = 0;

    function tick(detail = "") {
      current += 1;
      const ratio = total > 0 ? current / total : 1;
      const percent = Math.floor(ratio * 100);
      const bar = renderBar(ratio);
      const maxWidth = Math.max(40, (stream.columns ?? 100) - 1);
      const line = formatTrackLine(label, bar, current, total, percent, detail, maxWidth);

      const now = Date.now();
      const isComplete = current >= total;
      const shouldWrite =
        interactive ||
        current === 1 ||
        isComplete ||
        now - lastWrite >= updateIntervalMs;

      if (shouldWrite) {
        lastWrite = now;
        writeProgressLine(line, { forceNewline: !interactive && isComplete });
      }
    }

    function finish(detail = "") {
      const elapsed = formatDuration(Date.now() - started);
      clearProgressLine(stream);
      const summary = detail ? `${detail} in ${elapsed}` : `done in ${elapsed}`;
      stream.write(
        `  ✓ ${label}: ${formatCount(current)}/${formatCount(total)} — ${summary}\n`,
      );
    }

    return { tick, finish };
  }

  function trackParallel(label, total, workerCount) {
    const started = Date.now();
    let current = 0;
    let lastWrite = 0;
    const workers = Math.max(1, workerCount);
    const workerStatus = new Map();
    const block = { liveBlockLines: 0 };

    function formatWorkerLines(maxWidth) {
      const lines = [];
      for (let workerId = 0; workerId < workers; workerId++) {
        const detail = workerStatus.get(workerId) ?? "idle";
        lines.push(truncateEnd(`    worker ${workerId + 1}: ${detail}`, maxWidth));
      }
      return lines;
    }

    function renderOverallDetail(detail = "") {
      const maxWidth = Math.max(40, (stream.columns ?? 100) - 1);
      const ratio = total > 0 ? current / total : 1;
      const percent = Math.floor(ratio * 100);
      const bar = renderBar(ratio);
      return formatTrackLine(label, bar, current, total, percent, detail, maxWidth);
    }

    function render(detail = "") {
      const now = Date.now();
      const isComplete = current >= total;
      const shouldWrite =
        interactive ||
        current === 0 ||
        isComplete ||
        now - lastWrite >= updateIntervalMs;
      if (!shouldWrite) return;
      lastWrite = now;

      const overallLine = renderOverallDetail(detail);

      if (!interactive) {
        writeProgressLine(overallLine, { forceNewline: isComplete });
        return;
      }

      const workerLines = formatWorkerLines(Math.max(40, (stream.columns ?? 100) - 1));
      const allLines = [overallLine, ...workerLines];

      if (block.liveBlockLines > 0) {
        stream.write(`\x1b[${block.liveBlockLines}A`);
      }

      for (const line of allLines) {
        stream.write(`\x1b[2K${line}\n`);
      }

      block.liveBlockLines = allLines.length;
      stream.write(`\x1b[${block.liveBlockLines}A`);
    }

    function workerStart(workerId, detail = "") {
      workerStatus.set(workerId, detail);
      render();
    }

    function workerEnd(workerId, detail = "") {
      workerStatus.delete(workerId);
      current += 1;
      render(detail);
    }

    function tick(detail = "") {
      current += 1;
      render(detail);
    }

    function clear() {
      clearLiveBlock(block);
      workerStatus.clear();
    }

    function finish(detail = "") {
      clear();
      activeLiveBlock = null;
      const elapsed = formatDuration(Date.now() - started);
      const summary = detail ? `${detail} in ${elapsed}` : `done in ${elapsed}`;
      stream.write(
        `  ✓ ${label}: ${formatCount(current)}/${formatCount(total)} — ${summary}\n`,
      );
    }

    activeLiveBlock = block;
    return { workerStart, workerEnd, tick, finish, clear };
  }

  /** @deprecated Use `track` — kept for existing call sites during migration. */
  function pluginScan(label, total) {
    return track(label, total);
  }

  function pluginScanParallel(label, total, workerCount) {
    return trackParallel(label, total, workerCount);
  }

  function banner(lines) {
    clearProgressLine(stream);
    stream.write("\n");
    for (const line of lines) {
      stream.write(`${line}\n`);
    }
    stream.write("\n");
  }

  function elapsed() {
    return formatDuration(Date.now() - importStarted);
  }

  return {
    phase,
    step,
    activity,
    track,
    trackParallel,
    pluginScan,
    pluginScanParallel,
    banner,
    elapsed,
    clearProgressLine,
  };
}
