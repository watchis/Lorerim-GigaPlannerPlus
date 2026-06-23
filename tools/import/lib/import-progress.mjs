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

/**
 * Reporter for long-running import steps. Progress ticks go to stderr so stdout
 * stays clean for machine-readable output at the end.
 */
export function createImportReporter(options = {}) {
  const stream = options.stream ?? process.stderr;
  const interactive = options.interactive ?? isInteractive(stream);
  const logInterval = options.logInterval ?? 400;
  const importStarted = Date.now();

  function phase(title, index = null, total = null) {
    clearProgressLine(stream);
    const prefix =
      index != null && total != null ? `[${index}/${total}] ` : "";
    stream.write(`\n▶ ${prefix}${title}\n`);
  }

  function step(message) {
    clearProgressLine(stream);
    stream.write(`  ${message}\n`);
  }

  function pluginScan(label, total) {
    const started = Date.now();
    let current = 0;
    let lastNonInteractiveLog = 0;

    function tick(pluginName, detail = "") {
      current += 1;
      const ratio = total > 0 ? current / total : 1;
      const percent = Math.floor(ratio * 100);
      const suffix = detail ? ` — ${detail}` : "";
      const name = truncateEnd(pluginName, 42);

      if (interactive) {
        const bar = renderBar(ratio);
        const line = `  ${label} ${bar} ${formatCount(current)}/${formatCount(total)} (${percent}%) ${name}${suffix}`;
        const maxWidth = Math.max(40, (stream.columns ?? 100) - 1);
        stream.write(`\r${truncateEnd(line, maxWidth)}`);
        return;
      }

      if (
        current === 1 ||
        current === total ||
        current - lastNonInteractiveLog >= logInterval
      ) {
        lastNonInteractiveLog = current;
        stream.write(
          `  ${label}: ${formatCount(current)}/${formatCount(total)} (${percent}%) ${name}\n`,
        );
      }
    }

    function finish(detail = "") {
      const elapsed = formatDuration(Date.now() - started);
      clearProgressLine(stream);
      const summary = detail ? `${detail} in ${elapsed}` : `done in ${elapsed}`;
      stream.write(`  ✓ ${label}: ${formatCount(current)}/${formatCount(total)} plugins — ${summary}\n`);
    }

    return { tick, finish };
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

  return { phase, step, pluginScan, banner, elapsed, clearProgressLine };
}
