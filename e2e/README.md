# Functional tests (Playwright)

End-to-end coverage for **complex, multi-step planner flows**. Basic UI and engine behavior belong in Vitest unit tests under `src/`; this suite exercises cross-panel workflows, import/export, and mobile stacked layout.

Specs drive a production build served by `vite preview` (started automatically via `playwright.config.ts`).

## Run locally

```bash
npx playwright install chromium   # once per machine
npm run test:e2e
npm run test:e2e:ui               # interactive UI mode
```

Projects:

| Project | Viewport | Specs |
|---------|----------|--------|
| `desktop-chromium` | Desktop Chrome | `scenarios/builds/**`, `scenarios/planner/**` |
| `mobile-chromium` | Pixel 5 (&lt;720px stacked planner) | `scenarios/mobile/**` |

## Layout

```
e2e/
  fixtures/           # Legacy share codes and other static inputs
  helpers/            # Navigation, planner actions, labels, backups
  scenarios/
    builds/           # Legacy codes, .gpp backup, share-code round-trips
    planner/          # Multi-system character builds and edge progression
    mobile/           # Stacked-layout flows (section tabs + touch pickers)
```

## Scenarios

| Area | Spec | Flow |
|------|------|------|
| Builds | `legacy-v2-import` | Import a real v2 modpack share code into a new slot |
| Builds | `gpp-export-reimport` | Export active / full library `.gpp` and re-import |
| Builds | `share-code-roundtrip` | Complete a combat build, export v3 code, re-import from landing |
| Planner | `nord-warrior-build` | Race, signs, skills, traits, attributes, perk chains |
| Planner | `deep-perk-force-allocate` | Deep force-allocate raises skill + player level |
| Planner | `vampire-build` | Curse, hunger stage, Vampire tree perk |
| Planner | `oghma-infinium` | Claim book and assign skill choices |
| Planner | `variants-isolation` | Edits stay isolated across variants |
| Planner | `au-naturel-trait` | Trait unlocks gear controls and attribute summary |
| Planner | `level-101-easy-mode` | Standard max vs easy-mode warning |
| Mobile | `stacked-planner-build` | Section tabs, Select-race flow, vampire + combat perks |

Helpers load copy and economy numbers from `data/ui/labels.json` and `data/game/mechanics.json` so tests stay aligned with game data.

## CI

[`.github/workflows/functional-tests.yml`](../.github/workflows/functional-tests.yml) runs `npm run test:e2e` on every pull request and push to `main`, uploading the Playwright HTML report (and traces on failure).
