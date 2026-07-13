# Astro Drift QA Lab

Astro Drift QA Lab is a small browser arcade game built with TypeScript, Vite, and Canvas.

The repo keeps game rules separate from rendering, with unit tests for core logic and Playwright smoke tests for the browser flow.

## What You Can Play

You control a small spaceship and avoid incoming asteroids.

The current game flow is:

```text
idle -> running -> gameOver
```

Current gameplay:

- Canvas-rendered retro arcade scene
- keyboard controls with Arrow keys or WASD
- start with Enter or Space
- asteroids moving from right to left
- collision detection
- score increasing over time
- bonus score for passing asteroids
- local best score stored in the browser
- game over state
- quick restart with R, Enter, or Space

## Tech Stack

- TypeScript
- Vite
- Canvas
- Vitest
- Playwright
- ESLint
- GitHub Actions

## Getting Started

Use Node.js 22. The CI pipeline runs on Node 22, so local development should match it.

Install dependencies from the lockfile:

```bash
npm ci
```

Start the local dev server:

```bash
npm run dev
```

Build the production bundle:

```bash
npm run build
```

Preview the production build locally:

```bash
npm run preview
```

## Quality Checks

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

Playwright builds the app and starts a local preview server from `playwright.config.ts`.

Run the full local quality gate:

```bash
npm run check
```

The scripts in `package.json` are the executable source of truth for the gate.
Through that script graph, `npm run check` runs lint, TypeScript checking for the
tests, unit tests, one production build, a preview server, and Playwright E2E.

If Playwright browsers are missing on a fresh machine, install Chromium:

```bash
npx playwright install chromium
```

## Project Structure

```text
src/
  main.ts
  game/
    asteroids.ts
    balance.ts
    engine.ts
    format.ts
    rng.ts
    state.ts
    types.ts
  input/
    keyboard.ts
  rendering/
    canvasRenderer.ts
    theme.ts
  storage/
    bestScoreStorage.ts
  style.css

tests/
  unit/
    engine.test.ts
    engine.properties.test.ts
    asteroids.test.ts
    bestScoreStorage.test.ts
    format.test.ts
    helpers.ts
    keyboard.test.ts
    rng.test.ts
    state.test.ts
  e2e/
    game.spec.ts

docs/
  ADR-001-separate-engine-from-rendering.md
  PRINCIPLES.md
  TEST_STRATEGY.md
  VISUAL-STYLE-CONSTRAINTS.md

.github/
  workflows/
    ci.yml
```

## How The Code Is Organized

The main architectural rule is simple: keep game rules separate from Canvas rendering.

The decision is documented in [ADR-001: Separate game engine from rendering](docs/ADR-001-separate-engine-from-rendering.md).

Core gameplay rules live in `src/game/`:

- player movement
- movement boundaries
- score calculation
- difficulty ramping
- asteroid spawning and movement
- collision checks
- score and time formatting
- gameplay tuning constants (`balance.ts`)
- per-frame game state orchestration (`state.ts`)
- explicit randomness inputs and a deterministic RNG utility
- shared game-domain types

Game update functions return next values without mutating caller-owned game state
or collections. `advanceRunningGame` returns the next game state together with
collision information.

Canvas drawing lives in `src/rendering/canvasRenderer.ts`; Canvas palette and
typography helpers live in `src/rendering/theme.ts`. DOM styling, including the
font-family source used by both DOM and Canvas text, lives in `src/style.css`.

Keyboard input lives in `src/input/keyboard.ts`.

Local best score persistence lives in `src/storage/bestScoreStorage.ts`.

`src/main.ts` connects these pieces and owns the imperative browser shell: input,
time, runtime game-rule randomness, game state, rendering, storage, DOM status
hooks, and the animation loop. The renderer owns separate visual randomness,
currently used only for the star field.

This structure keeps the important behavior testable without relying on Canvas pixel assertions.

## Testing Approach

Unit tests cover game rules and small boundary modules, including movement,
boundaries, scoring, asteroid behavior, collision, state advancement, formatting,
deterministic RNG behavior, keyboard input, and best-score storage. The suite
includes example-based tests and property-based tests with `fast-check` for core
invariants such as movement bounds, non-decreasing score, spawn interval limits,
asteroid movement, and pass bonus rules.

Playwright tests cover the main browser smoke flow:

- the initial Canvas and DOM contract
- Enter and Space starting the game
- the restart key not starting an idle game
- running status, score, time, and asteroid-count progression
- `aria-live` being limited to status announcements
- best-score persistence when a running tab is hidden

Full browser game-over/restart remains a manual smoke check rather than an
automated E2E scenario. Collision and clean initial-state rules are tested
directly at unit level.

The project does not test Canvas pixels. Pixel-level tests are brittle and would make small visual changes look like gameplay regressions. Instead, game rules are tested directly and browser flow is checked through stable DOM hooks such as `data-testid`.

More detail is documented in the [test strategy](docs/TEST_STRATEGY.md).

## CI And Deployment

GitHub Actions runs the canonical `npm run check` gate for pushes and pull
requests targeting `main`, as well as manual workflow runs. A dependent job
builds and deploys GitHub Pages after verification for eligible `main` pushes or
manual runs. Workflow triggers, permissions, dependencies, and deployment steps
are defined in `.github/workflows/ci.yml`.

For Pages builds, `vite.config.ts` adjusts the Vite `base` path through the `GITHUB_PAGES=true` environment variable.

## Project Scope

This repository is frontend-only. The codebase currently covers the arcade game, its tests, CI, and GitHub Pages deployment.

## License

This project is licensed under the [MIT License](LICENSE).
