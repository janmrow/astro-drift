# AGENTS.md

## Project

Astro Drift QA Lab is a small TypeScript/Canvas arcade game and QA/SDET portfolio project.

Optimize for a small, playable, polished arcade loop with clear architecture, readable TypeScript, practical automated tests, and focused changes.

**Project principle:** Small game. Clear code. Strong tests. No overengineering.

## Setup and Commands

This project uses Node.js 22 and npm.

```bash
npm run dev          # local development server
npm run build        # TypeScript check and Vite build
npm test             # unit tests only
npm run test:watch   # unit tests in watch mode
npm run lint         # ESLint
npm run test:e2e     # Playwright E2E; starts its preview server
npm run check        # full gate: lint -> unit tests -> E2E -> build
```

Run a single unit test file:

```bash
npx vitest run tests/unit/engine.test.ts
```

Install the Chromium browser used by Playwright on a fresh machine:

```bash
npx playwright install chromium
```

Use `npm run check` as the main local quality gate.

Do not run `npm run test:e2e` and `npm run check` concurrently. Both manage the same Playwright preview server on `localhost:4173`.

If E2E appears stuck while starting its web server, diagnose it once with:

```bash
DEBUG=pw:webserver npm run test:e2e
```

Do not manually start `vite preview` for normal E2E or full-check runs; Playwright starts the preview server through `playwright.config.ts`.

## Architecture

The core rule is: **game logic never touches Canvas**.

| Layer | Files | Responsibility |
|---|---|---|
| Game logic | `src/game/engine.ts`, `asteroids.ts`, `format.ts`, `types.ts`, `balance.ts`, `state.ts`, `rng.ts` | Pure movement, boundaries, scoring, difficulty, collision, asteroid behavior, formatting, tuning, state advancement, and deterministic RNG |
| Rendering | `src/rendering/canvasRenderer.ts` | All Canvas drawing |
| Input | `src/input/keyboard.ts` | Keyboard events mapped to `InputState` |
| Storage | `src/storage/bestScoreStorage.ts` | Best-score persistence in `localStorage` |
| Glue | `src/main.ts` | Animation loop and wiring between state, input, rendering, storage, and DOM hooks |

The game state machine is:

```text
idle -> running -> gameOver
```

`src/main.ts` holds one `gameState: GameState` object and tracks `gameStatus` separately. This separation is intentional; see the `ADR-001` addendum on state transitions.

While the game is running, `advanceRunningGame` from `src/game/state.ts` advances the state. Game-rule functions in `src/game/` should be pure and return new values.

Stable DOM hooks used by Playwright:

- `[data-testid="game-status"]`
- `[data-testid="game-score"]`
- `[data-testid="game-time"]`
- `[data-testid="asteroid-count"]`

## Engineering Guardrails

- Keep the game lightweight, playable, and performant.
- Improve the existing arcade loop, small visual polish, architecture, tests, CI, and documentation.
- Do not grow the project into a large game unless explicitly requested.
- Do not add React, a backend, accounts, a database, multiplayer, complex levels, shooting mechanics, power-ups, large redesigns, or broad rewrites unless explicitly requested.
- Keep the existing stack: TypeScript, Vite, Canvas, Vitest, Playwright, ESLint, and GitHub Actions.
- Do not switch package managers or add dependencies unless the task requires it or the trade-off is clearly justified.
- Keep game rules in `src/game/`, Canvas rendering in `src/rendering/canvasRenderer.ts`, keyboard input in `src/input/keyboard.ts`, and browser persistence in `src/storage/bestScoreStorage.ts`.
- Keep `src/main.ts` mostly as glue.
- Prefer pure functions for new gameplay behavior.
- Write clear, engineering-oriented TypeScript with explicit names, small functions, straightforward control flow, and readable conditionals.
- Avoid clever one-liners, premature patterns, unnecessary abstractions, and broad refactors mixed with feature work.

Before changing an invariant relied on by many call sites, audit all existing call sites first. List how each will be handled. If more than a few require special treatment, reconsider the approach instead of patching them one by one. See `docs/VISUAL-STYLE-CONSTRAINTS.md`, section “Techniques that change a rendering assumption”, for a previous example.

## Testing

Use unit tests for pure rules, including movement, boundaries, scoring, formatting, difficulty, asteroid behavior, collision, restart behavior, and best-score storage.

Property-based tests use `fast-check`. Prefer small explicit helper factories over repeated raw object literals:

```ts
createAsteroid({ x: 500, speed: 120 });
```

Use Playwright only for important browser flows such as page load, Canvas presence, idle status, starting, status updates, and restart where practical.

- Do not test Canvas pixels.
- Assert through stable DOM hooks such as `data-testid`.
- Keep E2E tests short, stable, independent, and free of test-order assumptions.

## Workflow

- Prefer small, focused changes.
- Identify likely files before editing.
- Do not combine unrelated refactors with feature work.
- Do not rewrite the project for a small request.
- Do not silently change product direction.
- Do not create commits unless explicitly asked.
- When a request is ambiguous, make the smallest reasonable assumption and state it briefly.
- Check `git status` before larger edits.
- Do not reset, checkout, delete, or discard unrelated changes unless explicitly asked.
- Run the narrowest relevant checks first.
- For broader or riskier changes, run `npm run check`.
- If a check cannot be run, say so and run the best available alternative.

After changing code, summarize:

- what changed,
- important files touched,
- checks run and their results,
- checks that could not be run.

## Branch Naming

Use `prefix/kebab-case-description`.

- `feature/` — one new capability
- `fix/` — a bug fix, including a visual bug
- `docs/` — documentation only
- `refactor/` — restructuring without behavior change
- `redesign/` — multiple related concerns around an existing system, typically within `src/rendering/`
- `tests/` — test-suite-only changes
- `infra/` — CI, tooling, or configuration

For mixed changes entirely within `src/rendering/` that combine more than one concern, use `redesign/`. Otherwise choose the prefix matching the riskiest part of the change.

## Documentation

Do not duplicate the README in agent instructions.

- `README.md` is the public project snapshot: purpose, setup, commands, testing, and high-level architecture.
- Update `README.md` when setup, commands, structure, user-facing behavior, roadmap, or scope changes.
- Update `TEST_STRATEGY.md` when test levels, E2E strategy, quality gates, or major coverage decisions change.
- Update shared agent instructions when architecture-level facts change, especially the layout under `src/game/`, state ownership, or the role of `src/main.ts`.
- Add or update an ADR in `docs/` only for meaningful architectural decisions, not small local refactors.
