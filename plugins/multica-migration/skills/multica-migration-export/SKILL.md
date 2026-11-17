---
name: multica-migration-export
description: Export a Multica project, its issues and comments, and optionally agents and skills to a JSON bundle without changing the source. Use when a migration plan is approved and the source content must be captured and committed to the migrations repository.
---

# Export a Multica project

Read-only against the source. Run it with the CLI configured for the source server.

## Steps

1. Run the export script:

   ```sh
   python3 scripts/export.py --project "<exact title or id>" --out <YYYY-MM-DD-subject> \
     --agents <none|all|"Name A,Name B"> --skills <none|all|used>
   ```

   It writes `<out>/export/{project,issues,actors,agents,skills}.json`, pages through issues 100 at a time, retries transient network errors, and drops agent env vars and MCP configs.
2. Scan the bundle: `scripts/scan-secrets.sh <out>`. It must print "no secret-like strings found". Names such as `mat_numbered_section` in skill text are not tokens; the scan only matches long token-shaped values.
3. Copy the import scripts and a README into the bundle folder (see `multica-migration-import`), add a `.gitignore` with `state.json`, `state_agents.json` and `__pycache__/`.
4. Add a row to the repository's root README table (folder, source, target).
5. Commit with the repository's conventions (Conventional Commits and DCO sign-off when it requires them). Push a branch and open a pull request unless the user says to push to `main`.

## Checks before reporting

- Issue count and comment count match the source (`multica issue list --project <id>`).
- Every child issue's `parent_issue_id` is in the bundle.
- Agents list matches the plan; skill count and extra file count are reported.

Reference: `references/bundle-format.md`.
