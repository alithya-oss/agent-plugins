---
title: Tutorial
description: Connect the LZA MCP server and inspect your first configuration.
sidebar_position: 2
---

# Tutorial: Your first LZA session

This tutorial takes you from zero to reading a live LZA configuration through the agent. By the end you will have built the MCP server image, configured it, verified connectivity, and retrieved a configuration file. It assumes you already have an LZA deployment.

## 1. Get the MCP server image

The upstream project ships source only. This repo publishes a prebuilt image to GHCR via the [Publish LZA MCP Server Image](../../../.github/workflows/publish-lza-mcp-server.yml) workflow, so you can pull instead of build:

```bash
docker pull ghcr.io/alithya-oss/lza-mcp-server:latest
```

Prefer to build it yourself? Clone [`awslabs/lza-mcp-server`](https://github.com/awslabs/lza-mcp-server) and run `make build` in `src/lza-mcp-server` (produces `lza-mcp-server:local`), then point the image reference in `mcp.json` at that tag.

## 2. Point the plugin at your environment

Open `plugins/landing-zone-accelerator-on-aws/mcp.json` and replace the placeholders:

- `<PLUGIN_PATH>` → the absolute path to this plugin directory (so the launcher script resolves), e.g. `/home/you/git/alithya-oss/agent-plugins/plugins/landing-zone-accelerator-on-aws`.
- `<CONFIG_PATH>` → a local directory for retrieved config (place it in your IDE workspace, e.g. `.kiro/lza-config`).
- `<YOUR_AWS_PROFILE>` → your AWS CLI profile with the LZA MCP IAM policy attached.
- `<YOUR_AWS_REGION>` → the region where LZA is deployed, e.g. `us-east-1`.

The `command` runs the plugin-owned `scripts/run-lza-mcp-server.sh`, which exports temporary credentials from your AWS profile and launches the container.

## 3. Sign in to AWS

If you use IAM Identity Center, start a session before the agent connects:

```bash
aws sso login --profile your-sso-profile
```

Sessions expire after 8-12 hours; re-run this command when you see authentication errors.

## 4. Verify connectivity

Ask the agent to confirm it can reach AWS:

> Check my AWS connectivity.

The agent calls `checkAwsConnectivity` and reports the authenticated identity. If this fails, revisit steps 2 and 3.

## 5. Discover the deployed version

> What LZA version is deployed?

The agent calls `getDeployedLzaVersion`. Note the version — every schema lookup needs it.

## 6. Retrieve and read a configuration file

> Retrieve my LZA configuration and show me the accounts config.

The agent calls `getLzaConfiguration` (downloading and extracting the config to your `<CONFIG_PATH>`), then `readLzaConfigFile` on `accounts-config.yaml`.

You have now completed a full read-only round trip: connect → version → retrieve → read. From here, move on to the [how-to guides](./how-to-guides.md) to make and deploy changes.
