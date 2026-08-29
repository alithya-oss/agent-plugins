---
name: lza-pipeline-management
description: Use when starting, monitoring, approving, or diagnosing Landing Zone Accelerator on AWS (LZA) pipeline deployments through the awslabs.lza-mcp-server, including manual approval gates on the Review stage.
---

# LZA Pipeline Management

Run and monitor LZA deployments through the `awslabs.lza-mcp-server`. Covers standard CodePipeline, external CodePipeline, and external ECS container deployments.

## Deployment workflow

1. **Upload configuration** — apply config changes with `putLzaConfiguration` (see `lza-configuration-management`).
2. **Start** — `startDeployment` begins the pipeline run. This is mutating; confirm with the user first.
3. **Monitor** — poll `getDeploymentStatus` for stage-level progress.
4. **Approve** (if the Review stage gates) — `submitManualApproval`.
5. **Diagnose** (on failure) — `diagnoseDeploymentErrors`.

## Tools

- `startDeployment` — starts a deployment. For standard deployments it runs `{LZA_PREFIX}-Pipeline`. With a `qualifier`, it checks both CodePipeline (`{qualifier}-pipeline`) and SSM Automation (`{qualifier}-RunEngine`) and starts whichever exists.
- `getDeploymentStatus` — real-time status for all pipeline stages. Works for CodePipeline and ECS container deployments. Detects a pending approval and returns `approval_token`, `approval_stage_name`, `approval_action_name`, the review diff, and change context.
- `diagnoseDeploymentErrors` — analyzes logs for a failed deployment and returns troubleshooting guidance. Supports CodePipeline and ECS container deployments.
- `submitManualApproval` — approves or rejects a pending approval. Requires `approval_token`, `approval_stage_name`, and `approval_action_name` from `getDeploymentStatus`.

## Manual approval gate

The LZA CodePipeline can include an optional Review stage that runs CDK diff and waits for approval before deploying infrastructure:

1. Call `getDeploymentStatus`. When an approval is pending it returns the token, stage/action names, and the review diff (from the Review stage CodeBuild logs).
2. Present the diff to the user and get an explicit approve/reject decision — this gate exists precisely so a human reviews infrastructure changes.
3. Call `submitManualApproval` with the returned identifiers and the decision.

Never auto-approve. `submitManualApproval` is mutating and represents a human sign-off on infrastructure changes.

## Diagnosing failures

When a run fails, call `diagnoseDeploymentErrors` before guessing. It reads the relevant build/deployment logs (CloudWatch Logs, CodeBuild) and returns targeted guidance. Common causes:

- Pipeline not found — confirm the pipeline name matches the deployment (default `AWSAccelerator-Pipeline`) and that `LZA_PREFIX` and region are correct.
- Immediate failure — inspect container logs, raise `FASTMCP_LOG_LEVEL` to `DEBUG` for more detail.
- Invalid configuration — a schema-invalid property will fail the run; re-validate with `lza-schema-discovery`.

## Safety

- `startDeployment` and `submitManualApproval` change live infrastructure. Confirm intent with the user and, for approvals, present the diff first.
- Manual approval and S3 diff retrieval require additional IAM permissions beyond the base policy (`codepipeline:GetPipelineState`, `codepipeline:PutApprovalResult`; `s3:GetObject` for diffs). If approval or diff calls fail with access errors, the policy likely lacks these.
