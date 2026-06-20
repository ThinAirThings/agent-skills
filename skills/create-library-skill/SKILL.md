---
name: create-library-skill
description: How to author a high-quality "library skill" that makes an LLM use a library correctly the first time. Use when adding a skill for a new library/framework (like orpc), refreshing an existing one, or setting up a skill to read a library's real source code as ground truth. Teaches the three-layer pattern — operating-procedure SKILL.md, curated reference guides, and full upstream source vendored into the host repo — modeled on the effect-ts skill.
---

# Creating a Library Skill

A **library skill** makes an LLM produce *correct, house-style* code for a specific library — instead of hallucinating APIs or drifting from conventions. The best ones don't try to cram the whole library into one file. They give the agent **three layers of ground truth** and a strategy for which to read when.

This is the pattern the `effect-ts` skill uses, and it's the one to copy.

---

## The Three Layers

| Layer | What it is | Where it lives | When the agent reads it |
|------|-----------|----------------|-------------------------|
| **1. Operating procedure** | `SKILL.md` — rules, principles, install policy, and the **research strategy**. *Not* an API dump. | `skills/<name>/SKILL.md` | Always (cheap, in context) |
| **2. Curated guides** | Distilled best-practice docs per topic + a feature/module index. The **default** implementation guidance. | `skills/<name>/references/*.md` | When the task touches that topic |
| **3. Real source** | The library's **actual upstream source**, cloned into the host repo. Ground truth for exact signatures and behavior. | `./.repos/<lib>/` in the consuming repo | **Last** — only when guides don't answer it |

The insight: the agent reads *your distilled guidance* for the common case, and falls through to the *real source code* for the exact signature / obscure overload / behavior question — instead of guessing or hallucinating. Layer 1 is the teacher; layer 2 is the textbook; layer 3 is the primary source.

---

## Layer 3 is what makes this powerful: vendor the real source

Rather than describing the API in prose (which goes stale and invites hallucination), you **clone the library's source into the host repository** so the agent can read it directly. The skill **gates all work on that source being present.**

### The setup gate

`SKILL.md` opens with a prerequisite check (copy this shape):

```markdown
## Prerequisite
Before doing any <Lib>-related work, check that `./.repos/<lib>` exists at the repo root.
If it does not, **stop and prompt the user** with the setup task in `./references/setup.md`.
```

`references/setup.md` then offers three ways to get the source into `./.repos/<lib>` (full template: `references/setup.template.md` in this skill — copy it, fill in the library name, git URL, and source path):

1. **git subtree** (squashed history) — vendor the source directly, compact history.
2. **git submodule** — track the source as an explicit pinned dependency.
3. **clone + `.gitignore` + `prepare` script** — keep it out of version control but reproducible. The bundled `scripts/clone-source.sh` is exactly this option, runnable:

```bash
# from this skill's scripts/, or copy it into the host repo
./scripts/clone-source.sh https://github.com/<org>/<lib> <lib>
# clones into ./.repos/<lib> if missing, adds .repos/ to .gitignore, prints how to wire a prepare task
```

Prefer the option that matches the host repo's dependency-management style. Pin a tag/commit when correctness against a specific version matters.

### The research strategy (the ordering doctrine)

The other half of layer 3 is telling the agent **what to read in what order**, so it doesn't jump to raw source for things a guide already answers. Put this in `SKILL.md`:

1. **Curated guides first** (`./references/*.md`) — the default.
2. **Codebase patterns second** — follow existing house usage if present.
3. **Vendored source last** (`./.repos/<lib>/packages/.../src/`) — for exact API details, signatures, deep implementation, or verifying behavior.

Name the **exact source path** the agent should open (e.g. `./.repos/<lib>/packages/<core>/src/`) and keep a feature→path index in `references/features.md` so it can jump straight in.

---

## Lightweight alternative: vendor just the types

Cloning full source into the host repo is the gold standard for libraries you work in deeply. When that's overkill (a small/stable dependency, or you only need the public surface), use the bundled `scripts/vendor-library.sh` to pull the package's **type declarations + docs** into the *skill's own* `references/`:

```bash
./scripts/vendor-library.sh <npm-package>[@version] [dest-name]
# -> references/<dest-name>/  (*.d.ts + markdown + VENDORED.md manifest)
```

`.d.ts` is the complete public API contract and is compact — enough for signatures, not for implementation behavior. Use full-source (layer 3) when behavior is the question; use this when signatures suffice.

| | Full source in host repo (`./.repos/<lib>`) | Types in skill `references/` (`vendor-library.sh`) |
|---|---|---|
| Reads | Real `.ts` implementation | `.d.ts` signatures + README |
| Answers | Behavior, internals, exact overloads | "What's the signature / options?" |
| Lives | Host repo, serves all tasks there | Bundled with the skill |
| Setup | subtree / submodule / prepare-clone, gated | one-shot, no gate |

---

## Layer 2: the curated guides

Write one `references/guide-<topic>.md` per area the library is non-trivial in (errors, DI/layers, schema, testing, observability, retries, …) plus a `references/features.md` index mapping capabilities → source paths. These are **distilled best practices**, not API reference — the "here's the idiomatic way" layer. `SKILL.md` lists them and says "consult the matching guide before implementing."

If a single `SKILL.md` already covers the library well, you can skip layer 2 — but for anything with real surface area, guides keep `SKILL.md` small while staying specific.

---

## Layer 1: the SKILL.md itself

Keep it an **operating procedure**, not trivia:

1. **Frontmatter** — `name` (kebab-case == folder) + a specific, trigger-oriented `description`. Consider an always-on trigger for pervasive libraries ("use whenever working in a repo that uses X").
2. **Prerequisite** — the `./.repos/<lib>` gate (above).
3. **Research Strategy** — the ordering doctrine + when-to-research list (above).
4. **Install policy** — exact version channel (e.g. `effect@beta`), version-alignment rules, package selection.
5. **Principles** — the house rules for writing code in this library (typed errors, DI style, "never use `any`/`as`", preferred constructors, …).
6. **Common Misconceptions** *(optional but high-value)* — a `Wrong → Correct` table for what LLMs reliably get wrong.
7. **References** — list the `references/*.md` files.

A copy-paste template is at the bottom of this file.

---

## Recipe: add a new library skill

1. **Scaffold:** `skills/<name>/SKILL.md` (kebab `<name>` == frontmatter `name`) + `skills/<name>/references/`.
2. **Set up source (layer 3):** copy `references/setup.template.md` → your skill's `references/setup.md`, fill in the library, git URL, and source path. Decide subtree/submodule/clone.
3. **Write the curated guides (layer 2):** one `guide-<topic>.md` per non-trivial area + a `features.md` index. Distill best practices; cite source paths.
4. **Write SKILL.md (layer 1):** Prerequisite gate → Research Strategy → install policy → principles → references list. Get the misconceptions table right if you include one.
5. **Verify every API** against the vendored source — this skill exists to *stop* hallucinations; don't add new ones.
6. **Split if internal:** anything that names internal paths/identifiers/architecture goes in the private `agent-skills-internal` repo as a `<name>-thinair` overlay (mirror `orpc` → `thinair-orpc`). Keep the generic skill here public-safe.
7. **Register:** add `<name>` to `skills.sh.json` under a fitting grouping; add a row to the README **Available Skills** table.
8. **Validate:** `node .github/scripts/validate.mjs`.

See also `CONTRIBUTING.md` and `AGENTS.md` at the repo root.

---

## Quality bar

- **Source over prose.** When behavior matters, point the agent at real source, don't paraphrase it (paraphrase goes stale).
- **Order the research.** Guides → codebase → source. Don't make the agent read source for what a guide answers; don't let it guess when source is one read away.
- **Gate on presence.** If the skill relies on `./.repos/<lib>`, make `SKILL.md` refuse to proceed until it exists.
- **Version-pinned.** State the version/channel; pin the vendored source when correctness depends on it.
- **Public-safe.** Assume this repo can be public — no secrets, no private endpoints. Internal house usage → `agent-skills-internal`.

---

## SKILL.md Template

```markdown
---
name: <kebab-name>
description: <Library> expert guidance. Use whenever working in a repo that uses <Library> — patterns, conventions, and supporting tooling — and for questions about <key areas>.
---

# <Library> Expert

Expert guidance for <Library>, covering <the areas it's non-trivial in>.

## Prerequisite
Before any <Library> work, check that `./.repos/<lib>` exists at the repo root.
If not, stop and prompt the user with the setup task in `./references/setup.md`.

## Research Strategy
1. Curated guides first — `./references/*.md`.
2. Codebase patterns second — follow existing house usage if present.
3. Vendored source last — `./.repos/<lib>/packages/<core>/src/` for exact
   signatures, deep implementation, or behavior verification.

Use `./references/features.md` to map a capability to its source path.

## Install policy
- <version channel, e.g. `<lib>@beta`> ; keep companion packages version-aligned.

## Principles
- <house rules: typed errors, DI style, no `any`/`as`, preferred constructors…>

## Common Misconceptions   <!-- optional -->
| Wrong (common in AI outputs) | Correct |
|------------------------------|---------|
| `<hallucinated API>` | `<real API>` |

## References
- ./references/setup.md
- ./references/features.md
- ./references/guide-<topic>.md
```

---

## Resources

- [Anthropic Agent Skills](https://code.claude.com/docs/en/skills) — the SKILL.md format & progressive disclosure
- `references/setup.template.md` — copy into a new skill to set up `./.repos/<lib>`
- `scripts/clone-source.sh` — clone-if-missing full source into `./.repos/<lib>`
- `scripts/vendor-library.sh` — lightweight fallback: vendor a package's `.d.ts` + docs into `references/`
- Reference skill in this repo: `orpc` (three-layer). The `orpc` → `thinair-orpc` split is the public/private house-overlay pattern.
