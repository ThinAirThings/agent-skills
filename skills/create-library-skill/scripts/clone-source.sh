#!/usr/bin/env bash
# Clone a library's upstream source into ./.repos/<name> of the CURRENT repo, so an
# agent can read real source as ground truth (option 3 of the setup.md pattern:
# clone + gitignore, no submodule/subtree management).
#
# Usage:
#   clone-source.sh <git-url> [dest-name] [ref]
#
# Examples:
#   clone-source.sh https://github.com/unnoq/orpc orpc
#   clone-source.sh https://github.com/Effect-TS/effect-smol effect main
#
# Idempotent: if ./.repos/<dest-name>/.git already exists it does nothing.
set -euo pipefail

if [ $# -lt 1 ]; then
  echo "usage: $0 <git-url> [dest-name] [ref]" >&2
  exit 1
fi

URL="$1"
DEST_NAME="${2:-}"
REF="${3:-}"

# default dest-name from the URL: strip .git, take the last path segment
if [ -z "$DEST_NAME" ]; then
  base="${URL%.git}"
  DEST_NAME="${base##*/}"
fi

REPO_DIR=".repos/$DEST_NAME"

if [ -d "$REPO_DIR/.git" ]; then
  echo "✓ already present: $REPO_DIR (nothing to do)" >&2
  exit 0
fi

mkdir -p .repos
echo "Cloning $URL -> $REPO_DIR ..." >&2
if [ -n "$REF" ]; then
  git clone --depth 1 --branch "$REF" "$URL" "$REPO_DIR"
else
  git clone --depth 1 "$URL" "$REPO_DIR"
fi

# keep the checkout out of version control (option 3)
if [ -f .gitignore ]; then
  if ! grep -qxF ".repos/" .gitignore && ! grep -qxF "$REPO_DIR" .gitignore; then
    printf '\n# vendored library source for agent research (not tracked)\n.repos/\n' >> .gitignore
    echo "  added '.repos/' to .gitignore" >&2
  fi
else
  printf '# vendored library source for agent research (not tracked)\n.repos/\n' > .gitignore
  echo "  created .gitignore with '.repos/'" >&2
fi

echo "✓ Source ready at $REPO_DIR" >&2
echo "  Point the skill's Research Strategy at: $REPO_DIR/<packages/...>/src/" >&2
echo "  (Optional) wire a 'prepare' task so teammates get it automatically — see setup.md option 3." >&2
