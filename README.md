# Alithya Agent Plugins

A monorepo of [Agent Plugins](https://agent-plugins.org) maintained by Alithya, compliant with the **Agent Plugins Specification v1.0.0**.

## Repository layout

```
agent-plugins/
├── plugins/
│   └── <plugin-name>/          # One directory per plugin
│       ├── plugin.json         # Required manifest (v1.0.0 schema)
│       ├── skills/             # Portable Agent Skills
│       │   └── <skill-name>/
│       │       ├── SKILL.md    # Skill definition
│       │       ├── scripts/    # Optional helper scripts
│       │       └── references/ # Optional reference material
│       ├── mcp.json            # Optional MCP server configuration
│       └── com.vendor.client/  # Optional client extension namespace
├── scripts/
│   └── validate.sh            # Schema validation for all plugins
├── CONTRIBUTING.md
├── LICENSE
└── README.md
```

## Quick start

### Install a plugin

Point your AI agent client at any directory under `plugins/`. Each plugin is self-contained and follows the portable Agent Plugins format.

### Validate all plugins

```bash
./scripts/validate.sh
```

This checks every `plugin.json` against the official [v1.0.0 JSON Schema](https://agent-plugins.org/schemas/1.0.0/plugin.schema.json).

### Sync upstream skills (backstage-development)

```bash
./scripts/sync-backstage-skills.sh            # pull latest from upstream
./scripts/sync-backstage-skills.sh --dry-run  # preview changes without writing
```

This fetches skills from [vinzscam/backstage-skills](https://github.com/vinzscam/backstage-skills) and [backstage/backstage official skills](https://github.com/backstage/backstage/tree/master/docs/.well-known/skills), updating the `backstage-development` plugin while preserving local-only skills.

## Conventions

- Each plugin lives in its own directory under `plugins/`.
- The directory name **must** match the `name` field in `plugin.json`.
- Plugin names use lowercase alphanumeric characters, hyphens, and dots (no consecutive `--` or `..`).
- Skills are immediate child directories of `skills/` and contain a `SKILL.md` at minimum.
- Client-specific extensions use reverse-domain namespaces (e.g., `com.example.client/`).

## Specification reference

- [Agent Plugins Specification v1.0.0](https://github.com/agentplugins/agent-plugins-spec)
- [Plugin manifest schema](https://agent-plugins.org/schemas/1.0.0/plugin.schema.json)
- [Canonical example](https://github.com/agentplugins/agent-plugins-example)

## License

[MIT](LICENSE)
