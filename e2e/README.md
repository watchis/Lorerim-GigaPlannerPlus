# Functional tests (Playwright)

End-to-end coverage for the main planner SPA. Specs drive a production build served by `vite preview` (started automatically via `playwright.config.ts`).

## Run locally

```bash
npx playwright install chromium   # once per machine
npm run test:e2e
npm run test:e2e:ui               # interactive UI mode
```

## What is covered

| Spec | Flows |
|------|--------|
| `landing.spec.ts` | Home content, invalid share-code rejection |
| `navigation.spec.ts` | Desktop nav, mobile menu, unknown-route redirect |
| `planner.spec.ts` | Panels, race selection, level bar / perk budget, character options, persistence |
| `builds.spec.ts` | Create build, library search, import-as-new |
| `import.spec.ts` | Landing import, `?build=` planner import, home→planner redirect |

Helpers load copy and economy numbers from `data/ui/labels.json` and `data/game/mechanics.json` so tests stay aligned with game data instead of hardcoding UI strings.

## CI

[`.github/workflows/functional-tests.yml`](../.github/workflows/functional-tests.yml) runs `npm run test:e2e` on every pull request and push to `main`, uploading the Playwright HTML report (and traces on failure).
