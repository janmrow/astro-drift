# Astro Drift QA Lab

Astro Drift QA Lab is a small retro browser arcade game built with TypeScript and Canvas.

The project is designed as a practical QA/SDET / Quality Engineering portfolio project.

The goal is not to build a large game.  
The goal is to create a small playable loop and surround it with clean, testable, quality-focused engineering.

## Current gameplay

The player controls a small spaceship and avoids incoming asteroids.

Current game loop:

```text
idle → running → gameOver → restart
```

Current features:

- Canvas-based retro arcade game;
- keyboard controls with Arrow Keys and WASD;
- start with Enter or Space;
- asteroids flying from right to left;
- collision detection;
- score increasing over time;
- bonus score for passing asteroids;
- local best score stored in the browser;
- Game Over state;
- quick restart with R, Enter or Space.

## Tech stack

- TypeScript;
- Vite;
- Canvas;
- Vitest;
- Playwright;
- ESLint;
- GitHub Actions.

## Getting started

Install dependencies:

```bash
npm install
```

Run the app locally:

```bash
npm run dev
```

Build the project:

```bash
npm run build
```

Preview production build:

```bash
npm run preview
```

## Quality checks

Run lint:

```bash
npm run lint
```

Run unit tests:

```bash
npm test
```

Run Playwright E2E tests:

```bash
npm run test:e2e
```

Run the full local quality gate:

```bash
npm run check
```

The local quality gate runs:

```text
lint → unit tests → Playwright E2E → build
```

## Project structure

```text
src/
  main.ts
  game/
    engine.ts
    asteroids.ts
    types.ts
  input/
    keyboard.ts
  rendering/
    canvasRenderer.ts
  storage/
    bestScoreStorage.ts

tests/
  unit/
    engine.test.ts
    asteroids.test.ts
    bestScoreStorage.test.ts
  e2e/
    game.spec.ts

docs/
  ADR-001-separate-engine-from-rendering.md

.github/
  workflows/
    quality.yml
```

## Architecture notes

The most important architectural decision is separating game rules from Canvas rendering.

The game logic lives in:

```text
src/game/engine.ts
src/game/asteroids.ts
```

Canvas rendering lives in:

```text
src/rendering/canvasRenderer.ts
```

Keyboard handling lives in:

```text
src/input/keyboard.ts
```

Local browser storage lives in:

```text
src/storage/bestScoreStorage.ts
```

The entry point:

```text
src/main.ts
```

acts mostly as glue between input, game state, rendering and storage.

This keeps the core rules testable without relying on browser rendering or Canvas pixels.

## Testing approach

The project intentionally avoids testing Canvas pixel output.

Instead, it focuses on:

- unit tests for pure game rules;
- unit tests for asteroid behavior;
- unit tests for local best score storage;
- Playwright smoke tests for the main browser flow;
- DOM status hooks for stable E2E assertions.

Current test strategy is documented in:

```text
TEST_STRATEGY.md
```

## CI

GitHub Actions runs the quality workflow on push and pull requests.

The workflow runs:

```text
npm ci
npx playwright install --with-deps chromium
npm run check
```

Playwright reports are uploaded as artifacts when E2E tests fail.

## What this project demonstrates

This project demonstrates practical quality engineering around a small product:

- building a playable browser game;
- separating core logic from rendering;
- writing fast unit tests for game rules;
- using E2E tests without brittle pixel assertions;
- adding local quality gates;
- using CI for automated checks;
- documenting architectural and testing decisions.

## Current non-goals

The project intentionally does not include yet:

- backend leaderboard;
- SQL database;
- user accounts;
- multiplayer;
- mobile-first UI;
- power-ups;
- shooting mechanics;
- complex levels;
- advanced graphics.

These are avoided to keep the project small, focused and maintainable.

A backend leaderboard, SQL database, API tests, Docker Compose and deploy can be added later as separate milestones.

## Roadmap

Near-term frontend quality roadmap:

```text
1. Improve gameplay polish where it adds clear value
2. Keep Playwright E2E small and stable
3. Maintain CI quality gate
4. Add deployment, likely through GitHub Pages
5. Add backend leaderboard later as a separate milestone
```

The guiding principle:

> Small game, strong quality engineering, no overengineering.