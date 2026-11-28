---
name: slidev-deck
description: Generate and edit Slidev presentation decks in Markdown. Use when asked to create a slide deck, presentation, or edit a `slides.md` file, and for Slidev CLI build and export.
---

# Slidev deck

Slidev turns a single Markdown file (`slides.md`) into a presentation.

## Workflow

1. Clarify audience, duration, language and key message. Plan roughly one slide per minute.
2. Scaffold if no project exists: `npm init slidev@latest` (or add `@slidev/cli` and `@slidev/theme-default` to `package.json`).
3. Write `slides.md`. Validate with `npx slidev build` and fix errors before reporting.
4. Export on request: `npx slidev export` (PDF, needs `playwright-chromium`), `--format pptx`, or `--format png`.

## Syntax

- Separate slides with a line containing only `---`.
- The first block is the headmatter (YAML): `theme`, `title`, `info`, `transition`, `mdc: true`.
- A per-slide frontmatter block follows a `---` separator: `layout: two-cols`, `class`, `background`.
- Presenter notes: an HTML comment placed at the end of a slide.
- Layouts: `cover`, `intro`, `default`, `center`, `section`, `two-cols` (use `::right::` as divider), `image-right`, `image-left`, `quote`, `end`.
- Code: fenced blocks with line highlighting, e.g. ` ```ts {2,4-5} `; step-through with `{1|3|5-7}`.
- Animations: `<v-click>…</v-click>` or `v-click` directive; `<v-clicks>` for lists.
- Diagrams: ` ```mermaid ` fenced blocks. Maths: `$inline$` and `$$block$$`.
- Images live in `public/` and are referenced as `/name.png`.

## Rules

- Keep slides short: one idea, at most 6 bullets, no paragraphs.
- Use `section` layouts to divide the deck, and end with an `end` layout slide.
- Write notes for the speaker in comments, not on the slide.
- Do not invent facts, figures or sources. Ask or mark them as placeholders.
- Keep changes scoped to the request and report assumptions.

## Reference

Docs: https://sli.dev/guide/syntax, https://sli.dev/builtin/layouts, https://sli.dev/builtin/cli
