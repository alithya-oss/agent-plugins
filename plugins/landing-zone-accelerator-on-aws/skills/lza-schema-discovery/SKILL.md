---
name: lza-schema-discovery
description: Use when discovering, searching, or validating Landing Zone Accelerator on AWS (LZA) configuration schema properties for a specific LZA version through the awslabs.lza-mcp-server. All schema tools require an explicit lza_version.
---

# LZA Schema Discovery

Search and retrieve LZA configuration schemas through the `awslabs.lza-mcp-server`. Use this before editing any config file to confirm property names, types, and constraints.

## Critical rule: version is mandatory

Every schema tool requires an explicit `lza_version` (e.g., `v1.12.0`). There is no default. Get the version first:

1. `getDeployedLzaVersion` — the version actually running (match this for edits to a live deployment).
2. `listLzaSupportedVersions` — all versions with embedded schemas (use to compare across releases).

If a search returns nothing, verify the version exists with `listLzaSupportedVersions` before assuming the property is missing.

## Tools

- `listLzaSupportedVersions` — list all versions with embedded schemas.
- `searchJsonSchema` — search by property names, patterns, or complexity. Requires `lza_version` and `search_terms`.
- `getFullSchema` — retrieve a complete schema or a specific property. Supports a `schema_path` filter for targeted queries.

## Schema files

Each version embeds one schema per config file:

```
accounts-config-schema.json
organization-config-schema.json
global-config-schema.json
network-config-schema.json
iam-config-schema.json
security-config-schema.json
combined.json
```

`$ref` pointers are pre-resolved, so schemas are self-contained. Search metadata (property names, types, patterns, relationships) is pre-computed for sub-second lookups.

## Workflow

1. Resolve the version (`getDeployedLzaVersion`).
2. Search for the concept:

   ```text
   searchJsonSchema(lza_version="v1.12.0", search_terms=["vpc", "subnet"])
   ```

3. Retrieve the exact definition for the matched property:

   ```text
   getFullSchema(lza_version="v1.13.0", schema_path="network-config-schema.json")
   ```

4. Use the confirmed property name and type when editing config (`lza-configuration-management`).

## Tips

- Search with the concept, not the guessed key name — the search metadata maps concepts to properties.
- Narrow `getFullSchema` with `schema_path` to avoid pulling a large document when you only need one property.
- To compare behavior across LZA versions, run the same search against each version from `listLzaSupportedVersions`.
