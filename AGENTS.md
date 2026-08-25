---
alwaysApply: true
---

This is a monorepo of [Agent Plugins](https://agent-plugins.org) maintained by Alithya, compliant with the Agent Plugins Specification v1.0.0. It uses Node.js with TypeScript and is managed with [go-task](https://taskfile.dev).

## Key Directories

- `/plugins`: Agent Plugin packages — each subdirectory is a self-contained plugin
- `/plugins/<name>/plugin.json`: Required manifest (v1.0.0 schema)
- `/plugins/<name>/skills/`: Portable Agent Skills (each skill is an immediate child directory with a `SKILL.md`)
- `/src`: TypeScript tooling scripts (sync, deploy)
- `/scripts`: Shell-based validation scripts
- `.conftest/policy`: OPA/Rego policies for config validation
- `/docs`: Documentation
- `/.devcontainer`: Development container configuration
- `/.github/workflows`: CI/CD pipelines

## Code Standards

- Plugin manifests (`plugin.json`) must conform to the [Agent Plugins v1.0.0 schema](https://agent-plugins.org/schemas/1.0.0/plugin.schema.json). The schema is closed — only `$schema`, `name`, `version`, `description`, `author`, `homepage`, `repository`, `license`, `keywords`, and `extensions` are allowed at the top level.
- Plugin directory names must match the `name` field in their `plugin.json`.
- Plugin names use lowercase alphanumeric characters with hyphens and dots (no consecutive `--` or `..`).
- Skills are immediate child directories of `skills/` and must contain a `SKILL.md` with YAML front matter (`name` and `description` fields).
- TypeScript source files in `/src` must pass `tsc --noEmit` without errors.
- MCP server configuration goes in a root-level `mcp.json` per plugin, never inside `plugin.json`.
- Client-specific extensions use reverse-domain namespaces (e.g., `com.vendor.client/`).

## Writing Standards

- Skill instructions in `SKILL.md` should be concise and actionable.
- Use imperative mood in skill descriptions ("Summarize the document" not "Summarizes the document").
- Reference materials go in `references/`, helper scripts go in `scripts/` within each skill directory.
- One concern per skill — prefer multiple small skills over one large one.

## Development Flow

Before running commands, ensure `npm install` has been run in the project root.

- **Validate plugins**: `task validate` — checks all `plugin.json` manifests against the v1.0.0 schema.
- **Validate single plugin**: `task validate:plugin -- <plugin-name>`
- **Type check**: `task typecheck` — runs `tsc --noEmit` on the TypeScript source.
- **Sync upstream skills**: `task sync` — pulls latest Backstage skills from upstream repositories.
- **Preview sync**: `task sync:dry-run` — shows what would change without writing.
- **Validate deployment config**: `task deploy:check` — runs conftest policies against `multica.deployment.config.yaml`.
- **Deploy to Multica**: `task deploy` — deploys skills and agents (requires `MULTICA_TOKEN` env var).
- **Preview deployment**: `task deploy:dry-run` — shows what would be deployed without changes.
- **List all tasks**: `task` or `task --list`

Tests must always run with `CI=true yarn test` (or `CI=true` prefix) to prevent Jest watch mode from blocking agent execution.

You MUST NOT modify upstream-sourced skills directly. They are managed by `task sync` and will be overwritten on the next sync. To customize behavior, create local-only skills instead.

## Deployment Configuration

The file `multica.deployment.config.yaml` defines deployment targets following the hierarchy: `servers[] > workspaces[] > skills/agents`. It is validated by conftest policies in `.conftest/policy/multica/`.

Environment variables:
- `MULTICA_TOKEN` — Personal access token (required for deployment, never commit)
- `MULTICA_SERVER_URL` — Override server URL
- `MULTICA_WORKSPACE_ID` — Override workspace ID

## Upstream Skill Sources

The `backstage-development` plugin aggregates skills from two upstream repositories:

1. [vinzscam/backstage-skills](https://github.com/vinzscam/backstage-skills) — Plugin scaffolding, frontend/backend systems, catalog, permissions, UI patterns
2. [backstage/backstage](https://github.com/backstage/backstage/tree/master/docs/.well-known/skills) — Official migration and instrumentation skills

Skills unique to this repo (e.g., `backstage-testing-conventions`) are preserved during sync and never overwritten.

## Repository Structure

```
agent-plugins/
├── plugins/
│   ├── backstage-development/      # Main plugin: Backstage development skills
│   │   ├── plugin.json
│   │   └── skills/                  # 20 skills (13 vinzscam + 6 official + 1 local)
│   └── hello-world/                 # Sample/template plugin
│       ├── plugin.json
│       └── skills/
├── src/
│   ├── sync-backstage-skills.ts     # Upstream sync script
│   └── deploy-to-multica.ts         # Multica deployment script
├── scripts/
│   ├── validate.sh                  # Plugin validation wrapper
│   └── validate-plugin.mjs          # Schema validator (Node.js)
├── .conftest/policy/multica/        # OPA/Rego policies for deployment config
├── .devcontainer/                   # Dev container (Node 22, task, conftest, tsx)
├── .github/workflows/               # CI: automated upstream sync with PR creation
├── docs/                            # Documentation (mkdocs/docusaurus compatible)
├── multica.deployment.config.yaml   # Deployment targets configuration
├── Taskfile.yml                     # Task runner definitions
├── tsconfig.json                    # TypeScript configuration
└── package.json                     # Node.js project manifest
```
