# Contributing

## Branching model

- `master` — released/stable. Never committed to directly.
- `develop` — integration branch and the **default target for all feature branches**. Never committed to directly.
- `feature/<name>` — where all work happens, branched from `develop`.

Flow:

```
git checkout develop && git pull
git checkout -b feature/my-change
# ... work, commit ...
git push -u origin feature/my-change
gh pr create --base develop
```

`develop` is promoted to `master` by a pull request when a release is cut.

## One-time setup (required)

The repo ships git hooks that refuse commits and pushes on `master`/`develop`.
Enable them once per clone:

```
sh scripts/install-hooks.sh
```

Both hooks can be bypassed with `--no-verify` for genuine exceptions, so they are
a guard rail, not enforcement. Server-side branch protection on GitHub is what
actually enforces the rule.
