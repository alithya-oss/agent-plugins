# Contributing

Thanks for your interest in contributing to Alithya Agent Plugins! This guide walks you through adding a new plugin to the monorepo.

## Prerequisites

- Node.js >= 18 (for schema validation)
- Familiarity with the [Agent Plugins Specification v1.0.0](https://github.com/agentplugins/agent-plugins-spec)

## Adding a new plugin

### 1. Create the plugin directory

```bash
mkdir -p plugins/<your-plugin>/skills/<skill-name>
```

The directory name must match the `name` field you'll use in `plugin.json`. Names are lowercase alphanumeric with hyphens and dots allowed (no consecutive `--` or `..`).

### 2. Write `plugin.json`

Create `plugins/<your-plugin>/plugin.json`:

```json
{
  "$schema": "https://agent-plugins.org/schemas/1.0.0/plugin.schema.json",
  "name": "<your-plugin>",
  "version": "0.1.0",
  "description": "Short description of what the plugin does.",
  "author": {
    "name": "Your Name",
    "url": "https://github.com/your-handle"
  },
  "repository": "https://github.com/alithya-oss/agent-plugins",
  "license": "MIT",
  "keywords": ["agent-plugins", "your", "keywords"]
}
```

Only these top-level fields are allowed by the schema: `$schema`, `name`, `version`, `description`, `author`, `homepage`, `repository`, `license`, `keywords`, `extensions`.

### 3. Add skills

Each skill is an immediate child directory of `skills/` containing at minimum a `SKILL.md`:

```
plugins/<your-plugin>/skills/<skill-name>/
├── SKILL.md          # Required — skill definition with YAML front matter
├── scripts/          # Optional — helper scripts the skill can reference
└── references/       # Optional — reference material for the skill
```

`SKILL.md` uses YAML front matter:

```markdown
---
name: <skill-name>
description: One-line description of what the skill does.
---

Detailed instructions for the AI agent when this skill is active.
```

### 4. (Optional) Add MCP servers

If your plugin provides MCP servers, add a `mcp.json` at the plugin root:

```
plugins/<your-plugin>/mcp.json
```

Use the [MCP schema](https://agent-plugins.org/schemas/1.0.0/mcp.schema.json) format with explicit transport types (stdio, streamable-http, or http+sse).

### 5. (Optional) Add client extensions

For client-specific capabilities (hooks, commands, UI), use a reverse-domain namespace directory:

```
plugins/<your-plugin>/com.vendor.client/
```

These are ignored by clients that don't implement them and keep the portable core clean.

### 6. Validate

Run the validation script before committing:

```bash
./scripts/validate.sh
```

Or validate just your plugin:

```bash
./scripts/validate.sh <your-plugin>
```

## Checklist before opening a PR

- [ ] Plugin directory name matches the `name` in `plugin.json`
- [ ] `plugin.json` passes schema validation (`./scripts/validate.sh`)
- [ ] Each skill has a `SKILL.md` with `name` and `description` in the front matter
- [ ] No client-specific fields at the `plugin.json` top level
- [ ] Plugin includes meaningful `description` and `keywords`
- [ ] Code and content are covered by the MIT license

## Style guidelines

- Keep skill instructions concise and actionable.
- Use imperative mood in skill descriptions ("Summarize the document" not "Summarizes the document").
- Reference files go in `references/`, scripts go in `scripts/`.
- One concern per skill — prefer multiple small skills over one large one.

## Questions?

Open an issue or start a discussion in the repository.
