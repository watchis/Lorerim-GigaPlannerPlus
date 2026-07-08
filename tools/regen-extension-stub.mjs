#!/usr/bin/env node
import { mkdirSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";

function parseArgs(argv) {
  let type = "perk";
  let id = "";

  for (let index = 0; index < argv.length; index++) {
    const arg = argv[index];
    if (arg === "--type") {
      type = argv[++index];
      continue;
    }
    if (!id) {
      id = arg;
    }
  }

  if (!id) {
    console.error("Usage: npm run regen:extension-stub -- --type perk|character-option <id>");
    process.exit(1);
  }

  if (type !== "perk" && type !== "character-option") {
    console.error('type must be "perk" or "character-option"');
    process.exit(1);
  }

  return { type, id };
}

const { type, id } = parseArgs(process.argv.slice(2));
const folder = type === "perk" ? "perks" : "character-options";
const dir = join("extensions", folder);
const filePath = join(dir, `${id}.ts`);
const testPath = join(dir, `${id}.test.ts`);

if (existsSync(filePath)) {
  console.error(`Extension already exists: ${filePath}`);
  process.exit(1);
}

mkdirSync(dir, { recursive: true });

const defineFn = type === "perk" ? "definePerk" : "defineCharacterOption";
const body =
  type === "perk"
    ? `import { ${defineFn} } from "@/extension-api";

export default ${defineFn}({
  id: "${id}",
  getModifications({ perk, isSelected }) {
    if (!isSelected) return [];
    return [{ source: { name: perk.name }, plannerNotes: ["TODO: implement ${id}"] }];
  },
});
`
    : `import { ${defineFn} } from "@/extension-api";

export default ${defineFn}({
  id: "${id}",
  getModifications({ choice, option }) {
    if (choice.id === option.defaultChoice) return [];
    return [{ source: { labelKey: option.titleLabel }, plannerNotes: ["TODO: implement ${id}"] }];
  },
});
`;

const testBody =
  type === "perk"
    ? `import { describe, expect, it } from "vitest";
import extension from "./${id}";

describe("${id} extension", () => {
  it("is registered with the expected id", () => {
    expect(extension.id).toBe("${id}");
  });
});
`
    : `import { describe, expect, it } from "vitest";
import extension from "./${id}";

describe("${id} extension", () => {
  it("is registered with the expected id", () => {
    expect(extension.id).toBe("${id}");
  });
});
`;

writeFileSync(filePath, body);
writeFileSync(testPath, testBody);
console.log(`Created ${filePath} and ${testPath}`);
