---
name: create-library-skill
description: How to author a high-quality "library skill" for the Thinair agent-skills repo — a SKILL.md that makes an LLM use a library correctly the first time. Use when adding a skill for a new library/framework (like orpc), refreshing an existing one, or vendoring a library's types/source so an agent can read ground truth. Covers the proven curated-guide format plus the source-vendoring technique.
---

# Creating a Library Skill

A **library skill** is a prompt that makes an LLM produce *correct, house-style* code for a specific library — instead of hallucinating APIs or drifting from conventions. The best ones (`orpc`, `effect-ts`) do this with two complementary layers:

1. **A curated `SKILL.md`** — a hand-written distillation: the canonical APIs, a *Wrong → Correct* table for what models reliably get wrong, minimal real examples, the house/Thinair usage, and a "when not to use it" boundary.
2. **(Optional but powerful) Vendored ground truth** — the library's actual type declarations / source / docs copied into `references/`, so when the curated guide isn't enough the agent can *read the real API surface* rather than guess.

> **Reality check on the format.** The `orpc` and `effect-ts` skills are layer 1 only — a single curated `SKILL.md`, no vendored source. That curated format is what makes them reliable. Layer 2 (vendoring) is an *enhancement* this skill adds on top: it's the "give the LLM the full library context by copying the code locally" idea, operationalized. Use layer 1 always; add layer 2 when the library is large, fast-moving, or under-documented.

---

## Why both layers

| | Curated `SKILL.md` (layer 1) | Vendored `references/` (layer 2) |
|---|---|---|
| **Answers** | "What's the idiomatic / correct way?" | "What is the *exact* signature / type?" |
| **Catches** | Hallucinated APIs, tRPC-isms, wrong mental models | Version drift, obscure overloads, options you didn't document |
| **Cost** | Your judgment; stays small & always-loaded | Disk + tokens; loaded on demand |
| **Staleness** | You maintain it | Re-run the vendor script to refresh |

Layer 1 is the *teacher*; layer 2 is the *reference manual* the teacher points at. An agent reads `SKILL.md` first (cheap, always in context) and only opens `references/` when it needs the precise truth — this is the [progressive-disclosure](https://code.claude.com/docs/en/skills) model.

---

## The Curated `SKILL.md` Structure

Follow the shape proven by `orpc` / `effect-ts`:

1. **Frontmatter** — `name` (kebab-case, matches folder) + a specific, trigger-oriented `description`. The description is the *only* thing an agent reads before loading the skill; name the packages and the use cases.
2. **One-paragraph intro** — what the library is, in one breath, and that the skill "corrects common misconceptions from LLM-generated content."
3. **Quick Reference** — the canonical import block + a "core mental model" snippet with inline `↑` annotations.
4. **Common Misconceptions** — a `Wrong (common in AI outputs) | Correct` table. **This is the highest-value section.** Mine it from real model mistakes: invented methods, wrong import paths, sibling-library habits, wrong types.
5. **Topic sections** — errors, context/DI, schema, concurrency, etc. Each: one tight paragraph + the *minimal correct* example. No tutorials.
6. **House usage** *(if applicable)* — how *we* use it, pointing at real paths (e.g. `packages/<lib>/`). If this names internal paths/identifiers/architecture, split it into a separate `<lib>-thinair` overlay skill in the private `agent-skills-internal` repo (mirror the `orpc` → `thinair-orpc` split) so the generic skill stays public-safe.
7. **When NOT to use it** — a scenario/recommendation table. Stops agents over-applying the tool.
8. **Resources** — upstream doc links, and a pointer to any vendored `references/`.

A copy-paste template is at the bottom of this file.

---

## Vendoring Ground Truth (layer 2)

Goal: let an agent read the library's **real public API** locally. For a TypeScript library the highest-signal, most compact ground truth is its **type declarations** (`*.d.ts`) — the complete public surface — plus the README. Full source is usually too noisy to be worth it.

Use the bundled script:

```bash
# from the skill directory you're authoring (skills/<name>/)
./../create-library-skill/scripts/vendor-library.sh <npm-package>[@version] [dest-name]

# examples
.../scripts/vendor-library.sh effect
.../scripts/vendor-library.sh @orpc/server@1.14.5
.../scripts/vendor-library.sh zod zod-v4
```

It `npm pack`s the package, extracts the `*.d.ts` / `*.d.mts` / `*.d.cts` files, markdown docs, and `package.json` into `references/<dest-name>/`, and writes a `VENDORED.md` manifest (package, resolved version, date). It's idempotent — re-run to refresh after an upgrade.

**Then wire it into `SKILL.md`** so the agent knows it exists and when to read it:

```markdown
## Ground Truth

The full type surface is vendored under `references/<lib>/` (v1.2.3). When unsure of
an exact signature or available option, read `references/<lib>/dist/index.d.ts`
rather than guessing.
```

**Guidelines for vendoring:**
- **Pin the version.** Note it in `SKILL.md` and `VENDORED.md`; a library skill is only correct against a known version.
- **Prefer types over source.** `.d.ts` is the API contract and is compact. Reach for full source only when behavior (not signature) is the question.
- **No types shipped?** Vendor the `@types/*` package, or do a git sparse-checkout of just `src/`.
- **Keep it lean.** If a package's declarations are huge, vendor only the entrypoint(s) you actually reference. Big `references/` dirs cost tokens when opened.
- **Never vendor secrets or private packages** into a repo that may be public.

---

## Recipe: add a new library skill

1. **Scaffold:** `skills/<name>/SKILL.md` (kebab-case `<name>` == frontmatter `name`).
2. **Draft layer 1:** write the curated guide from the template below. Get the misconceptions table right first — it's the payload.
3. **Verify every API.** This skill exists to *stop* hallucinations; don't add new ones. Vendor the types (step 4) and check signatures against them, or against the installed package.
4. **(Optional) Vendor:** run `vendor-library.sh` for the package(s); add a **Ground Truth** section pointing at `references/`.
5. **Split if internal:** if house usage names internal paths/types/architecture, factor those into a separate `<name>-thinair` overlay in the private `agent-skills-internal` repo (mirror `orpc` → `thinair-orpc`). Keep the generic skill here public-safe.
6. **Register:** add `<name>` to `skills.sh.json` under a fitting grouping; add a row to the README **Available Skills** table.
7. **Validate:** `node .github/scripts/validate.mjs` (frontmatter + registry/folder sync).

See also `CONTRIBUTING.md` and `AGENTS.md` at the repo root.

---

## Quality bar

- **Correct over comprehensive.** Every shown API must be real and current for the pinned version.
- **Lead with corrections.** If you can't name 3+ things LLMs get wrong about the library, you haven't researched it enough.
- **Minimal examples.** Show the one correct way, not a tour.
- **Version-pinned.** State the major version; flag breaking-change seams (e.g. Effect 4.x `Schema` from `'effect'` vs old `@effect/schema`).
- **Public-safe.** Assume the repo can be public — no secrets, no private endpoints.

---

## SKILL.md Template

```markdown
---
name: <kebab-name>
description: Comprehensive guide for <Library> (v<major>). Use when <concrete tasks/packages>. Covers correct APIs and common misconceptions from LLM-generated content.
---

# <Library> Expert Guide

<One-paragraph: what it is, and that this skill corrects common LLM misconceptions.>

## Quick Reference

\```typescript
import { ... } from '<pkg>'
\```

**Core mental model:**
\```typescript
// annotated canonical snippet with ↑ pointing at the key pieces
\```

---

## Common Misconceptions

| Wrong (common in AI outputs) | Correct |
|------------------------------|---------|
| `<hallucinated API>` | `<real API>` |

---

## <Topic> ...
<tight paragraph + minimal correct example>

---

## Ground Truth   <!-- only if you vendored -->
Full type surface vendored under `references/<lib>/` (v<x.y.z>). Read
`references/<lib>/dist/index.d.ts` for exact signatures.

---

## When NOT to Use <Library>

| Scenario | Recommendation |
|----------|----------------|
| ... | ... |

---

## Resources
- [<Library> docs](...)
- [<Library> GitHub](...)
```

---

## Resources

- [Anthropic Agent Skills](https://code.claude.com/docs/en/skills) — the SKILL.md format & progressive disclosure
- `scripts/vendor-library.sh` — vendors a package's types + docs into `references/`
- Reference skill in this repo: `orpc` (curated). The `orpc` → `thinair-orpc` split (generic public skill + private house overlay) is the recommended pattern when house usage gets internal.
