## Prompt template: migrate Multica content to another instance

Copy the block below into a chat or issue assigned to an agent, and fill every `<...>`.
Delete the lines marked optional if they don't apply. Never paste a token into the prompt.

---

Migrate Multica content from a source instance to a target instance, using the
`alithya-oss/multica-migrations` repository.

**Source**
- Server: `<https://source.example>`
- Workspace: `<name or id>`
- Project(s) to migrate: `<project title(s) or id(s)>`

**Target**
- Server: `<https://target.example>`
- Workspace: `<name or id>`
- Credentials: `<how the agent gets them, e.g. "task-scoped token of the agent on the target server", or "I will run the importer myself">`. Do not store any token in a repo, comment or log.

**Scope** (keep what applies)
- Project, repo resources, issues (parent/child, stages, priorities), comments and threads
- Agent definitions: `<all | list of names>`
- Workspace skills: `<all | only those used by the agents above>`
- Excluded: agent env vars, MCP configs, avatars, run history

**Rules**
- Keep issue statuses as they are.
- Open issues are assigned to `<agent name>` on the target; done issues keep the original assignee as a note in the text.
- Runtime for agents on the target: `<runtime name, e.g. "Kiro (GMR-FJUDITH)">`.
- Optional: after I confirm success, set the source project to `<cancelled | paused | completed>` (Multica has no archive status).

**Deliverables**
1. A new folder `YYYY-MM-DD-<subject>/` in `alithya-oss/multica-migrations` with `export/`,
   importer scripts (dry run by default, resumable, with a `--verify` mode) and a README with run steps.
   Add a row to the root README table.
2. Run the importers only after I approve the dry-run output, unless the agent already holds a valid task-scoped token for the target.
3. Report the verify output (status, stage and comment counts per issue) and the old-to-new issue identifier map.

**Constraints**
- Read-only on the source until I confirm the migration.
- Do not commit tokens or secrets; scan the export for them before pushing.
- Do not use raw HTTP calls to Multica; use the `multica` CLI only. If the CLI refuses (for example
  an agent-context check on a foreign server), stop and tell me the options instead of working around it.
- Ask before anything hard to reverse: deleting, assigning agents (it can start runs), changing a daemon's server.

**Daemon (optional)**
- Point daemon `<name>` at `<target server>` using a separate `--profile`, then confirm its runtime is online before importing agents.

---

### Notes for the person filling it in

- A personal token (`mul_...`) works from your own shell. An agent on the target server gets a
  task-scoped `mat_...` token automatically from its daemon; you cannot create one by hand.
- Original authors and dates cannot be kept: the target records the importer as author, so the
  scripts write them in a header on each issue and comment.
- Issue numbers change to the target workspace prefix; the importer posts an old-to-new map on the root issue.
