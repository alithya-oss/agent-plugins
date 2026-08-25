/**
 * deploy-to-multica.ts — Deploy skills and agents to Multica instances.
 *
 * Reads multica.deployment.config.yaml following the hierarchy:
 *   servers[] > workspaces[] > skills/agents
 *
 * Usage:
 *   tsx src/deploy-to-multica.ts                          # deploy to all targets
 *   tsx src/deploy-to-multica.ts --config staging.yaml    # custom config
 *   tsx src/deploy-to-multica.ts --dry-run                # preview only
 *   tsx src/deploy-to-multica.ts --server 0               # target a single server
 *   tsx src/deploy-to-multica.ts --workspace 0.1          # target server 0, workspace 1
 *   tsx src/deploy-to-multica.ts --output ci              # emit GitHub Actions outputs
 */

import {
  existsSync,
  readdirSync,
  readFileSync,
  statSync,
  appendFileSync,
  writeFileSync,
} from "node:fs";
import { join, resolve, dirname, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { tmpdir } from "node:os";
import yaml from "js-yaml";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type OutputMode = "human" | "ci";

interface SkillFile {
  path: string;
  content: string;
}

interface SkillSource {
  plugin: string;
  skills: string[];
}

interface AgentDefinition {
  name: string;
  description?: string;
  skills: string[];
}

interface WorkspaceConfig {
  id: string;
  name?: string;
  skills?: {
    on_conflict?: "overwrite" | "skip" | "fail";
    sources: SkillSource[];
  };
  agents?: {
    skill_binding?: "additive" | "replace";
    definitions: AgentDefinition[];
  };
}

interface ServerConfig {
  url: string;
  token_env?: string;
  workspaces: WorkspaceConfig[];
}

interface DeploymentConfig {
  servers: ServerConfig[];
}

interface DeployResult {
  serverUrl: string;
  workspaceId: string;
  workspaceName?: string;
  skills: { name: string; status: "ok" | "skipped" | "error"; message?: string }[];
  agents: { name: string; status: "ok" | "updated" | "error"; skillCount: number; message?: string }[];
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const REPO_ROOT = resolve(__dirname, "..");

const { values: args } = parseArgs({
  options: {
    config: { type: "string", default: join(REPO_ROOT, "multica.deployment.config.yaml") },
    "dry-run": { type: "boolean", default: false },
    server: { type: "string", default: "" },
    workspace: { type: "string", default: "" },
    output: { type: "string", default: "human" },
    help: { type: "boolean", short: "h", default: false },
  },
  strict: true,
});

if (args.help) {
  console.log(`Usage: tsx src/deploy-to-multica.ts [options]

Options:
  --config <path>       Path to config file (default: multica.deployment.config.yaml)
  --dry-run             Preview changes without deploying
  --server <index>      Target a specific server by index
  --workspace <s.w>     Target server s, workspace w (e.g. 0.1)
  --output <mode>       Output mode: "human" (default) or "ci" (GitHub Actions)
  -h, --help            Show this help
`);
  process.exit(0);
}

const DRY_RUN = args["dry-run"]!;
const OUTPUT_MODE: OutputMode = args.output === "ci" ? "ci" : "human";
const TARGET_SERVER = args.server!;
const TARGET_WORKSPACE = args.workspace!;

// ---------------------------------------------------------------------------
// Colors
// ---------------------------------------------------------------------------

const isTTY = process.stdout.isTTY && OUTPUT_MODE === "human";
const c = {
  red: (s: string) => (isTTY ? `\x1b[0;31m${s}\x1b[0m` : s),
  green: (s: string) => (isTTY ? `\x1b[0;32m${s}\x1b[0m` : s),
  yellow: (s: string) => (isTTY ? `\x1b[0;33m${s}\x1b[0m` : s),
  cyan: (s: string) => (isTTY ? `\x1b[0;36m${s}\x1b[0m` : s),
  bold: (s: string) => (isTTY ? `\x1b[1m${s}\x1b[0m` : s),
};

// ---------------------------------------------------------------------------
// Load config
// ---------------------------------------------------------------------------

if (!existsSync(args.config!)) {
  console.error(c.red(`Error: Config file not found: ${args.config}`));
  process.exit(1);
}

const config = yaml.load(readFileSync(args.config!, "utf-8")) as DeploymentConfig;

if (!config?.servers || config.servers.length === 0) {
  console.error(c.red("Error: No servers defined in config"));
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getToken(server: ServerConfig): string {
  const envName = server.token_env || "MULTICA_TOKEN";
  return process.env[envName] || "";
}

async function api(
  token: string,
  workspaceId: string,
  method: string,
  url: string,
  body?: unknown
): Promise<{ status: number; data: any }> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
    "X-Workspace-Id": workspaceId,
  };

  const opts: RequestInit = { method, headers };
  if (body) opts.body = JSON.stringify(body);

  const res = await fetch(url, opts);
  let data: any;
  try {
    data = await res.json();
  } catch {
    data = null;
  }
  return { status: res.status, data };
}

function resolveSkills(pluginName: string, skillPattern: string): string[] {
  const pluginDir = join(REPO_ROOT, "plugins", pluginName, "skills");

  if (!existsSync(pluginDir)) {
    console.error(c.red(`Error: Plugin not found: ${pluginDir}`));
    return [];
  }

  if (skillPattern === "*") {
    return readdirSync(pluginDir).filter((entry) =>
      statSync(join(pluginDir, entry)).isDirectory()
    );
  }
  return [skillPattern];
}

function readSkillDescription(skillMdPath: string): string {
  const content = readFileSync(skillMdPath, "utf-8");
  const fmMatch = content.match(/^---\n([\s\S]*?)\n---/);
  if (!fmMatch) return "";
  const descMatch = fmMatch[1].match(/^description:\s*(.+)$/m);
  return descMatch ? descMatch[1].trim() : "";
}

function collectFiles(dirPath: string): SkillFile[] {
  const files: SkillFile[] = [];
  function walk(dir: string): void {
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry);
      if (statSync(full).isDirectory()) {
        walk(full);
      } else {
        files.push({
          path: relative(dirPath, full),
          content: readFileSync(full, "utf-8"),
        });
      }
    }
  }
  walk(dirPath);
  return files.sort((a, b) => a.path.localeCompare(b.path));
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

// ---------------------------------------------------------------------------
// Deploy skills
// ---------------------------------------------------------------------------

async function deploySkills(
  serverUrl: string,
  token: string,
  workspaceId: string,
  wsConfig: WorkspaceConfig
): Promise<{ deployed: string[]; results: DeployResult["skills"] }> {
  const skills = wsConfig.skills;
  if (!skills?.sources?.length) return { deployed: [], results: [] };

  const onConflict = skills.on_conflict || "overwrite";
  console.log(`  ${c.cyan("Skills")} (on_conflict: ${onConflict})`);

  const deployed: string[] = [];
  const results: DeployResult["skills"] = [];

  for (const source of skills.sources) {
    const pluginName = source.plugin;

    for (const pattern of source.skills) {
      const skillNames = resolveSkills(pluginName, pattern);

      for (const skillName of skillNames) {
        const skillDir = join(REPO_ROOT, "plugins", pluginName, "skills", skillName);
        const skillMd = join(skillDir, "SKILL.md");

        if (!existsSync(skillMd)) {
          console.log(`    ${c.red("✗")} ${skillName} — SKILL.md not found`);
          results.push({ name: skillName, status: "error", message: "SKILL.md not found" });
          continue;
        }

        const description = readSkillDescription(skillMd) || `Skill: ${skillName}`;
        const files = collectFiles(skillDir);

        if (DRY_RUN) {
          console.log(`    ${c.yellow("○")} ${skillName} (${files.length} files)`);
          deployed.push(skillName);
          results.push({ name: skillName, status: "ok" });
          continue;
        }

        const payload = { name: skillName, description, on_conflict: onConflict, files };
        const { status, data } = await api(token, workspaceId, "POST", `${serverUrl}/api/skills`, payload);

        if (status === 200 || status === 201) {
          console.log(`    ${c.green("✓")} ${skillName} (${files.length} files)`);
          deployed.push(skillName);
          results.push({ name: skillName, status: "ok" });
        } else if (status === 409) {
          if (onConflict === "skip") {
            console.log(`    ${c.yellow("⊘")} ${skillName} — exists (skipped)`);
            results.push({ name: skillName, status: "skipped" });
          } else {
            console.log(`    ${c.red("✗")} ${skillName} — conflict (409)`);
            results.push({ name: skillName, status: "error", message: "409 conflict" });
          }
          deployed.push(skillName);
        } else {
          console.log(`    ${c.red("✗")} ${skillName} — HTTP ${status}`);
          results.push({ name: skillName, status: "error", message: `HTTP ${status}` });
        }
      }
    }
  }

  return { deployed, results };
}

// ---------------------------------------------------------------------------
// Deploy agents
// ---------------------------------------------------------------------------

async function deployAgents(
  serverUrl: string,
  token: string,
  workspaceId: string,
  wsConfig: WorkspaceConfig,
  deployedSkills: string[]
): Promise<DeployResult["agents"]> {
  const agents = wsConfig.agents;
  if (!agents?.definitions?.length) return [];

  const skillBinding = agents.skill_binding || "additive";
  console.log(`  ${c.cyan("Agents")} (skill_binding: ${skillBinding})`);

  const results: DeployResult["agents"] = [];

  for (const agentDef of agents.definitions) {
    const agentName = agentDef.name;
    const agentDesc = agentDef.description || "";

    // Resolve skill bindings
    let agentSkills: string[] = [];
    for (const ref of agentDef.skills) {
      if (ref === "*") {
        agentSkills = [...deployedSkills];
        break;
      }
      agentSkills.push(ref);
    }

    if (DRY_RUN) {
      console.log(`    ${c.yellow("○")} ${agentName} — would bind ${agentSkills.length} skills`);
      results.push({ name: agentName, status: "ok", skillCount: agentSkills.length });
      continue;
    }

    const payload = {
      name: agentName,
      description: agentDesc,
      skill_binding: skillBinding,
      skills: agentSkills,
    };

    const { status, data } = await api(token, workspaceId, "POST", `${serverUrl}/api/agents`, payload);

    if (status === 200 || status === 201) {
      console.log(`    ${c.green("✓")} ${agentName} — ${agentSkills.length} skills bound`);
      results.push({ name: agentName, status: "ok", skillCount: agentSkills.length });
    } else if (status === 409) {
      const agentId = data?.existing_agent?.id;
      if (agentId) {
        const { status: updateStatus } = await api(
          token, workspaceId, "PATCH", `${serverUrl}/api/agents/${agentId}`, payload
        );
        if (updateStatus === 200) {
          console.log(`    ${c.green("✓")} ${agentName} — updated, ${agentSkills.length} skills bound`);
          results.push({ name: agentName, status: "updated", skillCount: agentSkills.length });
        } else {
          console.log(`    ${c.yellow("~")} ${agentName} — exists, update returned HTTP ${updateStatus}`);
          results.push({ name: agentName, status: "error", skillCount: agentSkills.length, message: `update HTTP ${updateStatus}` });
        }
      } else {
        console.log(`    ${c.yellow("~")} ${agentName} — already exists`);
        results.push({ name: agentName, status: "error", skillCount: agentSkills.length, message: "already exists" });
      }
    } else {
      console.log(`    ${c.red("✗")} ${agentName} — HTTP ${status}`);
      results.push({ name: agentName, status: "error", skillCount: agentSkills.length, message: `HTTP ${status}` });
    }
  }

  return results;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

const allResults: DeployResult[] = [];
let totalDeployed = 0;

for (let s = 0; s < config.servers.length; s++) {
  if (TARGET_SERVER !== "" && TARGET_SERVER !== String(s)) continue;

  const server = config.servers[s];
  let serverUrl = process.env.MULTICA_SERVER_URL || server.url;
  serverUrl = serverUrl.replace(/\/$/, "");

  const token = getToken(server);
  if (!token) {
    const envName = server.token_env || "MULTICA_TOKEN";
    console.error(c.red(`Error: No token for server ${serverUrl} (set ${envName})`));
    continue;
  }

  console.log(`${c.bold(c.cyan("Server:"))} ${serverUrl}`);
  console.log("");

  for (let w = 0; w < server.workspaces.length; w++) {
    if (TARGET_WORKSPACE !== "") {
      const [targetS, targetW] = TARGET_WORKSPACE.split(".");
      if (targetS !== String(s) || targetW !== String(w)) continue;
    }

    const ws = server.workspaces[w];
    const workspaceId = process.env.MULTICA_WORKSPACE_ID || ws.id;

    if (!workspaceId) {
      console.log(`  ${c.red("Error:")} Workspace [${w}] has no id configured. Skipping.`);
      console.log("");
      continue;
    }

    const wsLabel = ws.name ? `${ws.name} (${workspaceId})` : workspaceId;
    console.log(`  ${c.bold("Workspace:")} ${wsLabel}`);
    console.log("");

    const { deployed: deployedSkills, results: skillResults } = await deploySkills(serverUrl, token, workspaceId, ws);
    console.log("");
    const agentResults = await deployAgents(serverUrl, token, workspaceId, ws, deployedSkills);
    console.log("");

    allResults.push({
      serverUrl,
      workspaceId,
      workspaceName: ws.name,
      skills: skillResults,
      agents: agentResults,
    });

    totalDeployed += deployedSkills.length;
  }
}

// ---------------------------------------------------------------------------
// Output
// ---------------------------------------------------------------------------

console.log(`${c.green("Done.")} ${totalDeployed} total skill deployments across all targets.`);
if (DRY_RUN) {
  console.log(c.yellow("Dry run — no changes were made."));
}

if (OUTPUT_MODE === "ci") {
  const skillsOk = allResults.flatMap((r) => r.skills.filter((s) => s.status === "ok").map((s) => s.name));
  const skillsError = allResults.flatMap((r) => r.skills.filter((s) => s.status === "error").map((s) => s.name));
  const agentsOk = allResults.flatMap((r) => r.agents.filter((a) => a.status === "ok" || a.status === "updated").map((a) => a.name));
  const agentsError = allResults.flatMap((r) => r.agents.filter((a) => a.status === "error").map((a) => a.name));

  setOutput("total_deployed", String(totalDeployed));
  setOutput("skills_ok", skillsOk.join(","));
  setOutput("skills_error", skillsError.join(","));
  setOutput("agents_ok", agentsOk.join(","));
  setOutput("agents_error", agentsError.join(","));
  setOutput("has_errors", String(skillsError.length + agentsError.length > 0));

  // Write full JSON report
  const reportFile = join(process.env.RUNNER_TEMP || tmpdir(), "deploy-report.json");
  writeFileSync(reportFile, JSON.stringify(allResults, null, 2));
  setOutput("report_file", reportFile);
}

process.exit(totalDeployed > 0 || DRY_RUN ? 0 : 1);
