---
status: accepted
date: 2026-08-24
decision-makers: Alithya OSS maintainers
consulted: []
informed: []
---

# Credit authors with AUTHORS.md and attribute upstream sources

## Context and Problem Statement

This repository maintains its own plugins but also redistributes Agent Skills
synced from upstream projects (for example `backstage/backstage`,
`likec4/likec4`, `vinzscam/backstage-skills`, and `zircote-plugins/adr`). We
need a clear, conventional place to credit the people and organizations behind
the work.

Two distinct concerns are in play: crediting this repository's maintainers
(authorship), and attributing the upstream projects whose skills are
redistributed here (attribution and license compliance). How should we record
credit so that both maintainers and upstream sources are acknowledged without
implying that Alithya authored the synced content?

## Decision Drivers

* Follow a widely recognized convention that contributors and tools expect.
* Distinguish maintainer authorship from redistributed upstream content.
* Comply with the licenses of synced upstream sources.
* Keep the source of truth easy to update as new synced plugins are added.

## Considered Options

* `AUTHORS.md` for maintainers plus an upstream attribution section.
* Separate `AUTHORS`/`CONTRIBUTORS` files, with a `NOTICE` for attribution.
* Rely on git history and per-`plugin.json` `author` fields only.

## Decision Outcome

Chosen option: "`AUTHORS.md` for maintainers plus an upstream attribution
section", because a single, conventional file credits the maintainers while an
explicit attribution section acknowledges each redistributed upstream source
with its URL and license — satisfying both authorship and license-compliance
concerns with minimal maintenance overhead.

The file records Alithya as the maintainer and lists each upstream skill source
with its repository URL and license. New synced plugins add an entry to the
attribution section.

### Consequences

* Good, because credit and upstream attribution live in one conventional,
  discoverable file.
* Good, because it makes license compliance for redistributed skills explicit.
* Neutral, because the attribution section must be kept current when synced
  sources are added, changed, or removed.
* Bad, because it duplicates some information already present in each plugin's
  `plugin.json` `author` field; the `AUTHORS.md` file is treated as the
  human-facing source of truth for credit.

### Confirmation

Compliance is confirmed by the presence of an `AUTHORS.md` at the repository
root that lists the maintainers and an attribution entry (repository URL and
license) for every synced upstream source.

## Pros and Cons of the Options

### `AUTHORS.md` for maintainers plus an upstream attribution section

* Good, because `AUTHORS` is a widely recognized convention for crediting a
  project's authors.
* Good, because a single file covers both authorship and upstream attribution.
* Neutral, because it requires manual updates as synced sources change.

### Separate `AUTHORS`/`CONTRIBUTORS` files, with a `NOTICE` for attribution

* Good, because it cleanly separates authors, contributors, and legal
  attribution.
* Bad, because three files add maintenance overhead that is disproportionate to
  a repository of this size.
* Bad, because a `NOTICE` file is most idiomatic under Apache-2.0, whereas this
  repository is MIT-licensed.

### Rely on git history and per-`plugin.json` `author` fields only

* Good, because it requires no additional files.
* Bad, because there is no single human-facing place that credits maintainers.
* Bad, because it does not attribute the redistributed upstream sources or their
  licenses, risking non-compliance.

## More Information

* [AUTHORS file convention](https://en.wikipedia.org/wiki/README#Contents)
* [MADR](https://adr.github.io/madr/)
