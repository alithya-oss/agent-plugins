---
status: accepted
date: 2026-08-24
decision-makers: Alithya OSS maintainers
consulted: []
informed: []
---

# Use Changesets for changelog generation

## Context and Problem Statement

The repository is a monorepo of Agent Plugins. Each plugin carries its own
version in its `plugin.json` manifest (not `package.json`), the root
`package.json` is `private`, and nothing is published to npm.

We want a consistent, low-friction way to record notable changes and generate a
human-readable changelog on release. How should we manage changelog generation
in a way that fits a private, non-published, single-root plugin repository?

## Decision Drivers

* Low contributor friction for recording changes.
* Human-readable changelog with author and PR attribution.
* Minimal configuration and tooling complexity.
* Fit for a private repository that does not publish to npm.
* No inter-plugin dependency graph to manage.

## Considered Options

* Adopt Changesets with a minimal, adapted configuration.
* Adopt Changesets with the full `backstage/backstage` configuration.
* Maintain the changelog manually.

## Decision Outcome

Chosen option: "Adopt Changesets with a minimal, adapted configuration",
because it provides automated, attributed changelog generation with the least
complexity while matching this repository's private, single-root nature.

The configuration is adapted to this repository:

* `access: restricted` — the root package is private and not published.
* `baseBranch: main`.
* `changelog: @changesets/changelog-github` — author and PR links, no custom
  changelog function.
* No experimental peer-dependency options and no `linked` groups, since there
  are no inter-plugin dependencies.

For now, Changesets manages a single repository-level `CHANGELOG.md` and the
root package version. Individual `plugin.json` versions remain managed manually.

### Consequences

* Good, because contributors add a changeset describing user-facing changes and
  releases produce one aggregated, attributed changelog.
* Good, because the configuration stays small and understandable.
* Bad, because Changesets does not update `plugin.json` versions on its own; if
  independent per-plugin versioning becomes necessary, we will revisit this
  decision and introduce private per-plugin `package.json` workspaces plus a
  post-version step that mirrors versions into each `plugin.json`.

### Confirmation

Compliance is confirmed by the presence of `.changeset/config.json` matching
the decided configuration and a generated repository-level `CHANGELOG.md` on
release.

## Pros and Cons of the Options

### Adopt Changesets with a minimal, adapted configuration

* Good, because it automates changelog generation with author/PR attribution.
* Good, because the configuration is small and matches a private, single-root
  repository.
* Neutral, because it manages only a repository-level changelog for now.
* Bad, because it does not version individual `plugin.json` files without
  additional tooling.

### Adopt Changesets with the full `backstage/backstage` configuration

* Good, because it is a proven configuration for a large monorepo.
* Bad, because it targets a graph of interdependent published npm packages
  (custom changelog function, npm workspaces, `access: public`, internal
  dependency cascading) that provide no value here.
* Bad, because plugins are versioned via `plugin.json`, not `package.json`, so
  most of its features would find nothing to act on.

### Maintain the changelog manually

* Good, because it requires no tooling.
* Bad, because it is error-prone, inconsistent, and adds ongoing maintenance
  burden without author/PR attribution.

## More Information

* [Changesets](https://github.com/changesets/changesets)
* [MADR](https://adr.github.io/madr/)
