---
name: update-knowledge-base
description: Updates the knowledge base in .agents/knowledge (an Open Knowledge Format bundle of this repository's decisions, constraints and playbooks). Use when a change makes a concept wrong, when a change adds or reverses a decision, or when ./scripts/knowledge.sh check fails.
---

# Update the knowledge base

`.agents/knowledge/` holds concepts: architectural decisions, repository constraints and playbooks. Topics that govern the same files and are read together share one concept. Agents read a concept before editing the files it `governs`. A concept that no longer matches the code misleads every agent after you, so fix it in the same PR as the change.

The code and its docs are the source of truth. A concept holds only what they don't say: the why, what firebase-tools expects, rules that span files, process that isn't in the code, traps, and rejected alternatives. For everything else, it points to where the knowledge lives.

## 1. Find the concepts your change touches

```bash
./scripts/knowledge.sh for <each path you changed>
```

Read each concept listed. If your change makes anything in one untrue, edit it. If your change is a new decision or constraint that an agent could get wrong, add it to the concept that already governs those files, as a `## <topic>` subsection under each section, or add a concept if none fits.

## 2. Edit or add a concept

Copy the shape of an existing concept of the same `type`. Keep the frontmatter's indentation: `scripts/knowledge.sh` parses it. Write `governs` and `sources` as block lists, with one `-` item per line indented two spaces, and each source's keys indented four spaces. `check` rejects the inline `[...]` and `{...}` forms.

- **Frontmatter:**
  - `type`: `Decision`, `Constraint` (a rule the repo enforces or expects) or `Playbook`.
  - `title`: up to 60 characters.
  - `description`: one sentence in the present tense.
  - `tags`.
  - `agents_md`: `always` if AGENTS.md must state the rule; `when-touching` if it matters only when editing the governed files; `reference` for a concept with no `governs`.
  - `governs`: path globs from the repo root. Keep them narrow, so that `for` lists only concepts that matter.
  - `sources`: the durable places that show or enforce the concept.
    - A repo file is given as a path relative to the concept file, with `symbol:` set to a literal string the file must contain.
    - A file in another repository, such as firebase-tools or the Python SDK, is given as a GitHub URL on its default branch. `check` does not verify it, so name the symbol in the prose.
    - No line numbers and no commit SHAs.
- **Don't restate what the code says.** If the code, its TSDoc, a README, CONTRIBUTING.md or a workflow already says it (lists of fields, codes, files, jobs or steps; what a function does; a value), add a source and point to it instead. A copy drifts; a pointer is checked.
- **Body sections:** every concept starts with `# Where it lives`:

  - 1 to 5 bullets per topic, each written as "what: `symbol` in `file`" and footnoted to a source.
  - The first bullet names what enforces the rule, if anything: "Enforced by: `<test, job, lint or table>`", or "Enforced by: nothing; review only."

  Then, by type:

  - Decision: `# Decision`, `# Why`, `# Rules for agents`, `# Related`. Add an optional `# firebase-tools` or `# Python SDK` section when the other side of a contract matters.
  - Constraint: `# Constraint`, `# Why`, `# Rules for agents`, `# Related`. The same optional sections apply.
  - Playbook: `# When to use`, `# Steps`, `# Related`.

- **Rules for agents** start with **Must:**, **Must not:**, **Should:** or **Ask first:**. Make each rule only as strong as its evidence.
- **Why:** label the reason honestly.
  - "The maintainers' stated reason: …" when a maintainer said it.
  - "The likely reason (not recorded): …" when it's inferred.
  - "The reason isn't recorded. Ask a maintainer before changing it." when nobody knows.
- **Timeless:** concepts state what is true and why, not how it got there.
  - No pull request or issue numbers, commit SHAs, dates, names, release versions used as history, or "now" and "currently". `check` rejects `#123`-style references, "PR 123", pull and issue URLs, and `YYYY-MM-DD` dates (not timestamps or written-out dates, so review for those).
  - For a value the code holds, such as a version constraint or a threshold, point to where it lives instead of copying it.
- **Links** between concepts use bundle-relative paths, e.g. `[Title](/params/expressions.md)`.
- **Footnotes** attribute a claim to one of the concept's sources: `[^source-id]`, where `source-id` is a `sources` entry's `id`. Define each footnote at the end of the body. `check` fails on a footnote that names no source, and on a repo source no footnote cites, so every pointer stays tied to a checked file and symbol.
- **Where it lives:** every backticked identifier (camelCase, PascalCase, ALL_CAPS, `_private`, `a.b` or `f()`) in a footnoted bullet must appear in a repo file that bullet footnotes; URL footnotes don't count. `check` fails otherwise, and it is the check authors hit first.
- **Other rules `check` enforces:** each `governs` glob must match at least one tracked or untracked file; a frontmatter value that contains `: ` or ` #`, or starts with a backtick or `@`, must be quoted; `status`, if present, is `draft`, `stable` or `deprecated`; and links in AGENTS.md must resolve.

- **Provenance (optional):** when a maintainer has checked a concept against the code, they can add `verified: { by: human:<github-login>, at: <UTC timestamp such as 2026-01-31T12:00:00Z> }`; a bare date fails `check`. A concept nobody has verified stays unverified, and that's allowed. Don't record which tool or model wrote a concept.

A reversed decision isn't deleted. Set `status: deprecated`, say what replaced it, and link the new concept, so agents don't re-propose the old way. Remove its `governs:` key along with its globs (an empty `governs:` fails `check`), so `for` stops listing it, and keep only the `sources` that still exist, or drop `sources` entirely.

## 3. Regenerate and check

```bash
./scripts/knowledge.sh index   # rewrites index.md from the frontmatter
./scripts/knowledge.sh check   # what CI runs
```

If the concept is `agents_md: always`, check that AGENTS.md's rule still matches it.
