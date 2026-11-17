#!/usr/bin/env python3
"""Export a Multica project (plus optional agents and skills) to JSON, read-only.

Writes <out>/export/{project,issues,actors,agents,skills}.json for import_project.py
and import_agents.py. Uses only read commands of the `multica` CLI against the
server and workspace the CLI is currently configured for (the SOURCE).

Secrets are never exported: agent custom env vars and MCP configs are dropped
(only a `had_mcp_config` / `custom_env_key_count` hint is kept).

Usage:
  python3 export.py --project <id-or-exact-title> --out ./2026-01-01-subject
  python3 export.py --project <id> --out DIR --agents all --skills used
  python3 export.py --project <id> --out DIR --agents "Name A,Name B" --skills none

  --agents  none | all | comma-separated names        (default: none)
  --skills  none | all | used                          (default: used; "used" = skills of exported agents)
"""
import argparse, json, os, subprocess, sys, time
from pathlib import Path

BIN = os.environ.get("MULTICA_BIN", "multica")
SECRET_KEYS = ("mcp_config", "custom_env", "mcp_config_redacted", "has_custom_env")


def cli(*args):
    for attempt in range(4):  # retry transient network errors on these read-only calls
        out = subprocess.run([BIN, *args, "--output", "json"], capture_output=True, text=True)
        if out.returncode and "Could not reach" in out.stderr and attempt < 3:
            time.sleep(2 ** attempt)
            continue
        break
    if out.returncode:
        sys.exit(f"multica {' '.join(args[:3])} failed: {out.stderr.strip()}")
    return json.loads(out.stdout) if out.stdout.strip() else {}


def items(d, key):
    return d.get(key, d) if isinstance(d, dict) else d


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--project", required=True)
    ap.add_argument("--out", required=True)
    ap.add_argument("--agents", default="none")
    ap.add_argument("--skills", default="used")
    a = ap.parse_args()
    out = Path(a.out) / "export"
    out.mkdir(parents=True, exist_ok=True)
    dump = lambda name, obj: (out / name).write_text(json.dumps(obj, ensure_ascii=False, indent=1))

    projects = items(cli("project", "list"), "projects")
    match = [p for p in projects if a.project in (p["id"], p["title"])]
    if len(match) != 1:
        sys.exit(f"project '{a.project}' matched {len(match)} projects; pass the exact id")
    pid = match[0]["id"]
    project = cli("project", "get", pid)
    resources = cli("project", "resource", "list", pid)
    ws = cli("workspace", "get")
    server = os.environ.get("MULTICA_SERVER_URL", "")
    dump("project.json", {"source_server": server, "source_workspace": ws.get("name"),
                          "project": project, "resources": resources})

    issues, offset = [], 0
    while True:
        page = items(cli("issue", "list", "--project", pid, "--limit", "100", "--offset", str(offset)), "issues")
        issues += page
        if len(page) < 100:
            break
        offset += 100
    full = []
    for i in issues:
        g = cli("issue", "get", i["id"])
        g["_comments"] = items(cli("issue", "comment", "list", i["id"]), "comments")
        full.append(g)
        print(f"{g['identifier']}: {len(g['_comments'])} comments")
    full.sort(key=lambda i: i["number"])
    dump("issues.json", full)

    actors = {m["user_id"]: m["name"] for m in cli("workspace", "member", "list")}
    all_agents = items(cli("agent", "list"), "agents")
    actors.update({x["id"]: x["name"] for x in all_agents})
    dump("actors.json", actors)

    wanted = []
    if a.agents == "all":
        wanted = all_agents
    elif a.agents != "none":
        names = {n.strip() for n in a.agents.split(",")}
        wanted = [x for x in all_agents if x["name"] in names]
        missing = names - {x["name"] for x in wanted}
        if missing:
            sys.exit(f"agents not found: {sorted(missing)}")
    agents = []
    for x in wanted:
        g = cli("agent", "get", x["id"])
        g["had_mcp_config"] = g.get("mcp_config") is not None
        g["skills"] = [{"id": s["id"], "name": s["name"], "enabled": s.get("enabled", True)} for s in g["skills"]]
        for k in SECRET_KEYS:
            g.pop(k, None)
        agents.append(g)
    dump("agents.json", agents)

    skill_ids = set()
    if a.skills == "all":
        skill_ids = {s["id"] for s in items(cli("skill", "list"), "skills")}
    elif a.skills == "used":
        skill_ids = {s["id"] for g in agents for s in g["skills"]}
    skills = []
    for sid in sorted(skill_ids):
        g = cli("skill", "get", sid, "--with-content")
        skills.append({k: g.get(k) for k in ("id", "name", "description", "config", "content", "files")})
    dump("skills.json", skills)
    print(f"exported project '{project['title']}': {len(full)} issues, {len(agents)} agents, {len(skills)} skills -> {out}")
    print("Next: scan for secrets (see SKILL.md), then commit the bundle.")


if __name__ == "__main__":
    main()
