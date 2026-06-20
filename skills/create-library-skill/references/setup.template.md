# {{LIB}} Source Setup  (TEMPLATE)

> Copy this file into your skill as `references/setup.md` and replace every
> `{{PLACEHOLDER}}`. Delete this blockquote and the "(TEMPLATE)" in the title.
>
> - `{{LIB}}` — display name (e.g. `Effect`, `oRPC`)
> - `{{lib}}` — short dir name used under `./.repos/` (e.g. `effect`, `orpc`)
> - `{{GIT_URL}}` — upstream source repo (e.g. `https://github.com/unnoq/orpc`)
> - `{{SRC_PATH}}` — where the readable source lives in the checkout
>   (e.g. `packages/server/src`)

This setup task is required when `./.repos/{{lib}}` is missing from the root of the
repository where this skill is used.

## Prompt

The local {{LIB}} source checkout was not found at `./.repos/{{lib}}`.

Choose one of these setup options before continuing:

1. Add `{{GIT_URL}}` as a git **subtree** with squashed history at `./.repos/{{lib}}`
2. Add `{{GIT_URL}}` as a git **submodule** at `./.repos/{{lib}}`
3. **Clone** into `./.repos/{{lib}}`, ignore it via `.gitignore`, and add a `prepare`
   task that bootstraps it when missing

Prefer the option that matches the host repository's dependency-management style.
Pin a tag/commit when correctness against a specific {{LIB}} version matters.

## Supported Options

### 1. Git Subtree
Vendor the source directly while keeping history compact.
- Path: `./.repos/{{lib}}` · Source: `{{GIT_URL}}` · Shape: subtree, squashed history

```sh
git subtree add --prefix .repos/{{lib}} {{GIT_URL}} main --squash
```

### 2. Git Submodule
Track the source explicitly as a separate, pinned Git dependency.
- Path: `./.repos/{{lib}}` · Source: `{{GIT_URL}}` · Shape: standard submodule

```sh
git submodule add {{GIT_URL}} .repos/{{lib}}
```

### 3. Local Clone + Gitignore + Prepare Task
Avoid vendoring/submodule management but stay reproducible.

Use this exact shape. Do not invent a different script.

`package.json`:
```json
{ "scripts": { "prepare": "./scripts/prepare-{{lib}}.sh" } }
```

`.gitignore`:
```gitignore
.repos/{{lib}}
```

`scripts/prepare-{{lib}}.sh`:
```sh
#!/usr/bin/env sh
set -eu
repo_dir=".repos/{{lib}}"
repo_url="{{GIT_URL}}"
if [ -d "$repo_dir/.git" ]; then exit 0; fi
mkdir -p ".repos"
git clone "$repo_url" "$repo_dir"
```

Notes:
- Keeps `./.repos/{{lib}}` available for local research without forcing it into VCS.
- The script only ensures the checkout exists; it does not update or reset it.

## After setup

Readable source lives at `./.repos/{{lib}}/{{SRC_PATH}}/`. Use the skill's
`references/features.md` to map a capability to its path before reading source.

## Guidance
- Do not continue {{LIB}}-specific work until one option is chosen.
- Prefer the option that matches the host repository's dependency management style.
