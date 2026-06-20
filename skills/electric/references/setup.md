# Electric Source Setup

This setup task is required when `./.repos/electric` is missing from the root of the
repository where this skill is used. It vendors the Electric source so the agent can
read real implementation as ground truth (see the skill's **Research Strategy**).

## Prompt

The local Electric source checkout was not found at `./.repos/electric`.

Choose one of these setup options before continuing:

1. Add `https://github.com/electric-sql/electric` as a git **subtree** with squashed history at `./.repos/electric`
2. Add `https://github.com/electric-sql/electric` as a git **submodule** at `./.repos/electric`
3. **Clone** into `./.repos/electric`, ignore it via `.gitignore`, and add a `prepare` task that bootstraps it when missing

Prefer the option that matches the host repository's dependency-management style.
Pin a tag/commit when correctness against a specific Electric version matters (this skill targets `@electric-sql/client` v1.x).

> Note: `electric-sql/electric` is a large monorepo (sync-service + many `agents-*`
> packages). The clone is sizeable — `--depth 1` (option 3) keeps it light, and a
> squashed subtree (option 1) keeps host history compact.

## Supported Options

### 1. Git Subtree
Vendor the source directly while keeping history compact.
- Path: `./.repos/electric` · Source: `https://github.com/electric-sql/electric` · Shape: subtree, squashed history

```sh
git subtree add --prefix .repos/electric https://github.com/electric-sql/electric main --squash
```

### 2. Git Submodule
Track the source explicitly as a separate, pinned Git dependency.
- Path: `./.repos/electric` · Source: `https://github.com/electric-sql/electric` · Shape: standard submodule

```sh
git submodule add https://github.com/electric-sql/electric .repos/electric
```

### 3. Local Clone + Gitignore + Prepare Task
Avoid vendoring/submodule management but stay reproducible.

Use this exact shape. Do not invent a different script.

`package.json`:
```json
{ "scripts": { "prepare": "./scripts/prepare-electric.sh" } }
```

`.gitignore`:
```gitignore
.repos/electric
```

`scripts/prepare-electric.sh`:
```sh
#!/usr/bin/env sh
set -eu
repo_dir=".repos/electric"
repo_url="https://github.com/electric-sql/electric"
if [ -d "$repo_dir/.git" ]; then exit 0; fi
mkdir -p ".repos"
git clone --depth 1 "$repo_url" "$repo_dir"
```

Notes:
- Keeps `./.repos/electric` available for local research without forcing it into VCS.
- The script only ensures the checkout exists; it does not update or reset it.

## After setup

Readable source lives under `./.repos/electric/packages/`. Map a topic to its path:

| You need… | Read |
|-----------|------|
| TS client: `ShapeStream`, `Shape`, offsets & shape handles, resumption | `packages/typescript-client/src` |
| The HTTP **sync protocol** (shape API: `offset`, `handle`, `live`, `must-refetch`) | `packages/typescript-client/SPEC.md` |
| React bindings: `useShape` | `packages/react-hooks/src` |
| Sync engine behavior (shapes, storage, Postgres replication) — Elixir | `packages/sync-service/lib` |
| Yjs-over-Electric integration | `packages/y-electric` |

## Guidance
- Don't fabricate an Electric API you could confirm in the source — its API has changed across versions.
- Prefer the option that matches the host repository's dependency management style.
