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

The quality gate runs:

```text
lint -> unit tests -> Playwright E2E -> build
```

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
    keyboard.test.ts
    rng.test.ts
    state.test.ts
  e2e/
    game.spec.ts

docs/
  ADR-001-separate-engine-from-rendering.md

.github/
  workflows/
    ci.yml
    deploy-pages.yml
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

Rendering lives in `src/rendering/canvasRenderer.ts`. It draws the background, stars, player, asteroids, HUD, bonus feedback, and game over overlay.

Keyboard input lives in `src/input/keyboard.ts`.

Local best score persistence lives in `src/storage/bestScoreStorage.ts`.

`src/main.ts` connects these pieces: input, game state, rendering, storage, DOM status hooks, and the animation loop.

This structure keeps the important behavior testable without relying on Canvas pixel assertions.

## Testing Approach

Unit tests cover pure game logic, including movement, boundaries, scoring, asteroid behavior, collision checks, formatting, and best score storage. The suite includes example-based tests and property-based tests with `fast-check` for core invariants such as movement bounds, non-decreasing score, spawn interval limits, asteroid movement, and pass bonus rules.

Playwright tests cover the main browser smoke flow:

- the page loads
- the canvas is visible
- the game starts in `idle`
- Enter starts the game
- Space starts the game
- DOM status hooks update to `running`
- score, time, and asteroid status hooks progress while the game is running

The project does not test Canvas pixels. Pixel-level tests are brittle and would make small visual changes look like gameplay regressions. Instead, game rules are tested directly and browser flow is checked through stable DOM hooks such as `data-testid`.

More detail is documented in [TEST_STRATEGY.md](TEST_STRATEGY.md).

## CI And Deployment

GitHub Actions runs CI on pushes and pull requests targeting `main`.

The CI workflow:

```text
npm ci
npm run lint
npm test
npx playwright install --with-deps chromium
npm run test:e2e
npm run build
```

The GitHub Pages deployment workflow also runs the full quality gate before publishing the built `dist/` artifact.

For Pages builds, `vite.config.ts` adjusts the Vite `base` path through the `GITHUB_PAGES=true` environment variable.

## Project Scope

This repository is frontend-only. The codebase currently covers the arcade game, its tests, CI, and GitHub Pages deployment.

## License

This project is licensed under the [MIT License](LICENSE).
