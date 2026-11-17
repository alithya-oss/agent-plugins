---
name: multica-migration-planning
description: Plan a migration of Multica projects, issues, agents and skills to another Multica instance. Use when the user asks to move, copy or consolidate Multica content between servers or workspaces, or asks what a migration preserves.
---

# Plan a Multica migration

Settle these points with the user before exporting anything. Ask only for what is missing.

## Inputs to confirm

1. Source: server URL, workspace, project(s).
2. Target: server URL, workspace id.
3. Credentials for the target (see Credentials). Never accept a token into a repo, comment or log.
4. Scope: project, repo resources, issues, comments, agents, skills.
5. Open-issue assignee on the target, and the runtime the migrated agents will use.
6. Where the bundle is stored (default: a dated folder `YYYY-MM-DD-<subject>/` in `alithya-oss/multica-migrations`). Ask for the repository if it is not named.
7. What happens to the source project after success. Multica has no archive status: valid project statuses are `planned`, `in_progress`, `paused`, `completed`, `cancelled`. Propose `cancelled` or `paused` and ask.

## What a migration preserves

Titles, descriptions, statuses, stages, parent/child links, priorities, repo resources, comment text and reply threads, agent definitions, and skills with their GitHub origin.

## What it cannot preserve

- Original authors and timestamps. The target records the importer as author, so the importer writes author, date and old identifier (`ALIT-n`) in a header on every issue and comment.
- Issue numbers. They take the target workspace prefix. The importer posts an old-to-new map on the root issue.
- Agent custom env vars and MCP configs. They can hold secrets and are not exported. Recreate them by hand.
- Avatars, run history, attachments (export lists them; copy by hand if present).
- Skills installed on a daemon host (for example `~/.kiro/skills`). They are not Multica objects.

## Credentials

- A personal token (`mul_...`) works from the user's own shell.
- A task-scoped `mat_...` token is issued automatically to an agent task by the daemon registered on that server. It cannot be created by hand.
- The CLI refuses to run inside an agent task directory against another server (agent-context check). Do not bypass it with raw HTTP or by deleting the task marker. Offer these options: the user runs the importers in their own shell; or a daemon is logged in to the target server (separate `--profile`), an agent is created there, and that agent runs the import.
- Remind the user to revoke any personal token pasted into chat.

## Output

A short plan: scope, assignee and runtime choices, credential route, bundle location, cutover action. Get approval, then use `multica-migration-export`.

A fill-in prompt for requesting a migration is in `references/prompt-template.md`.
