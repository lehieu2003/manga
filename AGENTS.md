# Agent Rules

## Commit Message Quality

When the user asks an agent to commit code, do not create placeholder commits. Avoid vague messages such as `fix`, `update`, `changes`, `wip`, `misc`, `commit code`, or `fix bugs`.

Every agent-made code commit must use a specific conventional commit subject and a detailed body:

```text
<type>(<scope>): <specific behavior change>

- Explain the main code changes and why they were needed.
- Mention user-facing, API, schema, config, or operational impact when relevant.
- Mention important files/modules only when it clarifies the change.

Verification:
- List the exact tests, typechecks, builds, migrations, or manual checks run.
- If verification was not run, state the concrete reason.
```

Before committing:

- Review `git diff --staged` and make sure the commit message matches exactly what is staged.
- Keep each commit to one logical change.
- Never commit `.env` files, secrets, `node_modules`, generated logs, or unrelated local changes.
- Prefer non-interactive commit commands with multiple `-m` arguments so the full body is recorded.

Example:

```text
fix(reader): recover MangaDex reader images through stable origins

- Add fallback API origin handling when the primary MangaDex host is unreachable.
- Normalize dev image hosts to production uploads URLs so reader pages avoid stale dev CDN paths.
- Redirect page image requests when backend proxy fetch fails, preserving the validated chapter/page path.

Verification:
- npm run typecheck -w backend
- npm run test -w backend -- src/tests/unit/reader.test.ts src/tests/integration/routes/media-proxy.routes.test.ts
```
