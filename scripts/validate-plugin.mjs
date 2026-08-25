#!/usr/bin/env node
/**
 * validate-plugin.mjs — Validate a plugin.json file against the Agent Plugins v1.0.0 schema.
 *
 * Uses only Node.js built-ins (no external dependencies required with Node >= 18).
 *
 * Usage: node scripts/validate-plugin.mjs path/to/plugin.json
 */

import { readFile } from "node:fs/promises";

const SCHEMA_URL =
  "https://agent-plugins.org/schemas/1.0.0/plugin.schema.json";

// Minimal JSON Schema Draft 2020-12 validator for the closed plugin.json schema.
// Covers: type, required, properties, additionalProperties, const, pattern,
// minLength, maxLength, array items.

async function fetchSchema() {
  const res = await fetch(SCHEMA_URL);
  if (!res.ok) throw new Error(`Failed to fetch schema: ${res.status}`);
  return res.json();
}

function validateValue(value, schema, path) {
  const errors = [];

  if (schema.const !== undefined) {
    if (value !== schema.const) {
      errors.push(`${path}: must be "${schema.const}", got "${value}"`);
    }
    return errors;
  }

  if (schema.type) {
    const types = Array.isArray(schema.type) ? schema.type : [schema.type];
    const actualType = Array.isArray(value) ? "array" : typeof value;
    if (value === null && !types.includes("null")) {
      errors.push(`${path}: must be ${types.join("|")}, got null`);
      return errors;
    }
    if (!types.includes(actualType)) {
      errors.push(`${path}: must be ${types.join("|")}, got ${actualType}`);
      return errors;
    }
  }

  if (schema.type === "string" || typeof value === "string") {
    if (schema.minLength !== undefined && value.length < schema.minLength) {
      errors.push(
        `${path}: string length ${value.length} < minLength ${schema.minLength}`
      );
    }
    if (schema.maxLength !== undefined && value.length > schema.maxLength) {
      errors.push(
        `${path}: string length ${value.length} > maxLength ${schema.maxLength}`
      );
    }
    if (schema.pattern) {
      const re = new RegExp(schema.pattern);
      if (!re.test(value)) {
        errors.push(`${path}: does not match pattern ${schema.pattern}`);
      }
    }
  }

  if (schema.type === "object" && typeof value === "object" && !Array.isArray(value)) {
    if (schema.required) {
      for (const key of schema.required) {
        if (!(key in value)) {
          errors.push(`${path}: missing required property "${key}"`);
        }
      }
    }
    if (schema.properties) {
      for (const [key, propSchema] of Object.entries(schema.properties)) {
        if (key in value) {
          errors.push(...validateValue(value[key], propSchema, `${path}.${key}`));
        }
      }
    }
    if (schema.additionalProperties === false && schema.properties) {
      const allowed = new Set(Object.keys(schema.properties));
      for (const key of Object.keys(value)) {
        if (!allowed.has(key)) {
          errors.push(`${path}: additional property "${key}" is not allowed`);
        }
      }
    }
    if (
      schema.additionalProperties &&
      typeof schema.additionalProperties === "object"
    ) {
      const knownKeys = new Set(
        schema.properties ? Object.keys(schema.properties) : []
      );
      for (const [key, val] of Object.entries(value)) {
        if (!knownKeys.has(key)) {
          errors.push(
            ...validateValue(val, schema.additionalProperties, `${path}.${key}`)
          );
        }
      }
    }
  }

  if (schema.type === "array" && Array.isArray(value)) {
    if (schema.items) {
      value.forEach((item, i) => {
        errors.push(...validateValue(item, schema.items, `${path}[${i}]`));
      });
    }
  }

  return errors;
}

// Main
const manifestPath = process.argv[2];
if (!manifestPath) {
  console.error("Usage: validate-plugin.mjs <path-to-plugin.json>");
  process.exit(1);
}

const [schema, manifestRaw] = await Promise.all([
  fetchSchema(),
  readFile(manifestPath, "utf-8"),
]);

let manifest;
try {
  manifest = JSON.parse(manifestRaw);
} catch (e) {
  console.error(`Invalid JSON: ${e.message}`);
  process.exit(1);
}

const errors = validateValue(manifest, schema, "$");

if (errors.length > 0) {
  for (const err of errors) {
    console.error(err);
  }
  process.exit(1);
}
