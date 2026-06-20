# Thinair Agent Skills

A collection of [Agent Skills](https://code.claude.com/docs/en/skills) for AI coding agents working in the [Thinair](https://thinair.cloud) codebase. Skills are packaged instructions (and optional scripts/references) that extend an agent's capabilities with the correct APIs, house patterns, and hard-won gotchas for the libraries and systems we build on.

Each skill captures how *we* use a tool — not just the upstream docs — so an agent produces code that matches the Thinair stack on the first try instead of hallucinating APIs or drifting from our conventions.

## Installation

Install all skills into your agent (Claude Code, Cursor, etc.) via the [`skills`](https://skills.sh) CLI:

```bash
npx skills add ThinAirThings/agent-skills
```

Or add a single skill:

```bash
npx skills add ThinAirThings/agent-skills/orpc
```

You can also use a skill directly by copying its folder under `skills/` into your agent's skills directory (e.g. `~/.claude/skills/`).

## Available Skills

### API & RPC

| Skill | What it covers |
| --- | --- |
| [`orpc`](skills/orpc) | [oRPC](https://orpc.dev) (v1) end-to-end type-safe RPC + OpenAPI: contracts, procedures, routers, clients, middleware, metadata, and OpenAPI specs with `@orpc/*`. Corrects common LLM misconceptions (tRPC habits, invented APIs) and falls through to the real oRPC source (`./.repos/orpc`) as ground truth. |

### Sync & Data

| Skill | What it covers |
| --- | --- |
| [`electric`](skills/electric) | [Electric](https://electric-sql.com) (`electric-sql/electric`), the Postgres sync engine: Shapes, the HTTP sync protocol, `ShapeStream`/`useShape` (`@electric-sql/client`, `@electric-sql/react`), and the Elixir sync-service. Source-first — vendors the real Electric repo into `./.repos/electric` as ground truth (its API has churned across versions). |

### Meta

| Skill | What it covers |
| --- | --- |
| [`create-library-skill`](skills/create-library-skill) | How to author a high-quality library skill (like `orpc`): the **three-layer pattern** — operating-procedure `SKILL.md`, curated reference guides, and the library's real source vendored into the host repo (`./.repos/<lib>`) as ground truth, with a research-order doctrine. Ships `clone-source.sh` (full source) + `vendor-library.sh` (lightweight `.d.ts`) helpers and a `setup.md` template. |

## Skill Structure

Every skill lives in its own folder under `skills/<name>/` and follows the [Agent Skills](https://code.claude.com/docs/en/skills) format:

```
skills/<name>/
├── SKILL.md        # required — frontmatter (name, description) + the guide
├── scripts/        # optional — helper automation the agent can run
└── references/     # optional — supporting docs the agent can load on demand
```

The `SKILL.md` frontmatter drives discovery:

```markdown
---
name: orpc
description: One-line summary an agent reads to decide when the skill is relevant.
---
```

Keep `description` specific and trigger-oriented — it's the only thing an agent sees before deciding to load the full skill.

## Adding a Skill

1. Create `skills/<name>/SKILL.md` with `name` + `description` frontmatter and the guide body.
2. Add `scripts/` or `references/` only if the skill genuinely needs them.
3. Register the skill in [`skills.sh.json`](skills.sh.json) under the appropriate grouping (create a new grouping if none fits).
4. Add a row to the **Available Skills** table in this README.
5. Open a PR. See [CONTRIBUTING.md](CONTRIBUTING.md) for conventions.

## Conventions

- **Correct the model, don't just document.** Lead with a *Wrong → Correct* table for APIs that LLMs reliably get wrong.
- **Vendor real source as ground truth.** For libraries you work in deeply, set up `./.repos/<lib>` and give the skill a research strategy (curated guides → codebase → source) so the agent reads real code instead of guessing. See [`create-library-skill`](skills/create-library-skill).
- **Show the house pattern.** Where a skill has a house-specific usage section, point at real package paths (e.g. `packages/<lib>/`) so generated code matches our stack. Keep anything that names internal paths/identifiers/architecture in the private [`agent-skills-internal`](https://github.com/ThinAirThings/agent-skills-internal) repo instead (see the `orpc` → `thinair-orpc` split).
- **Say when *not* to use it.** A "When NOT to use X" table keeps agents from over-applying a tool.
- **Stay version-pinned.** Note the major version the skill targets; flag breaking-change seams.

## License

MIT — see [LICENSE](LICENSE).
