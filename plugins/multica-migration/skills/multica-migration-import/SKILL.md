---
name: multica-migration-import
description: Import an exported Multica bundle into a target instance and verify it. Use when a bundle exists in the migrations repository and the target server, workspace and credentials are known.
---

# Import a bundle into the target

## Preconditions

- Target server, workspace id and credentials confirmed (see `multica-migration-planning`).
- Credentials are in the environment only: `MULTICA_SERVER_URL`, `MULTICA_TOKEN`, `MULTICA_WORKSPACE_ID`. Never write them to a file in a repo.
- The target runtime exists when agents are imported. For a daemon, log it in to the target first with its own profile (`multica login --server-url <target> --profile <name>`, then `multica daemon start --profile <name>`).
- The shell is outside an agent task directory, or the agent holds a task-scoped `mat_` token for the target. See the credentials note in the planning skill.

## Order

```sh
export MIGRATION_BUNDLE=$PWD            # the bundle folder
python3 import_agents.py --runtime "<runtime name>"          # dry run
python3 import_agents.py --apply --runtime "<runtime name>"  # skills, agents, skill assignment, verify
python3 import_project.py                                    # dry run
python3 import_project.py --apply [--assign-open "<agent>"]  # project, issues, comments, id map, verify
python3 import_project.py --verify
```

Agents come first so `--assign-open` can resolve names. Assigning an agent can start runs: import first, assign after the daemon is attached, unless the user says otherwise.

## Behavior

- Dry runs print the plan and change nothing. Show the dry-run output and get approval before `--apply`.
- Resumable: created ids are stored in `state*.json`. A failed run can be re-run.
- Existing skills and agents with the same name are reused, not overwritten.
- Parents are created before children; statuses and stages are set at creation.
- `--verify` compares status, stage and comment count per issue and agent instructions and skill count. The run must end with `VERIFY PASSED`.

## Failures

- `agent execution context requires a task-scoped mat_ token`: the CLI blocks foreign-server calls from an agent task. Stop and offer the options in the planning skill.
- `runtime ... not found`: the daemon is not logged in to the target yet.
- Partial import: fix the cause and re-run `--apply`; do not delete the target project.

Report the verify output and the old-to-new identifier map to the user.
