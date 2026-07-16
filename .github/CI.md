# GitHub Actions & automation

CI, deployment, and dependency automation for [Lorerim GigaPlanner Plus](../README.md).

**Live site:** [https://watchis.github.io/Lorerim-GigaPlannerPlus/](https://watchis.github.io/Lorerim-GigaPlannerPlus/)

---

## Workflows

| Workflow | Trigger | Purpose |
|----------|---------|---------|
| [test.yml](workflows/test.yml) | Pull requests; pushes to `main` | `npm ci`, `npm test` |
| [functional-tests.yml](workflows/functional-tests.yml) | Pull requests; pushes to `main` | Playwright end-to-end functional tests against a production build |
| [pages-build-check.yml](workflows/pages-build-check.yml) | Pull requests | `npm ci`, `npm run build`, verify Pages artifact (same build steps as deploy) |
| [deploy.yml](workflows/deploy.yml) | Pushes to `main`; manual | `npm test`, build, deploy to GitHub Pages |
| [dependencies.yml](workflows/dependencies.yml) | Weekly (Mon 09:30 UTC); manual | Outdated report, `npm audit`, `npm test` |

---

## Test workflow

The test job installs dependencies with `npm ci`, then runs **`npm test`**:

- Vitest unit tests under `src/`
- Node built-in tests in `tools/import/lib/`

Node **22** is used in CI to match the deploy workflow.

**Policy:** Every new feature, behavior change, or bug fix must include unit tests. See [`.cursor/rules/unit-testing-requirements.mdc`](../.cursor/rules/unit-testing-requirements.mdc) for coverage expectations and conventions.

---

## Functional tests workflow

The functional test job installs dependencies, installs Chromium (with browser binary caching), then runs **`npm run test:e2e`**.

That script builds the SPA, serves it with `vite preview`, and runs Playwright specs under [`e2e/scenarios/`](../e2e/scenarios/). Coverage focuses on **complex** multi-step flows (full builds, vampire / Au Naturel / easy-mode edge cases, legacy share-code and `.gpp` import/export, mobile stacked planner) — not basic smoke covered by unit tests. See [`e2e/README.md`](../e2e/README.md).

On failure (and when the job is cancelled mid-run), the workflow uploads the HTML report and trace artifacts for debugging.

Match locally:

```bash
npx playwright install chromium
npm run test:e2e
```

---

## Pages build check workflow

On every pull request, the pages build check workflow runs the same production build and artifact validation steps as [deploy.yml](workflows/deploy.yml) (without uploading or deploying). This catches TypeScript errors, Vite build failures, and invalid `dist/` output before merge so the GitHub Pages deployment on `main` is less likely to fail.

Match locally:

```bash
npm ci
npm run build
```

---

## Deploy workflow

On every push to `main`, the deploy workflow:

1. Runs **`npm test`**
2. Builds with `npm run build`
3. Uploads `dist/` as a Pages artifact
4. Deploys via `actions/deploy-pages`

### GitHub Pages setup (one-time)

1. Open **Settings → Pages** for the repository.
2. Under **Build and deployment**, set **Source** to **GitHub Actions**.
3. Merge to `main` (or run the workflow manually) to publish.

**Private repositories:** GitHub Pages for private repos requires a paid GitHub plan (Pro, Team, or Enterprise). If deploy fails with `Ensure GitHub Pages has been enabled` or a plan error, enable Pages in settings or make the repository public.

---

## Dependabot

[dependabot.yml](dependabot.yml) opens weekly pull requests for:

| Ecosystem | Policy |
|-----------|--------|
| **npm** | Dev dependencies grouped into one PR; production patch updates grouped; minor/major production updates stay separate (up to 10 open PRs) |
| **github-actions** | Bumps `actions/*` pins used in workflows |

Dependabot PRs run through the test workflow like any other pull request.

---

## Local parity

Match CI locally before opening a PR:

```bash
npm ci
npm test
npm run test:e2e
npm run build
```

Run `npm run lint` separately when editing TypeScript/React code.

See [`src/README.md`](../src/README.md) for development setup and npm scripts.
