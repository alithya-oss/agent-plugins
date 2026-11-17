#!/usr/bin/env python3
"""Replay a project export (made by export.py) into another Multica instance.

Reads <bundle>/export/*.json and
recreates the project, its repo resources, issues (parent/stage/status) and
comment threads with the `multica` CLI.

Credentials come ONLY from the environment; nothing is written to the repo:
  MULTICA_SERVER_URL   e.g. https://multica.fjusbx0.alithya.io
  MULTICA_TOKEN        personal token (mul_...) of the target instance
  MULTICA_WORKSPACE_ID target workspace id

Usage:
  python3 import_project.py                 # dry run, prints the plan
  python3 import_project.py --apply         # create everything (resumable via state.json)
  python3 import_project.py --verify        # compare target with export
  python3 import_project.py --apply --assign-open "GMR-FJUDITH (kiro)"
      # also assigns non-done issues; assigning an agent can start runs.
"""
import argparse, json, os, subprocess, sys
from pathlib import Path

EXPORT = Path(os.environ.get("MIGRATION_BUNDLE", Path.cwd())) / "export"  # bundle dir; override with MIGRATION_BUNDLE
STATE = EXPORT.parent / "state.json"  # git-ignored; maps source ids -> target ids
BIN = os.environ.get("MULTICA_BIN", "multica")
SRC = "source instance"


def load(name):
    return json.loads((EXPORT / name).read_text())


def cli(*args, stdin=None):
    out = subprocess.run([BIN, *args, "--output", "json"], input=stdin,
                         capture_output=True, text=True)
    if out.returncode:
        sys.exit(f"multica {' '.join(args[:3])} failed: {out.stderr.strip()}")
    return json.loads(out.stdout) if out.stdout.strip() else {}


def header(kind, src_ref, author, at):
    return (f"> Migrated {kind} from `{src_ref}` ({SRC}), "
            f"originally by **{author}** on {at}.\n\n")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--apply", action="store_true")
    ap.add_argument("--verify", action="store_true")
    ap.add_argument("--assign-open", metavar="ASSIGNEE")
    a = ap.parse_args()

    for v in ("MULTICA_SERVER_URL", "MULTICA_TOKEN", "MULTICA_WORKSPACE_ID"):
        if not os.environ.get(v):
            sys.exit(f"{v} must be set in the environment")

    global SRC
    meta, issues, actors = load("project.json"), load("issues.json"), load("actors.json")
    SRC = meta.get("source_server", SRC)
    proj = meta["project"]
    who = lambda t, i: actors.get(i or "", t or "unknown")
    st = json.loads(STATE.read_text()) if STATE.exists() else {"issues": {}, "comments": {}}
    save = lambda: STATE.write_text(json.dumps(st, indent=1))

    if a.verify:
        return verify(st, issues)

    # Parent issues first, then children by stage.
    issues.sort(key=lambda i: (i["parent_issue_id"] is not None, i["stage"] or 0))
    print(f"Target: {os.environ['MULTICA_SERVER_URL']} workspace {os.environ['MULTICA_WORKSPACE_ID']}")
    print(f"Project '{proj['title']}' + {len(meta['resources'])} repos, {len(issues)} issues, "
          f"{sum(len(i['_comments']) for i in issues)} comments")
    if not a.apply:
        for i in issues:
            print(f"  {i['identifier']:8} stage={i['stage']} {i['status']:12} {len(i['_comments']):3} comments  {i['title']}")
        print("Dry run. Re-run with --apply.")
        return

    if "project" not in st:
        args = ["project", "create", "--title", proj["title"],
                "--description", proj["description"] or "", "--status", proj["status"]]
        for r in meta["resources"]:
            args += ["--repo", r["resource_ref"]["url"]]
        st["project"] = cli(*args)["id"]; save()
        print("project", st["project"])

    for i in issues:
        if i["id"] in st["issues"]:
            continue
        body = header("issue", i["identifier"], who(i["creator_type"], i["creator_id"]), i["created_at"])
        if i["assignee_id"]:
            body += f"> Original assignee: {who(i['assignee_type'], i['assignee_id'])}\n\n"
        body += i["description"] or ""
        args = ["issue", "create", "--title", i["title"], "--description-stdin",
                "--project", st["project"], "--status", i["status"],
                "--priority", i["priority"], "--allow-duplicate"]
        if i["parent_issue_id"]:
            args += ["--parent", st["issues"][i["parent_issue_id"]]["id"]]
        if i["stage"]:
            args += ["--stage", str(i["stage"])]
        if a.assign_open and i["status"] not in ("done", "cancelled"):
            args += ["--assignee", a.assign_open]
        new = cli(*args, stdin=body)
        st["issues"][i["id"]] = {"id": new["id"], "identifier": new.get("identifier"), "src": i["identifier"]}
        save(); print(i["identifier"], "->", new.get("identifier"))

    for i in issues:
        tgt = st["issues"][i["id"]]["id"]
        for c in sorted(i["_comments"], key=lambda c: c["created_at"]):
            if c["id"] in st["comments"]:
                continue
            kind = "system event" if c["type"] == "system" else "comment"
            body = header(kind, i["identifier"], who(c["author_type"], c["author_id"]), c["created_at"]) + (c["content"] or "")
            args = ["issue", "comment", "add", tgt, "--content-stdin"]
            if c["parent_id"] and c["parent_id"] in st["comments"]:
                args += ["--parent", st["comments"][c["parent_id"]]]
            st["comments"][c["id"]] = cli(*args, stdin=body)["id"]; save()
        print(i["identifier"], "comments done")

    # Old -> new identifier table on the root issue, since bodies still cite ALIT-n.
    root = next(i for i in issues if not i["parent_issue_id"])
    if "map_comment" not in st:
        rows = "\n".join(f"| {v['src']} | {v['identifier']} |" for v in st["issues"].values())
        st["map_comment"] = cli("issue", "comment", "add", st["issues"][root["id"]]["id"], "--content-stdin",
                                stdin=f"Migration identifier map\n\n| Source | Target |\n|---|---|\n{rows}\n")["id"]
        save()
    verify(st, issues)


def verify(st, issues):
    ok = True
    for i in issues:
        m = st["issues"].get(i["id"])
        if not m:
            print(f"MISSING {i['identifier']}"); ok = False; continue
        t = cli("issue", "get", m["id"])
        c = cli("issue", "comment", "list", m["id"])
        c = c.get("comments", c) if isinstance(c, dict) else c
        extra = 1 if (not i["parent_issue_id"] and "map_comment" in st) else 0
        want = len(i["_comments"]) + extra
        good = t["status"] == i["status"] and t.get("stage") == i["stage"] and len(c) >= want
        ok &= good
        print(f"{'OK  ' if good else 'DIFF'} {i['identifier']} -> {m['identifier']} status {t['status']}/{i['status']} "
              f"stage {t.get('stage')}/{i['stage']} comments {len(c)}/{want}")
    print("VERIFY", "PASSED" if ok else "FAILED")
    sys.exit(0 if ok else 1)


if __name__ == "__main__":
    main()
