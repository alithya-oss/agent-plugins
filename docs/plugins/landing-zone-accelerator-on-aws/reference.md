---
title: Reference
description: Tools, environment variables, configuration files, and skills for the LZA plugin.
sidebar_position: 4
---

# Reference

## Skills

| Skill | Purpose |
|-------|---------|
| `lza-mcp-operations` | Entry point: connectivity check, version discovery, tool routing, deployment-type notes. |
| `lza-configuration-management` | Retrieve, read, edit, generate, and upload LZA config files. |
| `lza-schema-discovery` | Search and retrieve version-specific LZA schemas. |
| `lza-pipeline-management` | Start, monitor, approve, and diagnose deployments. |

## MCP tools

### AWS and version

| Tool | Mutating | Purpose |
|------|:--------:|---------|
| `checkAwsConnectivity` | no | Verify credentials, report authenticated identity. |
| `getDeployedLzaVersion` | no | Read the deployed LZA version from SSM Parameter Store. |

### Configuration management

| Tool | Mutating | Purpose |
|------|:--------:|---------|
| `getMinimumConfiguration` | no | Generate a minimal baseline config template. |
| `getLzaConfiguration` | no | Download/extract current config (S3 or CodeCommit). |
| `readLzaConfigFile` | no | Read a file from the extracted config directory. |
| `updateLzaConfigFile` | yes | Update a value, insert a list item, or delete a key/item. |
| `createLzaConfigFile` | yes | Create a new YAML or JSON config file. |
| `putLzaConfiguration` | yes | Upload config files back to the source. |

### Schema discovery

| Tool | Mutating | Purpose |
|------|:--------:|---------|
| `listLzaSupportedVersions` | no | List versions with embedded schemas. |
| `searchJsonSchema` | no | Search schemas by property/pattern/complexity (needs `lza_version`). |
| `getFullSchema` | no | Retrieve a full schema or a specific property path. |

### Pipeline management

| Tool | Mutating | Purpose |
|------|:--------:|---------|
| `startDeployment` | yes | Start a deployment (standard, external, or ECS). |
| `getDeploymentStatus` | no | Stage-level status; detects pending approvals + diff. |
| `diagnoseDeploymentErrors` | no | Analyze failed-deployment logs, return guidance. |
| `submitManualApproval` | yes | Approve or reject a pending manual approval. |

### Universal Configuration merge (optional)

Enabled with `ENABLE_UC_MERGE=true`. Adds nine tools (`validateLzaForUcMerge`, `get_uc_releases`, `get_uc_network_models`, `start_uc_merge_session`, `readUcFile`, `updateUcFile`, `getUcNetworkCustomizationGuide`, `copyUcToLzaConfig`). Increases context usage; enable only when merging UC templates.

## Configuration files

| File | Schema | Governs |
|------|--------|---------|
| `accounts-config.yaml` | `accounts-config-schema.json` | Account structure and metadata. |
| `organization-config.yaml` | `organization-config-schema.json` | OUs and policies. |
| `global-config.yaml` | `global-config-schema.json` | Global settings, regions, logging. |
| `network-config.yaml` | `network-config-schema.json` | VPCs, subnets, TGWs, routing. |
| `iam-config.yaml` | `iam-config-schema.json` | IAM roles, policies, identity. |
| `security-config.yaml` | `security-config-schema.json` | Guardrails, security services. |

## Environment variables (mcp.json)

| Variable | Default | Purpose |
|----------|---------|---------|
| `LZA_CONFIG_HOST_PATH` | — | Local config path; must match the `-v` volume mount. |
| `AWS_PROFILE` | — | AWS CLI profile with the LZA MCP policy attached. |
| `AWS_REGION` | — | Region where LZA is deployed. |
| `LZA_PREFIX` | `AWSAccelerator` | Resource-naming prefix used by the deployment. |
| `FASTMCP_LOG_LEVEL` | `INFO` | Log verbosity (`ERROR`, `WARNING`, `INFO`, `DEBUG`). |
| `ENABLE_UC_MERGE` | `false` | Enable the nine UC merge tools. |
| `LOG_INSTRUCTIONS` | `false` | Log MCP server instructions at startup. |
| `DISABLE_LLM_GUIDANCE` | `false` | Strip guidance keys from tool responses. |
| `ENABLE_S3_DIFF` | `false` | Retrieve deployment diff from S3 on pending approval. |

## Container security flags

The `mcp.json` runs the server with hardening: `--security-opt=no-new-privileges:true`, `--cap-drop=ALL`, `--read-only`, and a `noexec` tmpfs for `/tmp`. Keep Docker/Finch updated for the latest patches.

## IAM policies

Pick the policy matching your deployment (from the server repo `iam-policies/`):

| Deployment type | Policy |
|-----------------|--------|
| Standard CodePipeline | `standard-codepipeline-policy.json` |
| External — CodePipeline | `external-codepipeline-policy.json` |
| External — ECS container | `external-ecs-container-policy.json` |

Manual approval additionally requires `codepipeline:GetPipelineState` and `codepipeline:PutApprovalResult`; S3 diff retrieval requires `s3:GetObject` on the diff bucket.

## Plugin files

| File | Purpose |
|------|---------|
| `plugin.json` | Plugin manifest (Agent Plugins v1.0.0). |
| `mcp.json` | MCP server definition; `command` runs the launcher, image is `ghcr.io/alithya-oss/lza-mcp-server:latest`. |
| `scripts/run-lza-mcp-server.sh` | Plugin-owned launcher: exports temp AWS creds from the profile, then runs the container. |
| `skills/*/SKILL.md` | The four Agent Skills. |

## Image

- Published: `ghcr.io/alithya-oss/lza-mcp-server:latest` (and `lza-<version>`, short-SHA, and dated tags).
- Built by [`.github/workflows/publish-lza-mcp-server.yml`](../../../.github/workflows/publish-lza-mcp-server.yml) from upstream `awslabs/lza-mcp-server`.
- Workflow inputs: `upstream_ref`, `lza_min_version`, `lza_max_version`, `lza_uc_release`, `image_tag`.

## Source

- MCP server: [`awslabs/lza-mcp-server`](https://github.com/awslabs/lza-mcp-server) (Apache-2.0).
- LZA solution: [Landing Zone Accelerator on AWS](https://aws.amazon.com/solutions/implementations/landing-zone-accelerator-on-aws/).
