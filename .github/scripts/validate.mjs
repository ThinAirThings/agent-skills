#!/usr/bin/env node
// Validates that every skill folder has a well-formed SKILL.md and that the
// skills.sh.json registry and the skills/ directory are in sync (no drift).
import { readdirSync, readFileSync, statSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const skillsDir = join(root, "skills");
const errors = [];

// Minimal YAML frontmatter reader: pulls top-level `key: value` pairs.
function parseFrontmatter(md, file) {
  const m = md.match(/^---\n([\s\S]*?)\n---/);
  if (!m) {
    errors.push(`${file}: missing YAML frontmatter (--- ... ---)`);
    return {};
  }
  const fm = {};
  for (const line of m[1].split("\n")) {
    const kv = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (kv) fm[kv[1]] = kv[2].trim();
  }
  return fm;
}

// Collect skill folders.
const folders = existsSync(skillsDir)
  ? readdirSync(skillsDir).filter((n) => statSync(join(skillsDir, n)).isDirectory())
  : [];

for (const name of folders) {
  const skillFile = join(skillsDir, name, "SKILL.md");
  if (!existsSync(skillFile)) {
    errors.push(`skills/${name}: no SKILL.md`);
    continue;
  }
  const fm = parseFrontmatter(readFileSync(skillFile, "utf8"), `skills/${name}/SKILL.md`);
  if (!fm.name) errors.push(`skills/${name}/SKILL.md: frontmatter missing "name"`);
  else if (fm.name !== name)
    errors.push(`skills/${name}/SKILL.md: frontmatter name "${fm.name}" != folder "${name}"`);
  if (!fm.description) errors.push(`skills/${name}/SKILL.md: frontmatter missing "description"`);
}

// Cross-check the registry against the folders.
const registryPath = join(root, "skills.sh.json");
const registry = JSON.parse(readFileSync(registryPath, "utf8"));
const listed = new Set((registry.groupings ?? []).flatMap((g) => g.skills ?? []));

for (const name of listed)
  if (!folders.includes(name)) errors.push(`skills.sh.json lists "${name}" but skills/${name} does not exist`);
for (const name of folders)
  if (!listed.has(name)) errors.push(`skills/${name} exists but is not listed in skills.sh.json`);

if (errors.length) {
  console.error(`✗ ${errors.length} problem(s):\n` + errors.map((e) => `  - ${e}`).join("\n"));
  process.exit(1);
}
console.log(`✓ ${folders.length} skill(s) valid and in sync with skills.sh.json`);
