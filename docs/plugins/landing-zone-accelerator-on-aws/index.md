---
title: Landing Zone Accelerator on AWS
description: User guide for the landing-zone-accelerator-on-aws agent plugin, which leverages the awslabs/lza-mcp-server.
sidebar_position: 1
---

# Landing Zone Accelerator on AWS

The `landing-zone-accelerator-on-aws` plugin gives an AI agent the skills and MCP tooling to manage a [Landing Zone Accelerator on AWS (LZA)](https://aws.amazon.com/solutions/implementations/landing-zone-accelerator-on-aws/) deployment. It wraps the [`awslabs/lza-mcp-server`](https://github.com/awslabs/lza-mcp-server) so the agent can discover configuration schemas, edit LZA config files, and orchestrate the deployment pipeline — with human approval on infrastructure changes.

## What's in this plugin

- **`mcp.json`** — MCP server definition for `awslabs.lza-mcp-server`, run as a security-hardened container.
- **Skills** — four focused Agent Skills:
  - `lza-mcp-operations` — entry point: connectivity, version discovery, and tool routing.
  - `lza-configuration-management` — read, edit, generate, and upload LZA config files.
  - `lza-schema-discovery` — search and retrieve version-specific LZA schemas.
  - `lza-pipeline-management` — start, monitor, approve, and diagnose deployments.

## Documentation

This guide follows the [Diátaxis](https://diataxis.fr) framework:

- **[Tutorial](./tutorial.md)** — get connected and inspect your first configuration.
- **[How-to guides](./how-to-guides.md)** — task-focused recipes for common operations.
- **[Reference](./reference.md)** — tools, environment variables, and configuration files.
- **[Explanation](./explanation.md)** — how the plugin, MCP server, and LZA fit together.

## Prerequisites

- Docker or Finch, with the MCP server image available — either pull the published `ghcr.io/alithya-oss/lza-mcp-server:latest` (built by the [publish workflow](../../../.github/workflows/publish-lza-mcp-server.yml)) or build `lza-mcp-server:local` from the [server README](https://github.com/awslabs/lza-mcp-server).
- AWS CLI installed and a profile for the account where LZA is deployed (IAM Identity Center recommended).
- An existing LZA deployment for configuration and pipeline operations.

## Image publishing

The `awslabs/lza-mcp-server` project distributes source only. This repository's [`publish-lza-mcp-server.yml`](../../../.github/workflows/publish-lza-mcp-server.yml) workflow builds it from upstream and publishes to `ghcr.io/alithya-oss/lza-mcp-server`. It runs on demand (`workflow_dispatch`, with inputs for the upstream ref and embedded LZA/UC versions) and weekly to pick up new LZA schemas.
