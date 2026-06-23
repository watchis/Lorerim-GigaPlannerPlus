# GitHub Actions

| Workflow | Trigger | Purpose |
|----------|---------|---------|
| [test.yml](workflows/test.yml) | Pull requests; pushes to `main` | `npm ci`, `npm test` |
| [deploy.yml](workflows/deploy.yml) | Pushes to `main`; manual | Build and deploy to GitHub Pages |

## Test workflow

The test job installs dependencies with `npm ci`, then runs **`npm test`** (Vitest under `src/` plus Node built-in tests in `tools/import/lib/`).

Node **22** is used in CI to match the deploy workflow.

## Local parity

```bash
npm ci
npm test
```

Run `npm run lint` separately when editing TypeScript/React code.

See the root [README.md](../README.md#testing) for script details.
