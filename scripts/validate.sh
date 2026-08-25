#!/usr/bin/env bash
# validate.sh — Validate all plugin.json manifests against the Agent Plugins v1.0.0 schema.
#
# Requirements:
#   - Node.js (>= 18)
#
# Usage:
#   ./scripts/validate.sh            # validate all plugins
#   ./scripts/validate.sh my-plugin  # validate a single plugin by name

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PLUGINS_DIR="$REPO_ROOT/plugins"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color

# Check dependency
if ! command -v node &> /dev/null; then
  echo -e "${RED}Error:${NC} 'node' is not installed."
  exit 1
fi

# Determine which plugins to validate
if [[ $# -gt 0 ]]; then
  PLUGINS=("$@")
else
  PLUGINS=()
  for dir in "$PLUGINS_DIR"/*/; do
    [[ -d "$dir" ]] && PLUGINS+=("$(basename "$dir")")
  done
fi

if [[ ${#PLUGINS[@]} -eq 0 ]]; then
  echo -e "${YELLOW}No plugins found under ${PLUGINS_DIR}/${NC}"
  exit 0
fi

ERRORS=0
VALIDATED=0

echo "Validating plugin manifests against Agent Plugins v1.0.0 schema..."
echo ""

for plugin in "${PLUGINS[@]}"; do
  manifest="$PLUGINS_DIR/$plugin/plugin.json"

  if [[ ! -f "$manifest" ]]; then
    echo -e "  ${RED}✗${NC} $plugin — plugin.json not found"
    ERRORS=$((ERRORS + 1))
    continue
  fi

  # Run the Node.js validator
  result=$(node "$REPO_ROOT/scripts/validate-plugin.mjs" "$manifest" 2>&1) && valid=true || valid=false

  if $valid; then
    echo -e "  ${GREEN}✓${NC} $plugin"
    VALIDATED=$((VALIDATED + 1))
  else
    echo -e "  ${RED}✗${NC} $plugin — schema validation failed:"
    echo "$result" | sed 's/^/      /'
    ERRORS=$((ERRORS + 1))
  fi
done

echo ""
echo "Results: ${VALIDATED} passed, ${ERRORS} failed"

if [[ $ERRORS -gt 0 ]]; then
  exit 1
fi
