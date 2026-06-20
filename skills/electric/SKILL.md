---
name: electric
description: Expert guidance for Electric (electric-sql/electric), the Postgres sync engine. Use whenever working in a repo that uses Electric or @electric-sql/* (client, react, y-electric) — shapes, the HTTP sync protocol, ShapeStream/useShape, or the Elixir sync-service. Reads the real Electric source vendored at ./.repos/electric as the primary ground truth.
---

# Electric Expert

Expert guidance for **Electric** — a sync engine that streams subsets of a Postgres database ("Shapes") to clients over HTTP. Use it as the read/sync plane: Postgres → clients. This skill is **source-first**: Electric's API has changed substantially across versions, so confirm specifics against the vendored source rather than guessing.

## Prerequisite

Before doing any Electric work, check that `./.repos/electric` exists at the root of the repository where this skill is used.

If it does not, **stop and prompt the user** with the setup task in [`./references/setup.md`](./references/setup.md) (vendors `https://github.com/electric-sql/electric`). The whole point of this skill is to read the real Electric source as ground truth — do not proceed by guessing the API.

## Research Strategy

There are few curated guides yet (`references/` grows as edge cases are documented). So lean on source:

1. **Codebase patterns first** — if the project already uses Electric, follow its conventions (how shapes are defined, how the client is configured, how writes are handled).
2. **Vendored source second — the primary ground truth.** Read it for exact signatures, options, and behavior:
   - `./.repos/electric/packages/typescript-client/src` — `ShapeStream`, `Shape`, fetching, **offsets & shape handles**, resumption
   - `./.repos/electric/packages/typescript-client/SPEC.md` — the **HTTP sync protocol** (the shape API: `offset`, `handle`, `live`, `must-refetch`). Read this before reasoning about the wire protocol.
   - `./.repos/electric/packages/react-hooks/src` — `useShape` and related React bindings
   - `./.repos/electric/packages/sync-service/lib` — the **Elixir** sync engine (shape definition, storage, Postgres replication) for behavior/semantics questions
   - `./.repos/electric/packages/y-electric` — Yjs-over-Electric integration
3. **Curated guides last/as-available** — anything in `./references/*.md` (edge cases we've hit and documented). Prefer a guide when one exists.

> When you confirm a non-obvious behavior or API against the source, that's a candidate to write up as a `references/guide-<topic>.md` so the next agent doesn't have to re-derive it.

## Mental Model

- **Electric syncs reads, not writes.** It streams Postgres data out to clients. **Writes go to Postgres through your own backend/API** — Electric does not accept writes. (Write-path / optimistic-state patterns are app-level; check the codebase.)
- A **Shape** is a synced subset of one table: a table + optional `where` filter + optional column selection. Clients subscribe to a shape and receive an initial snapshot followed by a live stream of changes.
- Sync is **resumable**: the client tracks an `offset` and a shape `handle`; on reconnect it resumes (or refetches when told to). Design consumers to materialize incrementally, not to assume one-shot loads.
- Electric is a **service in front of Postgres**. Clients speak its **HTTP shape API** — not the Postgres wire protocol, and not logical replication directly.

## Common Misconceptions

| Wrong (common in AI outputs) | Correct |
|------------------------------|---------|
| `electrify(db)` / local-first SQLite / "satellite" API | That's **legacy** ElectricSQL. Current Electric is a Postgres **read-path sync engine** over an **HTTP shape API** — no SQLite, no `electrify`. |
| Electric syncs writes back to Postgres | Electric syncs **reads** (Postgres → client). You write to Postgres via your own API; the change syncs back out as a shape update. |
| `import { ... } from '@electric-sql/electric'` | Core client is **`@electric-sql/client`**; React bindings are **`@electric-sql/react`**. |
| Connect with a Postgres client / logical-replication lib | Clients talk to the Electric **service** over HTTP (the shape API). The service handles replication. |
| Subscribe to "a query" with joins | A shape is **single-table** + `where` + columns. Compose/relate on the client (or via separate shapes); confirm current capabilities in source. |

## Install policy

- Core client: **`@electric-sql/client`** (v1.x). React bindings: **`@electric-sql/react`**. Keep `@electric-sql/*` versions aligned.
- Install only what the runtime needs (e.g. skip `@electric-sql/react` outside React).
- The **sync-service** is a separate server (typically run via Docker against your Postgres), **not** an npm dependency. Confirm the exact entrypoints/options against `./.repos/electric/packages/typescript-client/src` and `SPEC.md`.

## Principles

- **Defer to source for exact API.** Treat `ShapeStream` / `Shape` / `useShape` as the entry points, but confirm constructor options, return shapes, and event semantics in the vendored source — versions drift.
- **Separate read sync from writes.** Keep Electric on the read/sync path; route mutations through your backend to Postgres.
- **Handle resumption explicitly.** Persist/track offset + handle where the app needs durable resume; handle `must-refetch`.
- **Don't reintroduce the legacy API.** If you see `electrify`, satellite, or SQLite-local-first patterns, you're on old docs — check the vendored source.

## References

- [`./references/setup.md`](./references/setup.md) — vendor Electric into `./.repos/electric`
- *(curated `guide-<topic>.md` files will be added here as edge cases are documented)*
- [Electric GitHub](https://github.com/electric-sql/electric) · [Electric docs](https://electric-sql.com/docs)
