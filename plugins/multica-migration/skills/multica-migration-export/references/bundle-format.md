## Bundle format

```
<YYYY-MM-DD-subject>/
├── README.md              # run steps, scope, exclusions (no tokens)
├── .gitignore             # state.json, state_agents.json, __pycache__/
├── import_project.py      # project, issues, comments
├── import_agents.py       # skills, agents, skill assignments
└── export/
    ├── project.json       # {source_server, source_workspace, project, resources}
    ├── issues.json        # issues sorted by number; each has _comments[]
    ├── actors.json        # source member/agent id -> display name
    ├── agents.json        # agent definitions, secrets removed
    └── skills.json        # skills with content, files[] and config.origin
```

Importers read the bundle from `MIGRATION_BUNDLE` (default: the current directory) and write
`state.json` / `state_agents.json` next to `export/`. Delete a state file only to start over;
it is how a re-run avoids duplicates.
