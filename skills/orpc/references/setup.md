# oRPC Source Setup

This setup task is required when `./.repos/orpc` is missing from the root of the
repository where this skill is used. It vendors the oRPC source so the agent can
read real implementation as ground truth (see the skill's **Research Strategy**).

## Prompt

The local oRPC source checkout was not found at `./.repos/orpc`.

Choose one of these setup options before continuing:

1. Add `https://github.com/unnoq/orpc` as a git **subtree** with squashed history at `./.repos/orpc`
2. Add `https://github.com/unnoq/orpc` as a git **submodule** at `./.repos/orpc`
3. **Clone** into `./.repos/orpc`, ignore it via `.gitignore`, and add a `prepare` task that bootstraps it when missing

Prefer the option that matches the host repository's dependency-management style.
Pin a tag/commit when correctness against a specific oRPC version matters (this skill targets v1, e.g. `@orpc/server@^1.14.5`).

## Supported Options

### 1. Git Subtree
Vendor the source directly while keeping history compact.
- Path: `./.repos/orpc` · Source: `https://github.com/unnoq/orpc` · Shape: subtree, squashed history

```sh
git subtree add --prefix .repos/orpc https://github.com/unnoq/orpc main --squash
```

### 2. Git Submodule
Track the source explicitly as a separate, pinned Git dependency.
- Path: `./.repos/orpc` · Source: `https://github.com/unnoq/orpc` · Shape: standard submodule

```sh
git submodule add https://github.com/unnoq/orpc .repos/orpc
```

### 3. Local Clone + Gitignore + Prepare Task
Avoid vendoring/submodule management but stay reproducible.

Use this exact shape. Do not invent a different script.

`package.json`:
```json
{ "scripts": { "prepare": "./scripts/prepare-orpc.sh" } }
```

`.gitignore`:
```gitignore
.repos/orpc
```

`scripts/prepare-orpc.sh`:
```sh
#!/usr/bin/env sh
set -eu
repo_dir=".repos/orpc"
repo_url="https://github.com/unnoq/orpc"
if [ -d "$repo_dir/.git" ]; then exit 0; fi
mkdir -p ".repos"
git clone "$repo_url" "$repo_dir"
```

Notes:
- Keeps `./.repos/orpc` available for local research without forcing it into VCS.
- The script only ensures the checkout exists; it does not update or reset it.

## After setup

Readable source lives under `./.repos/orpc/packages/<pkg>/src/`. Map a topic to its package:

| You need… | Read |
|-----------|------|
| `oc`, contract builder, `isContractProcedure` | `packages/contract/src` |
| `os`, `implement`, `RPCHandler`, middleware, context | `packages/server/src` |
| `createORPCClient`, `RPCLink`, `safe`, `isDefinedError` | `packages/client/src` |
| `OpenAPIGenerator`, schema converters | `packages/openapi/src` |
| RPC protocol / fetch+node adapters | `packages/standard-server*/src` |

## Guidance
- Don't fabricate an oRPC API you could confirm in the source.
- Prefer the option that matches the host repository's dependency management style.
