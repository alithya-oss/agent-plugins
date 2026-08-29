---
title: Explanation
description: How the plugin, the LZA MCP server, and LZA fit together, and the design choices behind them.
sidebar_position: 5
---

# Explanation

This page explains how the pieces relate and why the plugin is shaped the way it is. For task steps, see the [how-to guides](./how-to-guides.md); for exhaustive tool lists, see the [reference](./reference.md).

## The three layers

1. **Landing Zone Accelerator on AWS (LZA)** — an AWS solution that stands up and governs a secure multi-account environment. Its state lives in a set of YAML configuration files, each validated by a versioned JSON schema, and is applied by a deployment pipeline (CodePipeline, or an external CodePipeline/ECS engine).
2. **`awslabs/lza-mcp-server`** — a Model Context Protocol server that exposes LZA operations as tools. It runs as a container, invoked over stdio, and executes AWS API calls with your credentials. It embeds the LZA schemas at build time so schema search is fast and offline.
3. **This plugin** — packages an `mcp.json` that wires the server into the agent, plus Agent Skills that teach the agent *how* and *when* to use each tool.

The agent is the orchestrator: it reads the skills, calls the MCP tools, and mediates between you and AWS.

## Why skills are split by concern

The plugin follows the repository's "one concern per skill" rule. `lza-mcp-operations` is the entry point that always runs first (connectivity, version), then routes to `lza-configuration-management`, `lza-schema-discovery`, or `lza-pipeline-management`. Smaller skills keep each description sharp, so the agent activates the right one and avoids loading unrelated context.

## Why schema discovery precedes editing

LZA config files are schema-validated, and an invalid property fails the pipeline late — after a run has started. The skills therefore make schema lookup a precondition for editing: resolve the deployed version, then search and confirm the property before any `updateLzaConfigFile` call. This shifts errors left, from a failed deployment to a caught mistake at edit time. Because schemas are version-specific, every schema tool demands an explicit `lza_version`; there is no safe default.

## Why mutating tools are gated

Configuration and pipeline changes affect real infrastructure across many accounts. The plugin classifies tools as read-only or mutating and, in `mcp.json`, auto-approves only read-only tools. Mutating tools (`putLzaConfiguration`, `updateLzaConfigFile`, `createLzaConfigFile`, `startDeployment`, `submitManualApproval`) require explicit approval each time. The manual approval gate is deliberately never automated — it exists so a human reviews the CDK diff before infrastructure is deployed.

## Why the container is locked down

The server runs with `no-new-privileges`, all Linux capabilities dropped, a read-only root filesystem, and a `noexec` tmpfs. Since the container holds live AWS credentials and reaches production accounts, this hardening limits the blast radius of a container escape or a compromised dependency.

## Data-sharing consideration

The server sends AWS API responses to the AI provider. That is how the agent can reason about your configuration and pipeline state, but it also means configuration and log contents leave your environment. Treat account data accordingly and avoid retrieving resources your organization prohibits sharing with third parties.

## How configuration storage is resolved

LZA can store configuration in S3 (the default `aws-accelerator-config-*` bucket) or in CodeCommit. The server inspects the pipeline's source action and picks the matching API automatically, so the same tools work for both. You only specify `repository_name`/`branch` when you want to override the auto-detected CodeCommit target.
