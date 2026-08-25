---
name: backstage-testing-conventions
description: Testing conventions for Backstage plugin development. Always run tests with CI=true to prevent interactive watch mode from blocking agents.
---

# Backstage Testing Conventions

## Critical rule

Always run tests in CI mode to prevent the Jest watch-mode prompt from blocking agent execution:

```bash
CI=true yarn test
```

This applies to all test invocations:

- Full workspace: `CI=true yarn test`
- Single plugin: `CI=true yarn test --filter=<plugin-package-name>`
- Specific files: `CI=true yarn test <path/to/test>`
- With coverage: `CI=true yarn test --coverage`

## Why CI=true?

By default, `yarn test` in a Backstage repo runs Jest in `--watch` mode when stdin is a TTY. This blocks indefinitely waiting for user input. Setting `CI=true` (or `CI=1`) disables watch mode and runs tests in single-pass mode.

## Test runner patterns

| Context | Command |
|---------|---------|
| Run all tests | `CI=true yarn test` |
| Run tests for a specific plugin | `CI=true yarn test --filter=@backstage/plugin-<name>` |
| Run tests matching a pattern | `CI=true yarn test -- --testPathPattern='<pattern>'` |
| Run a single test file | `CI=true yarn test <relative-path-to-test>` |
| Update snapshots | `CI=true yarn test -u` |
| Run with verbose output | `CI=true yarn test --verbose` |

## Before committing

Always verify:

```bash
CI=true yarn test
yarn tsc
yarn lint
```
