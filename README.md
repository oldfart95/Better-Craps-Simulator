# Better Craps Simulator

Better Craps Simulator is a board-first craps strategy trainer built with React, TypeScript, and Vite. It focuses on an authentic-feeling table layout, compact coaching-oriented stats, and a separate analytics/study surface so the live table stays polished instead of turning into a raw dashboard.

Live site target: `https://oldfart95.github.io/Better-Craps-Simulator/`

## Features

- Authentic craps felt with clickable wager zones
- Typed simulation engine with deterministic seed support
- Live session recap and compact coaching prompts
- Strategy lab for table and bankroll settings
- Batch study mode with exportable summaries
- Local preference persistence for training controls

## Scripts

```bash
npm run dev
npm run build
npm run test
```

## Project structure

- `src/engine/` typed game engine, rules, RNG, and batch simulation
- `src/ui/` presentation components and views
- `src/training/` coaching and compact stats derivation
- `src/presentation/` analytics formatting helpers
- `src/utils/` local persistence helpers

## Validation

- `npm test`
- `npm run build`

## GitHub Pages

This repo is configured for GitHub Pages deployment from the `main` branch through GitHub Actions.

1. In GitHub repo settings, open `Settings -> Pages`.
2. Set the source to `GitHub Actions`.
3. Push to `main` and the workflow in `.github/workflows/deploy-pages.yml` will build and publish the app.
