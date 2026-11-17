#!/usr/bin/env bash
# Fail if an export bundle contains token-like strings or private keys.
# Usage: scan-secrets.sh <bundle-dir>
set -euo pipefail
dir="${1:?usage: scan-secrets.sh <bundle-dir>}"
# mul_/mat_ must be followed by a long hex-like run to avoid matching identifiers such as mat_numbered_section.
pattern='(mul_|mat_)[0-9a-f]{30,}|ghp_[A-Za-z0-9]{30,}|gho_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{30,}|AKIA[0-9A-Z]{16}|ASIA[0-9A-Z]{16}|xox[bp]-[A-Za-z0-9-]{20,}|sk-(ant-)?[A-Za-z0-9_-]{30,}|-----BEGIN [A-Z ]*PRIVATE KEY'
if grep -rEn --include='*.json' --include='*.md' --include='*.py' --include='*.sh' "$pattern" "$dir"; then
  echo "SECRET-LIKE STRINGS FOUND: review and remove before committing." >&2
  exit 1
fi
echo "no secret-like strings found in $dir"
