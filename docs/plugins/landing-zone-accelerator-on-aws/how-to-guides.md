---
title: How-to guides
description: Task-focused recipes for common LZA operations through the agent.
sidebar_position: 3
---

# How-to guides

Each recipe assumes you have completed the [tutorial](./tutorial.md) and that the agent has verified connectivity.

## Add a property to a configuration file

1. Find the exact property first: ask the agent to search the schema for the concept (e.g. "search the network schema for VPC flow log settings"). It calls `getDeployedLzaVersion` then `searchJsonSchema`.
2. Confirm the property's type with `getFullSchema` if the search is ambiguous.
3. Ask the agent to apply the change: "set `<dot.notation.path>` to `<value>` in network-config.yaml". It uses `updateLzaConfigFile` (update mode) with built-in CIDR/ASN/mask validation.
4. Review the re-read file the agent shows you before uploading.

## Add an item to a YAML list

Ask the agent to insert into the list, e.g. "add a new subnet entry to the `vpcs[0].subnets` list in network-config.yaml". The agent uses `updateLzaConfigFile` in insert mode. Provide the item fields; the agent validates them against the schema before writing.

## Add an IAM policy document

1. "Create a JSON IAM policy file `policies/my-policy.json` with …" → the agent calls `createLzaConfigFile`.
2. "Reference `policies/my-policy.json` from iam-config.yaml" → the agent updates `iam-config.yaml` with `updateLzaConfigFile`.

## Generate a baseline configuration for a new deployment

Ask: "Generate a minimum LZA configuration." The agent calls `getMinimumConfiguration`, which produces required accounts and baseline settings you can extend.

## Upload configuration and deploy

1. "Upload my configuration changes." → `putLzaConfiguration` (writes to CodeCommit or S3, matching the source). The agent confirms before running this mutating call.
2. "Start the LZA pipeline." → `startDeployment`. Confirm intent; this changes infrastructure.
3. "What's the pipeline status?" → `getDeploymentStatus`, polled for stage progress.

## Approve or reject a manual approval

1. "Check the pipeline status." When a Review stage is pending, `getDeploymentStatus` returns the approval token, stage/action names, and the CDK diff.
2. Review the diff the agent presents.
3. "Approve the pending deployment" (or "reject it"). The agent calls `submitManualApproval` with the returned identifiers. Approvals are never automatic.

## Diagnose a failed deployment

Ask: "The pipeline failed — diagnose it." The agent calls `diagnoseDeploymentErrors`, which analyzes CodeBuild/CloudWatch logs and returns targeted guidance. If the cause is an invalid property, re-validate against the schema and re-apply.

## Work with a CodeCommit-backed configuration

The server auto-detects CodeCommit sources. To target one explicitly, tell the agent the repository name (and branch): "Retrieve the configuration from the `aws-accelerator-config` CodeCommit repo." The agent passes `repository_name` (and optional `branch`) to `getLzaConfiguration`/`putLzaConfiguration`.

## Operate an external (qualifier-based) deployment

For external CodePipeline or ECS container deployments, tell the agent the qualifier: "Start the deployment with qualifier `my-lza`." The server checks both CodePipeline (`{qualifier}-pipeline`) and SSM Automation (`{qualifier}-RunEngine`) and acts on whichever exists.
