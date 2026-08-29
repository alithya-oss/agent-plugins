---
name: lza-configuration-management
description: Use when reading, editing, generating, or uploading Landing Zone Accelerator on AWS (LZA) configuration files (accounts-config.yaml, network-config.yaml, global-config.yaml, iam-config.yaml, security-config.yaml, organization-config.yaml) through the awslabs.lza-mcp-server.
---

# LZA Configuration Management

Retrieve, edit, and upload LZA configuration files through the `awslabs.lza-mcp-server`. Always validate changes against the deployed schema before uploading — see the `lza-schema-discovery` skill.

## Golden rule: validate before you change

Before suggesting or making any change to an LZA config file, confirm the property exists and its type using `getDeployedLzaVersion` + `searchJsonSchema`/`getFullSchema`. Invalid properties or values reach the pipeline and fail the deployment. Never guess a property name.

## Configuration files

LZA configuration is a set of YAML files, each governed by its own schema:

| File | Purpose |
|------|---------|
| `accounts-config.yaml` | Account structure and metadata |
| `organization-config.yaml` | Organizational units and policies |
| `global-config.yaml` | Global settings, regions, logging |
| `network-config.yaml` | VPCs, subnets, transit gateways, routing |
| `iam-config.yaml` | IAM roles, policies, and identity |
| `security-config.yaml` | Guardrails, security services, controls |

## Workflow

1. **Establish context** — `checkAwsConnectivity`, then `getDeployedLzaVersion` (see `lza-mcp-operations`).
2. **Retrieve** — `getLzaConfiguration` downloads and extracts the current config. It auto-selects the source (S3 ZIP or CodeCommit) and returns a `host_path` for local file access. Place the config directory inside the IDE workspace for easier editing (`LZA_CONFIG_HOST_PATH` must match the volume mount).
3. **Inspect** — `readLzaConfigFile` reads an extracted file with path validation and context-aware guidance.
4. **Edit** — prefer `updateLzaConfigFile` for structured changes; `createLzaConfigFile` for new files.
5. **Validate** — cross-check every changed property against the schema (`lza-schema-discovery`).
6. **Upload** — `putLzaConfiguration` writes files back to the source (single CodeCommit `CreateCommit`, or S3 ZIP). This is a mutating operation: confirm with the user first.
7. **Deploy** — trigger and monitor the pipeline (`lza-pipeline-management`).

## Tools

- `getMinimumConfiguration` — generate a minimal baseline template for a new deployment (required accounts + baseline settings).
- `getLzaConfiguration` — download/extract current config; optional `repository_name`, `branch` for CodeCommit.
- `readLzaConfigFile` — read a single extracted file.
- `updateLzaConfigFile` — three mutually exclusive modes:
  - update an existing value by dot-notation path,
  - insert a new item into a YAML list,
  - delete a key or list item.
  Includes validation for CIDR ranges, ASN values, and VPC mask lengths.
- `createLzaConfigFile` — create a new YAML or JSON file (e.g., an IAM policy JSON), with configurable JSON indentation.
- `putLzaConfiguration` — upload files back to the config source; optional `commit_message` for CodeCommit.

## Editing tips

- Use `updateLzaConfigFile` dot-notation paths rather than rewriting whole files — it preserves structure and runs value validation.
- IAM policy documents belong in JSON files created via `createLzaConfigFile`, then referenced from `iam-config.yaml`.
- After any edit, re-read the file with `readLzaConfigFile` to confirm the result before uploading.

## Safety

- `putLzaConfiguration`, `updateLzaConfigFile`, and `createLzaConfigFile` modify configuration that drives real infrastructure. Summarize the change and get explicit approval before running them.
- Uploading config does not deploy it — a pipeline run is still required.
