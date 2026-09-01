# Repository Management

This is a fork of the upstream Lark MCP repo. Keep `main` synchronized with
upstream and do all our development on feature branches.

## Remotes

- `origin`   -> `git@github.com:kouroshoseini/lark-openapi-mcp.git` (our fork)
- `upstream` -> `https://github.com/larksuite/lark-openapi-mcp.git` (original)

## Branch strategy

- `main` is the stable branch and tracks `upstream/main`. Never develop
  directly on `main`.
- All our work happens on feature branches (e.g. `feat/read-chat-messages`),
  branched off `main`.
- When a feature is ready, merge it into `main` (or open a PR against our
  fork's `main`).

## Keeping in sync with upstream

```bash
git fetch upstream
git checkout main
git merge upstream/main
git push origin main
```

For a cleaner linear history, use `git rebase upstream/main` instead of
`git merge upstream/main`.

## Rebase feature branches onto latest main

```bash
git fetch upstream
git checkout main
git merge upstream/main          # bring main up to date
git checkout <feature-branch>
git rebase main
```

## Daily development

```bash
git checkout -b feat/<name>      # new feature off main
git add .
git commit -m "..."
git push -u origin feat/<name>
```

## Rules

- Do not force-push or rewrite shared branch history unless the user asks.
- Do not merge feature branches into `main` unless the user asks.
- Commit messages follow the repo's existing conventional-commit style
  (e.g. `feat(im): ...`, `doc: ...`).
