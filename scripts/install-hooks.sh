#!/bin/sh
# Install the repo's git hooks into .git/hooks.
#
# The hooks are copied rather than pointed at via core.hooksPath on purpose:
# core.hooksPath is resolved in the working tree, so the guards would silently
# disappear whenever a branch that predates .githooks/ is checked out — which is
# exactly the case (develop, master) they are meant to guard.
set -e
root=$(git rev-parse --show-toplevel)
hooks=$(git rev-parse --git-path hooks)
for h in pre-commit pre-push; do
  cp "$root/.githooks/$h" "$hooks/$h"
  chmod +x "$hooks/$h"
  echo "installed $h"
done
