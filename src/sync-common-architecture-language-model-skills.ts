/**
 * sync-common-architecture-language-model-skills.ts — Sync common-architecture-language-model skills from upstream repository.
 *
 * Source:
 *   https://github.com/finos/architecture-as-code calm-ai/tools/ (main)
 *
 * The upstream calm-ai directory stores individual prompt files under
 * `calm-ai/tools/*.md`. These are plain markdown (a leading "# Title" heading,
 * no YAML front matter) and are NOT structured as Agent Plugin skills.
 *
 * This script transforms each `tools/<name>.md` into a portable skill:
 *   plugins/common-architecture-language-model/skills/<name>/SKILL.md
 * with generated YAML front matter (`name` + `description`) prepended to the
 * upstream prompt body. The body is preserved verbatim so future upstream
 * changes are detected and re-synced.
 *
 * Skills unique to this repo are preserved and never overwritten.
 *
 * Usage:
 *   tsx src/sync-common-architecture-language-model-skills.ts                  # sync all
 *   tsx src/sync-common-architecture-language-model-skills.ts --dry-run        # preview
 *   tsx src/sync-common-architecture-language-model-skills.ts --output ci      # emit GitHub Actions outputs
 */

import {
  existsSync,
  mkdtempSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  appendFileSync,
  writeFileSync,
} from "node:fs";
import { join, resolve, dirname, basename } from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";
import { tmpdir } from "node:os";
import { parseArgs } from "node:util";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type OutputMode = "human" | "ci";

interface SyncResult {
  added: string[];
  updated: string[];
  removed: string[];
  localOnly: string[];
  totalUpstream: number;
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const REPO_ROOT = resolve(__dirname, "..");
const PLUGIN_SKILLS_DIR = join(REPO_ROOT, "plugins", "common-architecture-language-model", "skills");

// Skills that live only in this repo and must never be overwritten or removed.
const LOCAL_ONLY_SKILLS = new Set<string>([]);

const { values: args } = parseArgs({
  options: {
    "dry-run": { type: "boolean", default: false },
    output: { type: "string", default: "human" },
    help: { type: "boolean", short: "h", default: false },
  },
  strict: true,
});

if (args.help) {
  console.log(`Usage: tsx src/sync-common-architecture-language-model-skills.ts [options]

Options:
  --dry-run        Show what would change without writing
  --output <mode>  Output mode: "human" (default) or "ci" (GitHub Actions)
  -h, --help       Show this help
`);
  process.exit(0);
}

const DRY_RUN = args["dry-run"]!;
const OUTPUT_MODE: OutputMode = args.output === "ci" ? "ci" : "human";

// ---------------------------------------------------------------------------
// Colors (disabled in ci mode)
// ---------------------------------------------------------------------------

const isTTY = process.stdout.isTTY && OUTPUT_MODE === "human";
const c = {
  red: (s: string) => (isTTY ? `\x1b[0;31m${s}\x1b[0m` : s),
  green: (s: string) => (isTTY ? `\x1b[0;32m${s}\x1b[0m` : s),
  yellow: (s: string) => (isTTY ? `\x1b[0;33m${s}\x1b[0m` : s),
  cyan: (s: string) => (isTTY ? `\x1b[0;36m${s}\x1b[0m` : s),
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function git(gitArgs: string, opts: { cwd?: string } = {}): string {
  return execSync(`git ${gitArgs}`, {
    stdio: "pipe",
    encoding: "utf-8",
    ...opts,
  }).trim();
}

/** List `.md` prompt files in the upstream tools/ directory. */
function getToolFiles(baseDir: string): string[] {
  if (!existsSync(baseDir)) return [];
  return readdirSync(baseDir)
    .filter((entry) => {
      const full = join(baseDir, entry);
      return statSync(full).isFile() && entry.toLowerCase().endsWith(".md");
    })
    .sort();
}

/** Local skill directories (each contains a SKILL.md). */
function getSkillDirs(baseDir: string): string[] {
  if (!existsSync(baseDir)) return [];
  return readdirSync(baseDir).filter((entry) => {
    if (!statSync(join(baseDir, entry)).isDirectory()) return false;
    return existsSync(join(baseDir, entry, "SKILL.md"));
  });
}

/** Convert a tools filename (e.g. "node-creation.md") to a skill slug. */
function toSkillName(fileName: string): string {
  return basename(fileName, ".md")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Turn a slug into a human-readable title, e.g. "node-creation" -> "Node creation". */
function humanize(slug: string): string {
  const words = slug.replace(/-/g, " ").trim();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

/**
 * Derive the first meaningful line of prose from the upstream markdown body,
 * skipping headings, blockquotes, and blank lines. Used to enrich the
 * generated description.
 */
function firstProse(body: string): string {
  const lines = body.split("\n");
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    if (line.startsWith("#")) continue; // heading
    if (line.startsWith(">")) continue; // blockquote / callout
    if (line.startsWith("⚠")) continue; // warning callout
    if (line.startsWith("```")) break; // code fence — stop looking
    // Strip common markdown emphasis / list markers for a clean sentence.
    const cleaned = line
      .replace(/^[-*]\s+/, "")
      .replace(/\*\*/g, "")
      .replace(/`/g, "")
      .trim();
    if (cleaned.length >= 20) return cleaned;
  }
  return "";
}

/**
 * Build the SKILL.md content for a tool prompt: YAML front matter with a
 * `name` and a trigger-oriented `description`, followed by the verbatim
 * upstream body.
 */
function buildSkillMarkdown(skillName: string, upstreamBody: string): string {
  const title = humanize(skillName);
  const prose = firstProse(upstreamBody);

  // A description that helps agents match the skill to a user request.
  let description = `This skill should be used for FINOS CALM ${title.toLowerCase()}`;
  if (prose) {
    // Keep the description to a single, readable sentence.
    const trimmed = prose.length > 220 ? `${prose.slice(0, 217)}...` : prose;
    description += `: ${trimmed}`;
  }
  description += ".";

  // Escape YAML double quotes in the description.
  const yamlDescription = description.replace(/"/g, '\\"');

  const frontMatter = [
    "---",
    `name: ${skillName}`,
    `description: "${yamlDescription}"`,
    "---",
    "",
  ].join("\n");

  // Ensure exactly one blank line between front matter and body.
  return `${frontMatter}${upstreamBody.replace(/^\n+/, "")}`;
}

// ---------------------------------------------------------------------------
// GitHub Actions output helpers
// ---------------------------------------------------------------------------

function setOutput(name: string, value: string): void {
  const outputFile = process.env.GITHUB_OUTPUT;
  if (outputFile) {
    appendFileSync(outputFile, `${name}=${value}\n`);
  }
}

function writePrBody(result: SyncResult): string {
  let body = "";

  if (result.added.length > 0) {
    body += "### Added\n";
    for (const s of result.added) body += `- \`${s}\`\n`;
    body += "\n";
  }

  if (result.updated.length > 0) {
    body += "### Updated\n";
    for (const s of result.updated) body += `- \`${s}\`\n`;
    body += "\n";
  }

  if (result.removed.length > 0) {
    body += "### Removed\n";
    for (const s of result.removed) body += `- \`${s}\`\n`;
    body += "\n";
  }

  return body;
}

// ---------------------------------------------------------------------------
// Sync logic
// ---------------------------------------------------------------------------

/**
 * Transform each upstream tools/*.md prompt into a skill directory containing
 * a SKILL.md with generated front matter.
 */
function syncSource(
  toolsDir: string,
  result: SyncResult,
  processedSkills: Set<string>
): void {
  const toolFiles = getToolFiles(toolsDir);

  for (const fileName of toolFiles) {
    const skillName = toSkillName(fileName);
    if (!skillName || processedSkills.has(skillName)) continue;

    const upstreamBody = readFileSync(join(toolsDir, fileName), "utf-8");
    const nextContent = buildSkillMarkdown(skillName, upstreamBody);

    const destDir = join(PLUGIN_SKILLS_DIR, skillName);
    const destFile = join(destDir, "SKILL.md");

    if (!existsSync(destFile)) {
      result.added.push(skillName);
    } else {
      const current = readFileSync(destFile, "utf-8");
      if (current !== nextContent) result.updated.push(skillName);
    }

    if (!DRY_RUN) {
      // Rebuild the skill directory from upstream (generated content only).
      if (existsSync(destDir)) rmSync(destDir, { recursive: true, force: true });
      mkdirSync(destDir, { recursive: true });
      writeFileSync(destFile, nextContent);
    }

    processedSkills.add(skillName);
  }
}

function detectRemovals(allUpstream: Set<string>, result: SyncResult): void {
  const localSkills = getSkillDirs(PLUGIN_SKILLS_DIR);

  for (const localName of localSkills) {
    if (LOCAL_ONLY_SKILLS.has(localName)) {
      result.localOnly.push(localName);
      continue;
    }
    if (!allUpstream.has(localName)) {
      result.removed.push(localName);
      if (!DRY_RUN) {
        rmSync(join(PLUGIN_SKILLS_DIR, localName), { recursive: true, force: true });
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

const WORK_DIR = mkdtempSync(join(tmpdir(), "sync-common-architecture-language-model-skills-"));

function cleanup(): void {
  rmSync(WORK_DIR, { recursive: true, force: true });
}
process.on("exit", cleanup);
process.on("SIGINT", () => { cleanup(); process.exit(130); });
process.on("SIGTERM", () => { cleanup(); process.exit(143); });

const result: SyncResult = {
  added: [],
  updated: [],
  removed: [],
  localOnly: [],
  totalUpstream: 0,
};

const processedSkills = new Set<string>();

// --- Source: finos/architecture-as-code calm-ai/tools (sparse) ---
console.log(c.cyan("Syncing common-architecture-language-model skills from upstream..."));
console.log("");
console.log(`${c.cyan("[1/1]")} Cloning finos/architecture-as-code (sparse: calm-ai/tools)...`);

const calmClone = join(WORK_DIR, "architecture-as-code");
git(`clone --depth 1 --sparse --quiet https://github.com/finos/architecture-as-code.git ${calmClone}`);
git("sparse-checkout set calm-ai/tools", { cwd: calmClone });

const toolsDir = join(calmClone, "calm-ai", "tools");
const toolFiles = getToolFiles(toolsDir);
const upstreamSkillNames = toolFiles.map(toSkillName).filter(Boolean);

// Ensure the destination skills directory exists.
if (!DRY_RUN && !existsSync(PLUGIN_SKILLS_DIR)) {
  mkdirSync(PLUGIN_SKILLS_DIR, { recursive: true });
}

syncSource(toolsDir, result, processedSkills);
console.log(`  ${c.green("✓")} finos/architecture-as-code: ${upstreamSkillNames.length} skills`);
console.log("");

// --- Detect removals ---
const allUpstream = new Set(upstreamSkillNames);
result.totalUpstream = allUpstream.size;
detectRemovals(allUpstream, result);

// --- Also collect local-only that weren't removed ---
const allLocal = getSkillDirs(PLUGIN_SKILLS_DIR);
for (const name of allLocal) {
  if (!allUpstream.has(name) && !result.removed.includes(name) && !result.localOnly.includes(name)) {
    result.localOnly.push(name);
  }
}

// ---------------------------------------------------------------------------
// Output
// ---------------------------------------------------------------------------

const totalChanges = result.added.length + result.updated.length + result.removed.length;

if (OUTPUT_MODE === "ci") {
  // GitHub Actions output mode
  const hasChanges = totalChanges > 0;
  setOutput("has_changes", String(hasChanges));
  setOutput("changes", String(totalChanges));
  setOutput("added", result.added.join(","));
  setOutput("updated", result.updated.join(","));
  setOutput("removed", result.removed.join(","));

  if (hasChanges) {
    const prBody = writePrBody(result);
    const summaryFile = join(process.env.RUNNER_TEMP || tmpdir(), "pr-body-common-architecture-language-model.md");
    writeFileSync(summaryFile, prBody);
    setOutput("summary_file", summaryFile);
  }

  console.log(`Done. ${result.totalUpstream} upstream skills processed.`);
  if (hasChanges) {
    console.log(`Changes: +${result.added.length} added, ~${result.updated.length} updated, -${result.removed.length} removed`);
  } else {
    console.log("No upstream changes detected.");
  }
} else {
  // Human output
  console.log(`${c.green("Done.")} ${result.totalUpstream} upstream skills processed.`);

  if (totalChanges > 0) {
    console.log("");
    if (result.added.length > 0) {
      console.log("Added:");
      for (const s of result.added) console.log(`  ${c.green("+")} ${s}`);
    }
    if (result.updated.length > 0) {
      console.log("Updated:");
      for (const s of result.updated) console.log(`  ${c.yellow("~")} ${s}`);
    }
    if (result.removed.length > 0) {
      console.log("Removed:");
      for (const s of result.removed) console.log(`  ${c.red("-")} ${s}`);
    }
  }

  if (DRY_RUN) {
    console.log("");
    console.log(c.yellow("Dry run — no files were modified."));
  } else if (result.localOnly.length > 0) {
    console.log("");
    console.log("Local-only skills (not overwritten):");
    for (const s of result.localOnly) console.log(`  ${c.cyan("•")} ${s}`);
    console.log("");
    console.log("Run 'git diff --stat' to review changes.");
  }
}

process.exit(0);
