# Better Craps Simulator

Better Craps Simulator is a GitHub Pages-compatible craps felt trainer built with React, TypeScript, and Vite. The table is the primary interface: choose a chip, tap a felt area, roll the dice, and use optional training overlays to understand what is legal during the current phase of play.

Live site target: `https://oldfart95.github.io/Better-Craps-Simulator/`

## Educational Disclaimer

This app uses no real money and provides no wagering, gambling service, financial advice, or promise of results. It is for practice, rules learning, and probability/math exploration only.

## Current Features

- Realistic digital craps felt with direct tap-to-place betting
- Selected-chip workflow for pass line, don't pass, come, don't come, odds, field, place bets, hardways, props, and Big 6/8
- Clean point cycle handling for come-out rolls, point-on play, point made, and seven-out shooter rotation
- Beginner mode, free-practice mode, and optional legal-bet highlight overlay
- Concise help for pass line, don't pass, come/don't come, odds, field, place bets, and point cycle basics
- Quick stats button for bankroll, rhythm, table pressure, and longest hand
- Advanced stats modal for frequencies, bankroll spread, per-bet performance, and roll distribution
- Responsive layout for desktop, tablet, and mobile play

## Architecture Notes

The engine is split by responsibility so table behavior is easier to test and extend:

- `src/engine/diceEngine.ts` handles dice rolling and dice display helpers.
- `src/engine/shooterFlow.ts` owns come-out, point-on, point-made, and seven-out shooter flow.
- `src/engine/legalBets.ts` validates legal wager placement and explains unavailable bets.
- `src/engine/payoutLogic.ts` resolves each bet type against a roll.
- `src/engine/bankroll.ts` reserves, pays, loses, and pushes wagers, including free-practice behavior.
- `src/engine/stats.ts` collects roll, bankroll, distribution, and per-bet statistics.
- `src/engine/uiState.ts` builds trainer-facing explanations from engine state.
- `src/engine/gameEngine.ts` remains the public facade used by the UI and tests.

The UI keeps stats secondary to the felt:

- `src/App.tsx` owns session state, preferences, and modal visibility.
- `src/ui/views/TableView.tsx` renders the felt trainer, chip tray, training explanation, help, and stats dialogs.
- `src/styles.css` contains the GitHub Pages-friendly responsive visual system.

## Scripts

```bash
npm run dev
npm run build
npm test
```

## GitHub Pages Deployment

The Vite config uses the repository base path so the built app works under GitHub Pages.

1. In GitHub, open `Settings -> Pages`.
2. Set the source to `GitHub Actions`.
3. Push to `main`.
4. The workflow in `.github/workflows/deploy-pages.yml` builds and publishes `dist/`.

For a local production check:

```bash
npm run build
npm run preview
```
