# AGENTS.md

## Project

Astro Drift QA Lab is a small TypeScript/Canvas arcade game and QA/SDET portfolio project.

Optimize for a small, playable, polished arcade loop with clear architecture, readable TypeScript, practical automated tests, and focused changes.

**Project principle:** Small game. Clear code. Strong tests. No overengineering.

## Setup and Commands

This project uses Node.js 22 and npm.

See [README.md](README.md) for setup and primary commands. The scripts in
`package.json` are the executable source of truth. Use `npm run check` as the
canonical full quality gate; run narrower scripts such as `npm test`,
`npm run lint`, or `npm run build` while iterating.

Run a single unit test file:

```bash
npx vitest run tests/unit/engine.test.ts
```

Install the Chromium browser used by Playwright on a fresh machine:

```bash
npx playwright install chromium
```

Do not run `npm run test:e2e` and `npm run check` concurrently. Both manage the same Playwright preview server on `localhost:4173`.

If E2E appears stuck while starting its web server, diagnose it once with:

```bash
DEBUG=pw:webserver npm run test:e2e
```

Do not manually start `vite preview` for normal E2E or full-check runs; Playwright starts the preview server through `playwright.config.ts`.

## Architecture

The core rule is: **game logic never touches Canvas**.

`src/game/` owns game rules and state transitions. Its update functions return
next values without mutating caller-owned inputs. Browser, Canvas, input,
storage, time, and randomness effects stay at explicit shell boundaries:
`src/main.ts`, `src/rendering/`, `src/input/`, and `src/storage/`.

See [ADR-001](docs/ADR-001-separate-engine-from-rendering.md) for the durable
responsibility boundary and [Engineering Principles](docs/PRINCIPLES.md) for the
functional-core / imperative-shell dependency rule.

The game state machine is:

```text
idle -> running -> gameOver
```

`src/main.ts` holds one `gameState: GameState` object and tracks `gameStatus`
separately. This separation is intentional; see the ADR-001 addendum on state
transitions.

While the game is running, `advanceRunningGame` from `src/game/state.ts` returns
the next game state and collision information. Prefer value-returning functions
for new gameplay behavior and keep effects at the established boundaries.

Stable `data-testid` DOM hooks relied on by Playwright:

**Game shell and regions**

- `[data-testid="game-canvas"]`
- `[data-testid="game-status-panel"]`
- `[data-testid="game-stats-panel"]`

**State values**

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
- Keep game rules in `src/game/`, Canvas rendering and tokens in
  `src/rendering/`, DOM styling in `src/style.css`, keyboard input in
  `src/input/keyboard.ts`, and browser persistence in
  `src/storage/bestScoreStorage.ts`.
- Keep `src/main.ts` mostly as glue.
- Prefer value-returning functions for new gameplay behavior.
- Write clear, engineering-oriented TypeScript with explicit names, small functions, straightforward control flow, and readable conditionals.
- Avoid clever one-liners, premature patterns, unnecessary abstractions, and broad refactors mixed with feature work.

Before changing an invariant relied on by many call sites, audit all existing call sites first. List how each will be handled. If more than a few require special treatment, reconsider the approach instead of patching them one by one. See `docs/VISUAL-STYLE-CONSTRAINTS.md`, section “Techniques that change a rendering assumption”, for a previous example.

## Testing

Use unit tests for game rules and small boundary modules. Keep Playwright focused
on important browser contracts. The current test-layer rationale and coverage
boundaries live in [the test strategy](docs/TEST_STRATEGY.md).

Property-based tests use `fast-check`. Prefer small explicit helper factories over repeated raw object literals:

```ts
createAsteroid({ x: 500, speed: 120 });
```

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

- [README.md](README.md) is the public project snapshot: purpose, setup, commands,
  testing, and high-level architecture.
- Update `README.md` when setup, commands, structure, user-facing behavior, roadmap, or scope changes.
- Update [the test strategy](docs/TEST_STRATEGY.md) when test levels, E2E
  strategy, quality gates, or major coverage decisions change.
- Update shared agent instructions when architecture-level facts change, especially the layout under `src/game/`, state ownership, or the role of `src/main.ts`.
- Add or update an ADR in `docs/` only for meaningful architectural decisions, not small local refactors.
- Keep visual invariants and rendering-assumption guidance in
  [the visual constraints](docs/VISUAL-STYLE-CONSTRAINTS.md).
