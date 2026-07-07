import { existsSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";

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

function countHunkLines(ops) {
  let oldCount = 0;
  let newCount = 0;

  for (const op of ops) {
    if (op.type === "context" || op.type === "remove") oldCount += 1;
    if (op.type === "context" || op.type === "add") newCount += 1;
  }

  return { oldCount, newCount };
}

export function formatUnifiedDiff(oldPath, newPath, oldContent, newContent) {
  if (oldContent === newContent) return null;

  const oldLines = splitLines(oldContent);
  const newLines = splitLines(newContent);
  const ops = buildDiffOps(oldLines, newLines);
  const { oldCount, newCount } = countHunkLines(ops);
  const oldStart = oldCount === 0 ? 0 : 1;
  const newStart = newCount === 0 ? 0 : 1;

  const oldLabel = oldContent == null ? "/dev/null" : `a/${oldPath}`;
  const newLabel = newContent == null ? "/dev/null" : `b/${newPath}`;
  const lines = [
    `diff --git a/${oldPath} b/${newPath}`,
    `--- ${oldLabel}`,
    `+++ ${newLabel}`,
    `@@ -${oldStart},${oldCount} +${newStart},${newCount} @@`,
  ];

  for (const op of ops) {
    if (op.type === "context") lines.push(` ${op.line}`);
    if (op.type === "remove") lines.push(`-${op.line}`);
    if (op.type === "add") lines.push(`+${op.line}`);
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
}) {
  const sections = [];

  for (const [relativePath, payload] of filesToWrite) {
    const absolutePath = resolvePlannerOutputPath(relativePath, dataDir, perksDir);
    const repoPath = toRepoRelativePath(absolutePath, repoRoot);
    const nextContent = serializePlannerJson(payload);
    const currentContent = readFileContent(absolutePath);
    const section = formatUnifiedDiff(repoPath, repoPath, currentContent, nextContent);
    if (section) sections.push(section.trimEnd());
  }

  for (const filename of staleFiles) {
    const absolutePath = join(perksDir, filename);
    const repoPath = toRepoRelativePath(absolutePath, repoRoot);
    const currentContent = readFileContent(absolutePath);
    if (currentContent == null) continue;
    const section = formatUnifiedDiff(repoPath, repoPath, currentContent, null);
    if (section) sections.push(section.trimEnd());
  }

  if (sections.length === 0) return "";
  return `${sections.join("\n")}\n`;
}

export function countDiffFiles(diffText) {
  if (!diffText) return 0;
  return (diffText.match(/^diff --git /gm) ?? []).length;
}
