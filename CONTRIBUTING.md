# Contributing

Thanks for your interest in contributing to Alithya Agent Plugins! This guide walks you through adding a new plugin to the monorepo, recording your change with a changeset, and signing off your commits under the Developer Certificate of Origin.

## Prerequisites

- Node.js >= 18 (for schema validation and tooling)
- `npm install` run once in the repo root (installs Changesets, Husky, and the sync/deploy tooling)
- Familiarity with the [Agent Plugins Specification v1.0.0](https://github.com/agentplugins/agent-plugins-spec)

## Commit messages

Commit messages **must** follow the [Conventional Commits](https://www.conventionalcommits.org/) format and carry a DCO sign-off trailer. Both rules are enforced by [commitlint](https://commitlint.js.org/) — locally through a Husky `commit-msg` hook and in CI on every pull request.

A conforming commit looks like:

```
feat(my-plugin): add the thing

Optional body explaining the change.

Signed-off-by: Jane Doe <jane.doe@example.com>
```

The format is `<type>(<optional scope>): <subject>`. Common types: `feat`, `fix`, `docs`, `chore`, `refactor`, `test`, `ci`, `build`. The scope is typically the plugin name (e.g. `feat(adr): ...`).

You can lint your last commit at any time:

```bash
npx commitlint --from HEAD~1 --to HEAD --verbose
```

## Developer Certificate of Origin (DCO) — required

All commits **must** be signed off. By signing off, you certify that you wrote the change or otherwise have the right to submit it under the project's MIT license, per the [Developer Certificate of Origin 1.1](https://developercertificate.org/). commitlint's `signed-off-by` rule rejects any commit missing the trailer.

### How to sign off

Add the `-s` (or `--signoff`) flag when you commit:

```bash
git commit -s -m "feat(my-plugin): add my plugin"
```

This appends a trailer to your commit message using your configured `user.name` and `user.email`:

```
Signed-off-by: Jane Doe <jane.doe@example.com>
```

Make sure your git identity is set so the trailer is accurate:

```bash
git config user.name "Jane Doe"
git config user.email "jane.doe@example.com"
```

### Rules

- Every commit in a pull request must carry a `Signed-off-by` trailer, not just the final one.
- The name and email in the trailer must match the commit author.
- Sign-off is a legal statement — do not sign off on work you do not have the right to contribute.

### Fixing missing sign-off

If a commit is missing the trailer, amend or rebase to add it:

```bash
# Most recent commit only
git commit --amend -s --no-edit

# A range of commits (interactive rebase, then re-sign each)
git rebase --signoff origin/main
```

> Note: `git rebase --signoff` rewrites history. Only use it on your own feature branch before it is merged.

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

Use the [MCP schema](https://agent-plugins.org/schemas/1.0.0/mcp.schema.json) format with explicit transport types (`stdio`, `streamable-http`, or `sse`). MCP configuration lives in `mcp.json`, never inside `plugin.json`.

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

You can also run the type check for any TypeScript tooling you touched:

```bash
npx tsc --noEmit
```

## Recording your change with a changeset

This repository uses [Changesets](https://github.com/changesets/changesets) to generate an attributed, human-readable changelog on release. **Every pull request with a user-facing change must include a changeset.** See [ADR 0001](docs/adrs/0001-changesets-for-changelog-generation.md) for the rationale.

### Add a changeset

From the repo root, run:

```bash
npx changeset
```

The interactive prompt will:

1. Ask which packages changed. This repo is a single private root package, so select `agent-plugins`.
2. Ask for the bump type — `patch`, `minor`, or `major`. Use the guidance below.
3. Ask for a summary. Write it from the reader's perspective; this line becomes the changelog entry.

This writes a small Markdown file under `.changeset/`. Commit it with your change (and remember to sign off):

```bash
git add .changeset/
git commit -s -m "chore: add changeset"
```

### Choosing a bump type

The root package is private and not published, so the bump type only drives the changelog grouping and the root version:

| Bump    | Use for                                                        |
|:--------|:---------------------------------------------------------------|
| `patch` | Fixes, doc updates, small tweaks to an existing plugin/skill   |
| `minor` | New skills, a new plugin, or new capabilities (backward-safe)  |
| `major` | Breaking changes to a plugin's structure or removed skills     |

### Writing a good changeset summary

- Lead with the user-facing effect, not the file you edited.
- Keep it to one or two sentences; the changelog aggregates many entries.
- Reference the plugin by name when relevant.

Example changeset body:

```markdown
---
"agent-plugins": minor
---

Add the `common-architecture-language-model` plugin with 14 FINOS CALM authoring skills synced from finos/architecture-as-code.
```

### When a changeset is not needed

Skip the changeset for changes that have no user-facing effect, such as internal CI tweaks, formatting-only commits, or edits to this guide. If in doubt, add one.

### Preview the pending changelog

To see what the next release changelog will look like without releasing:

```bash
npx changeset status --verbose
```

## Automated checks

Husky runs two hooks locally: a `pre-commit` hook that validates plugin manifests, and a `commit-msg` hook that runs commitlint (Conventional Commits + DCO sign-off) on your message. On pull requests, CI validates all plugin manifests (`.github/workflows/validate-plugins.yml`) and lints every PR commit (`.github/workflows/commitlint.yml`). Make sure `./scripts/validate.sh` passes and your commits lint clean before pushing.

## Checklist before opening a PR

- [ ] Plugin directory name matches the `name` in `plugin.json`
- [ ] `plugin.json` passes schema validation (`./scripts/validate.sh`)
- [ ] Each skill has a `SKILL.md` with `name` and `description` in the front matter
- [ ] No client-specific fields at the `plugin.json` top level
- [ ] Plugin includes meaningful `description` and `keywords`
- [ ] Any TypeScript tooling passes `npx tsc --noEmit`
- [ ] A changeset is included for user-facing changes (`npx changeset`)
- [ ] Commit messages follow Conventional Commits and lint clean (`npx commitlint`)
- [ ] Every commit is signed off (`git commit -s`) with a `Signed-off-by` trailer
- [ ] Code and content are covered by the MIT license

## Style guidelines

- Keep skill instructions concise and actionable.
- Use imperative mood in skill descriptions ("Summarize the document" not "Summarizes the document").
- Reference files go in `references/`, scripts go in `scripts/`.
- One concern per skill — prefer multiple small skills over one large one.

## Questions?

Open an issue or start a discussion in the repository.
