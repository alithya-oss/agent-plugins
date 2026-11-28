---
name: postmortem-template
description: This skill should be used when the user asks to "write a post-mortem", "postmortem template", "rédiger un post-mortem", "bilan de projet", "retour d'expérience", or needs the Alithya project post-mortem structure (vision, changes, risks, budget, lessons learned, ROI, problem appendix).
---

# Post-mortem Template

Produce a blameless project post-mortem from the Alithya template in `references/template.fr.md`.

## Workflow

1. Copy `references/template.fr.md` to the target location (for example `docs/postmortem/<project>.md`).
2. Fill the front matter, then replace every `[...]` placeholder with facts from project evidence (issues, pull requests, commits, ADRs, comments). Never invent facts, dates, names, or figures.
3. Mark any section lacking evidence as `À compléter: <what is missing>` instead of guessing.
4. Remove template-only guidance comments before delivery.

## Front matter

The front matter follows the [Front Matter CMS field specification](https://frontmatter.codes/docs/content-creation/fields/#standard-field-properties). Each field is defined in `references/frontmatter.content-type.json` with the standard properties `name` and `type` (required), plus `title`, `description`, `default`, and `required`.

- `title` (string, required): `Post-mortem <project name>`.
- `description` (string, required): short project description.
- `date` (datetime): ISO 8601 date of writing; use `{{now}}` semantics.
- `draft` (draft, boolean): `true` until reviewed, then `false`.

Keep the front matter keys of the document in sync with the field `name` values of that content type. Merge the content type into the target repository's `frontmatter.json` when it uses Front Matter CMS.

## Rules

- Write in French unless the user requests another language.
- Stay blameless: describe causes in terms of systems, processes, and decisions, never individuals' faults.
- Keep the section order and headings of the template.
- Every problem listed in "Problèmes et risques" needs a matching entry in "Annexe-1 Problèmes & résolutions" (symptom, analysis, solution, result).
- Compare planned and actual dates in "Changement dans le plan"; cite sources.
- In "Ressources", list only people confirmed by evidence; compute the total person-days from the rows.

## Sections

Avant-propos, Livraison de la vision, Changements qui ont impacté la vision, Problèmes et risques, Résumé budgétaire, Leçons apprises, Axes d'amélioration, Retours sur investissement, Conclusion, Annexe-1 Problèmes & résolutions.
