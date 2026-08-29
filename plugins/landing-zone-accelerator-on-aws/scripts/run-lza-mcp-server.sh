#!/usr/bin/env bash
# run-lza-mcp-server.sh — Launch the LZA MCP server container with temporary AWS credentials.
#
# Original work for the landing-zone-accelerator-on-aws Agent Plugin (MIT).
# It mirrors the credential-export approach documented by awslabs/lza-mcp-server
# but is an independent implementation, not a copy of upstream code.
#
# It exports temporary credentials from the active AWS CLI profile
# (AWS_PROFILE) and injects them into the container passed as arguments.
#
# Usage (invoked by mcp.json):
#   run-lza-mcp-server.sh docker run ... <image>
#
# The AWS CLI profile must be ready to use before launch (e.g. run
# `aws sso login --profile <profile>` for IAM Identity Center profiles).

set -euo pipefail

if ! command -v aws >/dev/null 2>&1; then
  echo "run-lza-mcp-server.sh: AWS CLI not found on PATH." >&2
  exit 1
fi

# Export temporary credentials from the active profile into this shell's env.
# `aws configure export-credentials --format env` prints `export KEY=VALUE`
# lines for AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY / AWS_SESSION_TOKEN.
if ! creds="$(aws configure export-credentials --format env 2>/dev/null)"; then
  echo "run-lza-mcp-server.sh: failed to export credentials for profile '${AWS_PROFILE:-default}'." >&2
  echo "  For IAM Identity Center, run: aws sso login --profile ${AWS_PROFILE:-<profile>}" >&2
  exit 1
fi
eval "$creds"

# Hand off to the container runtime and args supplied by mcp.json. The container
# receives the exported AWS_* variables via the `-e` flags in mcp.json.
exec "$@"
