# Contributing

## Branches

- `main`: production branch, no direct pushes.
- `develop`: integration branch, no direct pushes.
- `feature/<dev-name>/<page-name>`: page or feature work.
- `chore/fourat/<task>`: configuration, tooling, and project maintenance.

Every pull request requires review before merging into `develop`.

`develop` merges into `main` only at the end of a sprint, after integration
testing has passed.

## Commits

Use conventional commit messages:

- `feat:` for new product behavior.
- `fix:` for bug fixes.
- `chore:` for tooling, config, and maintenance.
- `docs:` for documentation-only changes.
