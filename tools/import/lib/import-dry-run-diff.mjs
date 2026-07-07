import { existsSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";

const DEFAULT_CONTEXT_LINES = 3;
const MAX_HUNK_LINES = 14;

export function serializePlannerJson(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function readFileContent(filePath) {
  if (!existsSync(filePath)) return null;
  return readFileSync(filePath, "utf8");
}

function splitLines(text) {
  if (text == null || text === "") return [];
  const normalized = text.endsWith("\n") ? text.slice(0, -1) : text;
  if (normalized === "") return [];
  return normalized.split("\n");
}

function computeLcsMatrix(oldLines, newLines) {
  const rows = oldLines.length + 1;
  const cols = newLines.length + 1;
  const matrix = Array.from({ length: rows }, () => Array(cols).fill(0));

  for (let row = 1; row < rows; row++) {
    for (let col = 1; col < cols; col++) {
      if (oldLines[row - 1] === newLines[col - 1]) {
        matrix[row][col] = matrix[row - 1][col - 1] + 1;
      } else {
        matrix[row][col] = Math.max(matrix[row - 1][col], matrix[row][col - 1]);
      }
    }
  }

  return matrix;
}

function buildDiffOps(oldLines, newLines) {
  const matrix = computeLcsMatrix(oldLines, newLines);
  const ops = [];
  let row = oldLines.length;
  let col = newLines.length;

  while (row > 0 || col > 0) {
    if (row > 0 && col > 0 && oldLines[row - 1] === newLines[col - 1]) {
      ops.push({ type: "context", line: oldLines[row - 1] });
      row -= 1;
      col -= 1;
      continue;
    }

    if (col > 0 && (row === 0 || matrix[row][col - 1] >= matrix[row - 1][col])) {
      ops.push({ type: "add", line: newLines[col - 1] });
      col -= 1;
      continue;
    }

    ops.push({ type: "remove", line: oldLines[row - 1] });
    row -= 1;
  }

  ops.reverse();
  return ops;
}

export function buildHunkWindows(ops, contextLines = DEFAULT_CONTEXT_LINES) {
  const changeIndices = ops
    .map((op, index) => (op.type === "context" ? -1 : index))
    .filter((index) => index >= 0);

  if (changeIndices.length === 0) return [];

  const windows = changeIndices.map((index) => [
    Math.max(0, index - contextLines),
    Math.min(ops.length - 1, index + contextLines),
  ]);

  windows.sort((left, right) => left[0] - right[0]);
  const merged = [windows[0]];

  for (let index = 1; index < windows.length; index++) {
    const previous = merged[merged.length - 1];
    const current = windows[index];
    if (current[0] <= previous[1] + 1) {
      previous[1] = Math.max(previous[1], current[1]);
    } else {
      merged.push(current);
    }
  }

  return merged;
}

function formatOpLine(op) {
  if (op.type === "context") return ` ${op.line}`;
  if (op.type === "remove") return `-${op.line}`;
  return `+${op.line}`;
}

export function formatHunkLines(ops, start, end) {
  const lines = [];
  for (let index = start; index <= end; index++) {
    lines.push(formatOpLine(ops[index]));
  }
  return truncateLongHunk(lines);
}

function truncateLongHunk(lines) {
  if (lines.length <= MAX_HUNK_LINES) return lines;

  const leadingContext = Math.min(DEFAULT_CONTEXT_LINES, lines.length);
  const trailingContext = Math.min(DEFAULT_CONTEXT_LINES, lines.length - leadingContext);
  const head = lines.slice(0, leadingContext + 4);
  const tail = lines.slice(-trailingContext);

  if (head.length + tail.length + 1 >= lines.length) return lines;
  return [...head, "...", ...tail];
}

export function formatUnifiedDiff(
  oldPath,
  newPath,
  oldContent,
  newContent,
  options = {},
) {
  if (oldContent === newContent) return null;

  const contextLines = options.contextLines ?? DEFAULT_CONTEXT_LINES;
  const oldLines = splitLines(oldContent);
  const newLines = splitLines(newContent);
  const ops = buildDiffOps(oldLines, newLines);
  const windows = buildHunkWindows(ops, contextLines);
  if (windows.length === 0) return null;

  const oldLabel = oldContent == null ? "/dev/null" : `a/${oldPath}`;
  const newLabel = newContent == null ? "/dev/null" : `b/${newPath}`;
  const lines = [
    `diff --git a/${oldPath} b/${newPath}`,
    `--- ${oldLabel}`,
    `+++ ${newLabel}`,
  ];

  const hunkBodies = windows.map(([start, end]) => formatHunkLines(ops, start, end));
  for (let index = 0; index < hunkBodies.length; index++) {
    if (index > 0) lines.push("...");
    lines.push(...hunkBodies[index]);
  }

  return `${lines.join("\n")}\n`;
}

export function resolvePlannerOutputPath(relativePath, dataDir, perksDir) {
  return relativePath.startsWith("perks/")
    ? join(perksDir, relativePath.slice("perks/".length))
    : join(dataDir, relativePath);
}

export function toRepoRelativePath(filePath, repoRoot) {
  return relative(repoRoot, filePath).split("\\").join("/");
}

export function formatDryRunDiff({
  filesToWrite,
  staleFiles = [],
  dataDir,
  perksDir,
  repoRoot,
  contextLines = DEFAULT_CONTEXT_LINES,
}) {
  const sections = [];

  for (const [relativePath, payload] of filesToWrite) {
    const absolutePath = resolvePlannerOutputPath(relativePath, dataDir, perksDir);
    const repoPath = toRepoRelativePath(absolutePath, repoRoot);
    const nextContent = serializePlannerJson(payload);
    const currentContent = readFileContent(absolutePath);
    const section = formatUnifiedDiff(repoPath, repoPath, currentContent, nextContent, {
      contextLines,
    });
    if (section) sections.push(section.trimEnd());
  }

  for (const filename of staleFiles) {
    const absolutePath = join(perksDir, filename);
    const repoPath = toRepoRelativePath(absolutePath, repoRoot);
    const currentContent = readFileContent(absolutePath);
    if (currentContent == null) continue;
    const section = formatUnifiedDiff(repoPath, repoPath, currentContent, null, {
      contextLines,
    });
    if (section) sections.push(section.trimEnd());
  }

  if (sections.length === 0) return "";
  return `${sections.join("\n")}\n`;
}

export function countDiffFiles(diffText) {
  if (!diffText) return 0;
  return (diffText.match(/^diff --git /gm) ?? []).length;
}
