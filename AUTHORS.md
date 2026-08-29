# Authors

This file credits the maintainers of this repository and attributes the upstream
sources whose Agent Skills are redistributed here. See
[ADR 0002](docs/adrs/0002-author-credit-and-upstream-attribution.md) for the
rationale.

## Maintainers

- Alithya — <https://github.com/alithya-oss>

## Upstream attributions

Several plugins in this repository redistribute Agent Skills synced from
upstream projects. Those skills remain the work of their original authors and
are used under their respective licenses. The sync tooling under `src/` keeps
these copies up to date; the upstream project is the source of truth.

| Plugin | Upstream source | Author | License |
| ------ | --------------- | ------ | ------- |
| `backstage-development` | [backstage/backstage](https://github.com/backstage/backstage) (`docs/.well-known/skills`) | The Backstage Authors | Apache-2.0 |
| `backstage-development` | [vinzscam/backstage-skills](https://github.com/vinzscam/backstage-skills) | Vincenzo Scamporlino | Apache-2.0 |
| `likec4-diagramming` | [likec4/likec4](https://github.com/likec4/likec4) (`skills`) | Denis Davydkov and LikeC4 contributors | MIT |
| `adr` | [zircote-plugins/adr](https://github.com/zircote-plugins/adr) (`skills`) | zircote | MIT |

Plugins authored in this repository (for example `hello-world`, and the
`com.multica` agents and `dev.kiro` hooks under `plugins/`) are original work by
the maintainers listed above and are licensed under [MIT](LICENSE).

When a new synced plugin is added, add a row to the table above with its
upstream repository URL, author, and license.
