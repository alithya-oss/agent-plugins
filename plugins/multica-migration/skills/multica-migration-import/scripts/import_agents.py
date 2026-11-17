#!/usr/bin/env python3
"""Recreate workspace skills and agent definitions on the target Multica instance.

Reads export/skills.json and export/agents.json. Run it BEFORE import_project.py so that
`--assign-open` can resolve agent names.

Skills are copied verbatim (SKILL.md + every file) and keep their `config.origin`,
so `multica skill refresh` can still pull updates from GitHub later. Skills that
already exist on the target (same name) are reused, not overwritten.

Agents are bound to one target runtime (default: the one named "Kiro (GMR-FJUDITH)",
which appears once that daemon is logged in to the target server). Not exported, by design:
custom env vars and MCP configs (secret material; none of the 5 agents had any),
avatars, run history.

Credentials come only from the environment: MULTICA_SERVER_URL, MULTICA_TOKEN,
MULTICA_WORKSPACE_ID.

Usage:
  python3 import_agents.py                       # dry run
  python3 import_agents.py --apply [--runtime "Kiro (GMR-FJUDITH)" | --runtime-id <uuid>]
  python3 import_agents.py --verify
"""
import argparse, json, os, subprocess, sys
from pathlib import Path

EXPORT = Path(os.environ.get("MIGRATION_BUNDLE", Path.cwd())) / "export"  # bundle dir; override with MIGRATION_BUNDLE
STATE = EXPORT.parent / "state_agents.json"  # git-ignored
BIN = os.environ.get("MULTICA_BIN", "multica")


def cli(*args, stdin=None):
    out = subprocess.run([BIN, *args, "--output", "json"], input=stdin, capture_output=True, text=True)
    if out.returncode:
        sys.exit(f"multica {' '.join(args[:3])} failed: {out.stderr.strip()}")
    return json.loads(out.stdout) if out.stdout.strip() else {}


def as_list(d, key):
    return d.get(key, d) if isinstance(d, dict) else d


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--apply", action="store_true")
    ap.add_argument("--verify", action="store_true")
    ap.add_argument("--runtime", default="Kiro (GMR-FJUDITH)")
    ap.add_argument("--runtime-id")
    a = ap.parse_args()
    for v in ("MULTICA_SERVER_URL", "MULTICA_TOKEN", "MULTICA_WORKSPACE_ID"):
        if not os.environ.get(v):
            sys.exit(f"{v} must be set in the environment")

    skills = json.loads((EXPORT / "skills.json").read_text())
    agents = json.loads((EXPORT / "agents.json").read_text())
    st = json.loads(STATE.read_text()) if STATE.exists() else {"skills": {}, "agents": {}}
    save = lambda: STATE.write_text(json.dumps(st, indent=1))

    if a.verify:
        return verify(st, skills, agents)

    print(f"{len(skills)} skills ({sum(len(s['files'] or []) for s in skills)} extra files), {len(agents)} agents")
    for g in agents:
        print(f"  {g['name']:36} skills={len(g['skills']):2} permission={g['permission_mode']} max_tasks={g['max_concurrent_tasks']}")
    if not a.apply:
        print("Dry run. Re-run with --apply.")
        return

    runtime = a.runtime_id
    if not runtime:
        rts = [r for r in as_list(cli("runtime", "list"), "runtimes") if r.get("name") == a.runtime]
        if len(rts) != 1:
            sys.exit(f"runtime '{a.runtime}' not found on target (found {len(rts)}). "
                     "Log the daemon in to the target server first, or pass --runtime-id.")
        runtime = rts[0]["id"]
    print("runtime", runtime)

    existing = {s["name"]: s["id"] for s in as_list(cli("skill", "list"), "skills")}
    for s in skills:
        if s["id"] in st["skills"]:
            continue
        if s["name"] in existing:
            st["skills"][s["id"]] = existing[s["name"]]; save()
            print("skill reused", s["name"]); continue
        new = cli("skill", "create", "--name", s["name"], "--description", s["description"] or "",
                  "--config", json.dumps(s["config"] or {}), "--content-stdin", stdin=s["content"] or "")
        for f in s["files"] or []:
            cli("skill", "files", "upsert", new["id"], "--path", f["path"], "--content-stdin", stdin=f["content"])
        st["skills"][s["id"]] = new["id"]; save()
        print("skill created", s["name"], f"+{len(s['files'] or [])} files")

    existing = {g["name"]: g["id"] for g in as_list(cli("agent", "list"), "agents")}
    for g in agents:
        if g["id"] in st["agents"]:
            continue
        if g["name"] in existing:
            new_id = existing[g["name"]]
            print("agent exists, only syncing skills:", g["name"])
        else:
            args = ["agent", "create", "--name", g["name"], "--runtime-id", runtime,
                    "--description", g["description"] or "", "--instructions", g["instructions"] or "",
                    "--max-concurrent-tasks", str(g["max_concurrent_tasks"]),
                    "--custom-args", json.dumps(g["custom_args"] or []),
                    "--conversation-starters", json.dumps(g["conversation_starters"] or [])]
            for k in ("model", "thinking_level", "service_tier"):
                if g.get(k):
                    args += [f"--{k.replace('_', '-')}", g[k]]
            if g.get("runtime_config"):
                args += ["--runtime-config", json.dumps(g["runtime_config"])]
            if g["permission_mode"] == "public_to":
                # Source targets were the whole workspace; member targets cannot map across instances.
                args += ["--permission-mode", "public_to", "--public-to-workspace"]
            else:
                args += ["--permission-mode", "private"]
            new_id = cli(*args)["id"]
            print("agent created", g["name"])
        ids = [st["skills"][x["id"]] for x in g["skills"] if x["id"] in st["skills"]]
        if ids:
            cli("agent", "skills", "set", new_id, "--skill-ids", ",".join(ids))
        st["agents"][g["id"]] = new_id; save()
    verify(st, skills, agents)


def verify(st, skills, agents):
    ok = len(st["skills"]) == len(skills)
    print(f"skills mapped {len(st['skills'])}/{len(skills)}")
    for g in agents:
        tid = st["agents"].get(g["id"])
        if not tid:
            print("MISSING agent", g["name"]); ok = False; continue
        t = cli("agent", "get", tid)
        good = (t["name"] == g["name"] and t["instructions"] == g["instructions"]
                and len(t["skills"]) == len(g["skills"]))
        ok &= good
        print(f"{'OK  ' if good else 'DIFF'} {g['name']} skills {len(t['skills'])}/{len(g['skills'])}")
    print("VERIFY", "PASSED" if ok else "FAILED")
    sys.exit(0 if ok else 1)


if __name__ == "__main__":
    main()
