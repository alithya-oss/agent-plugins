---
name: multica-migration-cutover
description: Close out a Multica migration after the user confirms success. Use to retire the source project, point daemons at the new server, and clean up tokens and local copies.
---

# Cut over after a migration

Run only after the user confirms the target is correct (or the verify output shows `VERIFY PASSED` and the user agrees).

1. **Source project.** Set the agreed status. Multica has no archive status, so use the one the user chose (`cancelled` or `paused`; `completed` is misleading when issues are open):
   `multica project status <project-id> <status>`. Do not delete issues or the project. It is reversible with `... planned`.
2. **Daemon.** If the user wants a daemon on the new server: `multica login --server-url <target> --profile <name>`, `multica daemon start --profile <name>`, confirm the runtime shows online on the target. Keep the old profile until the user stops it. Never terminate a `multica` process by name; use `multica daemon status --output json` for the PID.
3. **Tokens.** Tell the user to revoke any personal token that was pasted in chat or used for the import.
4. **Local copies.** Offer to delete scratch exports from the working directory. The committed bundle is the record.
5. **Report.** Source status, runtime online on target, remaining manual items (MCP configs, env vars, attachments, daemon-host skills).
