# Astro Drift QA Lab

Astro Drift QA Lab is a small retro browser arcade game built with TypeScript, Vite, and Canvas.

It is also a practical QA/SDET portfolio project: a compact product with a clear gameplay loop, separated game logic, fast unit tests, stable browser smoke tests, linting, CI, and deployment automation.

The project is intentionally small. The goal is not to build a large game. The goal is to show how a simple frontend product can be engineered, tested, and documented cleanly.

## What You Can Play

You control a small spaceship and avoid incoming asteroids.

The current game flow is:

```text
idle -> running -> gameOver -> restart
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
    engine.ts
    asteroids.ts
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
    asteroids.test.ts
    bestScoreStorage.test.ts
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

The main architectural rule is simple:

> Keep game rules separate from Canvas rendering.

The decision is documented in [ADR-001: Separate game engine from rendering](docs/ADR-001-separate-engine-from-rendering.md).

Core gameplay rules live in `src/game/`:

- player movement
- movement boundaries
- score calculation
- difficulty ramping
- asteroid spawning and movement
- collision checks
- score and time formatting

Rendering lives in `src/rendering/canvasRenderer.ts`. It draws the background, stars, player, asteroids, HUD, bonus feedback, and game over overlay.

Keyboard input lives in `src/input/keyboard.ts`.

Local best score persistence lives in `src/storage/bestScoreStorage.ts`.

`src/main.ts` connects these pieces: input, game state, rendering, storage, DOM status hooks, and the animation loop.

This structure keeps the important behavior testable without relying on Canvas pixel assertions.

For a quick model or reviewer handoff, start with this README, then read `TEST_STRATEGY.md` and the ADR linked above.

## Testing Approach

Unit tests cover pure game logic, including movement, boundaries, scoring, asteroid behavior, collision checks, formatting, and best score storage.

Playwright tests cover the main browser smoke flow:

- the page loads
- the canvas is visible
- the game starts in `idle`
- Enter starts the game
- Space starts the game
- DOM status hooks update to `running`
- score, time, and asteroid status hooks progress while the game is running

The project intentionally does not test Canvas pixels. Pixel-level tests are brittle and would make small visual changes look like gameplay regressions. Instead, game rules are tested directly and browser flow is checked through stable DOM hooks such as `data-testid`.

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

This repository is currently frontend-only.

In scope:

- improving the existing arcade gameplay loop
- small gameplay polish
- small visual polish
- improving architecture without overengineering
- improving tests, linting, build, CI, deployment, and documentation
- keeping the game lightweight and performant

Out of scope unless explicitly requested:

- React or another frontend framework
- backend leaderboard
- SQL database
- user accounts
- multiplayer
- complex levels
- shooting mechanics
- power-ups
- large visual redesigns
- broad rewrites

## What This Project Demonstrates

- A playable browser game built without a frontend framework
- Core game logic separated from rendering
- Fast unit tests for the important rules
- Playwright smoke tests that avoid brittle Canvas pixel checks
- A local quality gate that mirrors CI
- GitHub Actions for CI and GitHub Pages deployment
- Lightweight architecture documented with an ADR

## License

This project is licensed under the [MIT License](LICENSE).
