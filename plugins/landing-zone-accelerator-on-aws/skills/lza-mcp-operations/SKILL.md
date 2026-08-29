---
name: lza-mcp-operations
description: Use when operating Landing Zone Accelerator on AWS (LZA) through the awslabs.lza-mcp-server — verifying AWS connectivity, discovering the deployed LZA version, and choosing the right MCP tool for a task. Entry point that routes to configuration, schema, and pipeline skills.
---

# LZA MCP Operations

Operate a Landing Zone Accelerator on AWS (LZA) deployment through the `awslabs.lza-mcp-server` MCP server. This skill is the entry point: it establishes context (credentials, version) and routes to the focused skills for configuration, schema discovery, and pipeline work.

## Prerequisites

1. The `awslabs.lza-mcp-server` container image is available — pull `ghcr.io/alithya-oss/lza-mcp-server:latest` (published by this repo's workflow) or build `lza-mcp-server:local` from the server repo — and configured in `mcp.json`.
2. Valid AWS credentials for the account where LZA is deployed. For IAM Identity Center, run `aws sso login --profile <profile>` first — sessions expire after 8-12 hours.
3. An existing LZA deployment for configuration and pipeline operations.

## Always start here

Before any LZA operation, establish context in this order:

1. **Verify connectivity** — call `checkAwsConnectivity` to confirm credentials and the authenticated identity. If it fails, re-run `aws sso login` and reconnect the MCP server.
2. **Get the deployed version** — call `getDeployedLzaVersion`. Every schema tool requires an explicit `lza_version`; use the value returned here.

Never assume a version. Schema searches with a wrong or missing `lza_version` return no results or the wrong shape.

## Privacy guardrail

This server executes AWS API calls with your credentials and shares the responses with the AI provider. Do not retrieve configuration or logs from accounts holding data your organization prohibits sharing. Flag this to the user before pulling sensitive resources.

## Tool routing

| Goal | Skill | Key tools |
|------|-------|-----------|
| Read, edit, or upload config files | `lza-configuration-management` | `getLzaConfiguration`, `readLzaConfigFile`, `updateLzaConfigFile`, `createLzaConfigFile`, `putLzaConfiguration`, `getMinimumConfiguration` |
| Discover or validate schema properties | `lza-schema-discovery` | `listLzaSupportedVersions`, `searchJsonSchema`, `getFullSchema` |
| Run, monitor, approve, or diagnose deployments | `lza-pipeline-management` | `startDeployment`, `getDeploymentStatus`, `diagnoseDeploymentErrors`, `submitManualApproval` |

## Read-only vs. mutating tools

Read-only tools (safe to auto-approve): `checkAwsConnectivity`, `getDeployedLzaVersion`, `listLzaSupportedVersions`, `searchJsonSchema`, `getFullSchema`, `getDeploymentStatus`, `getLzaConfiguration`, `readLzaConfigFile`, `getMinimumConfiguration`.

Mutating tools (always require explicit user approval): `putLzaConfiguration`, `updateLzaConfigFile`, `createLzaConfigFile`, `startDeployment`, `submitManualApproval`.

## Deployment types

The server supports three deployment types. When a `qualifier` is provided, the server checks both CodePipeline and SSM Automation / ECS and acts on whichever exists.

- **Standard CodePipeline** — default deployment in the management account (`{LZA_PREFIX}-Pipeline`, default prefix `AWSAccelerator`).
- **External CodePipeline** — separate orchestration account, pipeline named `{qualifier}-pipeline`.
- **External ECS container** — orchestration account, `{qualifier}-RunEngine` SSM Automation.

Configuration storage is auto-detected: S3 (`aws-accelerator-config-*` bucket) by default, or CodeCommit when the pipeline's source action is CodeCommit. Pass `repository_name` (and optional `branch`) to target CodeCommit explicitly.

## Troubleshooting

- **Missing `lza_version`** — all schema tools need an explicit version; call `getDeployedLzaVersion` or `listLzaSupportedVersions`.
- **Credentials expired / signature errors** — re-run `aws sso login`; `InvalidSignatureException: Signature expired` usually means container clock skew, so restart the container runtime.
- **Bucket / pipeline not found** — confirm the profile, region, and `LZA_PREFIX` match the actual deployment.
