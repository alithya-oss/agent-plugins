/**
 * sync-likec4-skills.ts — Sync likec4-diagramming skills from upstream repository.
 *
 * Source:
 *   https://github.com/likec4/likec4 skills/ (main)
 *
 * Skills unique to this repo are preserved and never overwritten.
 *
 * Usage:
 *   tsx src/sync-likec4-skills.ts                  # sync all
 *   tsx src/sync-likec4-skills.ts --dry-run        # preview
 *   tsx src/sync-likec4-skills.ts --output ci      # emit GitHub Actions outputs
 */

import {
  existsSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  cpSync,
  appendFileSync,
  writeFileSync,
} from "node:fs";
import { join, resolve, dirname, relative } from "node:path";
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
const PLUGIN_SKILLS_DIR = join(REPO_ROOT, "plugins", "likec4-diagramming", "skills");

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
  console.log(`Usage: tsx src/sync-likec4-skills.ts [options]

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

function getSkillDirs(baseDir: string): string[] {
  if (!existsSync(baseDir)) return [];
  return readdirSync(baseDir).filter((entry) => {
    if (!statSync(join(baseDir, entry)).isDirectory()) return false;
    // A skill directory must contain a SKILL.md
    return existsSync(join(baseDir, entry, "SKILL.md"));
  });
}

function getAllFiles(dir: string): string[] {
  const results: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      results.push(...getAllFiles(full));
    } else {
      results.push(full);
    }
  }
  return results;
}

function dirsEqual(dirA: string, dirB: string): boolean {
  if (!existsSync(dirA) || !existsSync(dirB)) return false;

  const filesA = getAllFiles(dirA).map((f) => relative(dirA, f)).sort();
  const filesB = getAllFiles(dirB).map((f) => relative(dirB, f)).sort();

  if (filesA.length !== filesB.length) return false;
  if (filesA.join("\n") !== filesB.join("\n")) return false;

  for (const relPath of filesA) {
    const contentA = readFileSync(join(dirA, relPath));
    const contentB = readFileSync(join(dirB, relPath));
    if (!contentA.equals(contentB)) return false;
  }
  return true;
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

function syncSource(
  srcDir: string,
  result: SyncResult,
  processedSkills: Set<string>
): void {
  const skills = getSkillDirs(srcDir);

  for (const skillName of skills) {
    const src = join(srcDir, skillName);
    const dest = join(PLUGIN_SKILLS_DIR, skillName);

    if (!existsSync(dest)) {
      if (!processedSkills.has(skillName)) result.added.push(skillName);
    } else if (!dirsEqual(src, dest) && !processedSkills.has(skillName)) {
      result.updated.push(skillName);
    }

    if (!DRY_RUN) {
      if (existsSync(dest)) rmSync(dest, { recursive: true, force: true });
      cpSync(src, dest, { recursive: true });
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

const WORK_DIR = mkdtempSync(join(tmpdir(), "sync-likec4-skills-"));

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

// --- Source: likec4/likec4 skills/ (sparse) ---
console.log(c.cyan("Syncing likec4-diagramming skills from upstream..."));
console.log("");
console.log(`${c.cyan("[1/1]")} Cloning likec4/likec4 (sparse: skills)...`);

const likec4Clone = join(WORK_DIR, "likec4");
git(`clone --depth 1 --sparse --quiet https://github.com/likec4/likec4.git ${likec4Clone}`);
git("sparse-checkout set skills", { cwd: likec4Clone });

const likec4SkillsDir = join(likec4Clone, "skills");
const likec4Skills = getSkillDirs(likec4SkillsDir);

syncSource(likec4SkillsDir, result, processedSkills);
console.log(`  ${c.green("✓")} likec4/likec4: ${likec4Skills.length} skills`);
console.log("");

// --- Detect removals ---
const allUpstream = new Set(likec4Skills);
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
    const summaryFile = join(process.env.RUNNER_TEMP || tmpdir(), "pr-body-likec4.md");
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
