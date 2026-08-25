---
title: Multica Deployment Configuration
description: Reference for multica.deployment.config.yaml — deploy skills and agents to Multica instances.
sidebar_position: 3
---

# Multica Deployment Configuration

The `multica.deployment.config.yaml` file defines how skills and agents are deployed to one or more [Multica](https://multica.ai) instances. It follows a hierarchical structure: **servers > workspaces > skills/agents**.

## Overview

```yaml
servers:
  - url: "https://api.multica.example.com"
    token_env: MULTICA_TOKEN
    workspaces:
      - id: "workspace-uuid"
        name: "production"
        skills:
          on_conflict: overwrite
          sources:
            - plugin: backstage-development
              skills: ["*"]
        agents:
          skill_binding: additive
          definitions:
            - name: "backstage-developer"
              description: "Backstage development agent."
              skills: ["*"]
```

## Hierarchy

```text
servers[]                    # One or more Multica API servers
  └── workspaces[]           # One or more workspaces per server
        ├── skills           # Skills to deploy into this workspace
        │     └── sources[]  # Plugin + skill list pairs
        └── agents           # Agents to create/update in this workspace
              └── definitions[]
```

## Configuration reference

### `servers[]`

The top-level array of Multica server targets.

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `url` | string | Yes | — | Multica API server URL (e.g. `http://localhost:8080` or `https://api.multica.example.com`) |
| `token_env` | string | No | `MULTICA_TOKEN` | Name of the environment variable holding the personal access token for this server |
| `workspaces` | array | Yes | — | List of workspace targets on this server |

### `servers[].workspaces[]`

Each workspace is an independent deployment target within a server.

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `id` | string | Yes | — | Workspace UUID. Can be overridden by `MULTICA_WORKSPACE_ID` env var |
| `name` | string | No | — | Human-readable label (informational only, not sent to the API) |
| `skills` | object | No | — | Skills deployment configuration |
| `agents` | object | No | — | Agents deployment configuration |

### `servers[].workspaces[].skills`

Controls which skills are deployed to the workspace.

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `on_conflict` | string | No | `overwrite` | Behavior when a skill already exists. One of: `overwrite`, `skip`, `fail` |
| `sources` | array | Yes | — | List of plugin sources to deploy from |

### `servers[].workspaces[].skills.sources[]`

Each source maps a local plugin to the skills that should be deployed.

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `plugin` | string | Yes | — | Plugin directory name under `plugins/` |
| `skills` | array | Yes | — | List of skill names to deploy, or `["*"]` for all skills in the plugin |

### `servers[].workspaces[].agents`

Controls agent creation and skill binding.

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `skill_binding` | string | No | `additive` | How skills are bound to the agent. One of: `additive` (append to existing), `replace` (replace all bindings) |
| `definitions` | array | Yes | — | List of agent definitions |

### `servers[].workspaces[].agents.definitions[]`

Each definition creates or updates an agent in the workspace.

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `name` | string | Yes | — | Agent name (used for creation and conflict detection) |
| `description` | string | No | `""` | Human-readable description of the agent's purpose |
| `skills` | array | Yes | — | Skills to bind. Use `["*"]` to bind all deployed skills, or list specific skill names |

## Environment variables

| Variable | Description |
|----------|-------------|
| `MULTICA_TOKEN` | Default personal access token (used when `token_env` is not set on a server) |
| `MULTICA_SERVER_URL` | Override the `url` field for all servers |
| `MULTICA_WORKSPACE_ID` | Override the `id` field for all workspaces |

:::tip
Never commit tokens to the repository. Use environment variables or a secrets manager.
:::

## Validation

The config is validated using [conftest](https://www.conftest.dev/) with OPA/Rego policies before deployment.

```bash
# Validate manually
task deploy:check

# Or directly with conftest
conftest test multica.deployment.config.yaml --policy policy/multica/ --all-namespaces
```

### What is checked

| Rule | Severity | Description |
|------|----------|-------------|
| Servers array exists | deny | At least one server must be defined |
| Server has `url` | deny | Each server must have a non-empty URL |
| Server has `workspaces` | deny | Each server must define at least one workspace |
| Workspace has `id` | deny | Each workspace must have a non-empty UUID |
| Skills sources have `plugin` | deny | Each source must name a plugin |
| Skills sources have `skills` | deny | Each source must list at least one skill |
| `on_conflict` is valid | deny | Must be `overwrite`, `skip`, or `fail` |
| Agent definitions have `name` | deny | Each agent must have a non-empty name |
| Agent definitions have `skills` | deny | Each agent must bind at least one skill |
| `skill_binding` is valid | deny | Must be `additive` or `replace` |
| Empty workspace | warn | Workspace with neither skills nor agents defined |

## Usage

### Deploy to all targets

```bash
task deploy
```

This runs `deploy:check` first, then deploys to every server and workspace in the config.

### Preview changes

```bash
task deploy:dry-run
```

### Target a specific server

```bash
task deploy:server -- --server 0
```

### Target a specific workspace

Use `serverIndex.workspaceIndex` notation:

```bash
task deploy:workspace -- --workspace 0.1
```

### Use a custom config file

```bash
task deploy -- --config path/to/custom.yaml
```

## Examples

### Single local instance

```yaml
servers:
  - url: "http://localhost:8080"
    workspaces:
      - id: "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
        skills:
          on_conflict: overwrite
          sources:
            - plugin: backstage-development
              skills: ["*"]
        agents:
          definitions:
            - name: "backstage-developer"
              description: "Full Backstage development agent."
              skills: ["*"]
```

### Multiple environments

```yaml
servers:
  - url: "https://api-staging.multica.example.com"
    token_env: MULTICA_STAGING_TOKEN
    workspaces:
      - id: "staging-workspace-uuid"
        name: "staging"
        skills:
          on_conflict: overwrite
          sources:
            - plugin: backstage-development
              skills: ["*"]
        agents:
          skill_binding: replace
          definitions:
            - name: "backstage-developer"
              skills: ["*"]

  - url: "https://api.multica.example.com"
    token_env: MULTICA_PROD_TOKEN
    workspaces:
      - id: "prod-workspace-uuid"
        name: "production"
        skills:
          on_conflict: skip
          sources:
            - plugin: backstage-development
              skills:
                - creating-backstage-plugin
                - using-backstage-frontend-system
                - using-backstage-backend-system
                - backstage-testing-conventions
        agents:
          skill_binding: additive
          definitions:
            - name: "backstage-developer"
              description: "Production Backstage agent with curated skills."
              skills:
                - creating-backstage-plugin
                - using-backstage-frontend-system
                - using-backstage-backend-system
                - backstage-testing-conventions
```

### Cherry-pick skills from multiple plugins

```yaml
servers:
  - url: "http://localhost:8080"
    workspaces:
      - id: "my-workspace-uuid"
        skills:
          sources:
            - plugin: backstage-development
              skills:
                - creating-backstage-plugin
                - using-backstage-ui
            - plugin: another-plugin
              skills: ["*"]
        agents:
          definitions:
            - name: "frontend-agent"
              description: "Frontend-focused Backstage agent."
              skills:
                - creating-backstage-plugin
                - using-backstage-ui
            - name: "full-stack-agent"
              skills: ["*"]
```
