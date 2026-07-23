# Test Strategy

## Project context

Astro Drift QA Lab is a small browser arcade game.

Current product loop:

```text
idle → running → gameOver
```

The game is rendered on Canvas, but the core rules stay outside the rendering layer.

## Main product risks

The most important risks are:

- player movement feels unfair or inconsistent;
- collision detection feels too strict or too loose;
- difficulty ramps too quickly or too slowly;
- restart does not reset the game cleanly;
- E2E tests can become flaky if they depend on Canvas pixels.

## Test levels

### Unit tests

Unit tests cover game rules and small boundary modules. Game update tests assert
next values and, where non-mutation is part of the contract, verify that
caller-owned inputs are unchanged.

Representative coverage areas include:

- movement, scoring, difficulty, collision, and frame rules;
- asteroid spawning, movement, variants, and cleanup;
- state creation, reset, and running-state advancement;
- formatting and deterministic randomness utilities; and
- keyboard input and local storage boundaries.

These tests should stay fast and independent from the browser.

### Property-based tests

[`engine.properties.test.ts`](../tests/unit/engine.properties.test.ts) uses
`fast-check` to check invariants that hold across many generated inputs, not just
hand-picked examples. Representative properties check that movement remains
within valid bounds, score does not decrease during valid running updates, and
spawn, movement, collision, and pass-bonus behavior stays within its contracts.
Randomized asteroid shapes and spawn behavior are tested through stable domain
contracts rather than exact generated values. The test file owns the exact current
properties, generators, and replay details.

### E2E tests

E2E tests cover durable browser-level responsibilities:

- the initial game shell and accessible DOM contract;
- starting and restarting through supported player actions;
- visible state-transition boundaries from `idle` through `running` to `gameOver`;
- running-state progression observed through stable DOM hooks; and
- responsive visibility and persistence behavior that genuinely requires a browser.

Playwright observes page behavior through stable DOM hooks and does not assert
Canvas pixels. Detailed rule behavior, storage parsing, and other small boundaries
stay in direct unit coverage. The E2E file owns the exact current scenarios, while
[agent instructions](../AGENTS.md) keep the concise operational list of stable
selectors.

### Manual verification

Manual browser checks cover areas where automated state assertions are
insufficient:

- visual composition and readability;
- responsive presentation;
- motion and reduced-motion experience;
- perceived performance; and
- gameplay feel.

Canvas pixel and screenshot assertions are deliberately excluded because small
presentation changes would make them brittle without improving confidence in the
underlying rules. Detailed rendering assumptions and visual invariants are owned by
[Visual Style Constraints](VISUAL-STYLE-CONSTRAINTS.md).

## What is automated now

`npm run check` is the canonical quality gate. Its executable graph lives in
[`package.json`](../package.json) and covers lint, TypeScript checking for tests,
unit tests, one production build, preview startup, and Playwright E2E.

`npm run test:coverage` is an optional, on-demand unit coverage report. No
coverage threshold is enforced, and coverage is not part of the canonical gate.
The report does not by itself detect or prevent regressions.

### CI

GitHub Actions invokes the canonical npm gate rather than maintaining another
expanded check sequence. Workflow triggers, permissions, job dependencies,
report upload, concurrency, and Pages deployment are owned by
[`.github/workflows/ci.yml`](../.github/workflows/ci.yml).

## Test data strategy

For unit tests, test data should be small and explicit.

Prefer helper factories such as:

```ts
createAsteroid({ x: 500, speed: 120 });
```

Avoid relying on exact random values.

Randomized game rules accept injected randomness. The retained `createSeededRng`
utility supports deterministic unit-level scenarios, while browser gameplay
supplies runtime randomness from the application shell and does not expose a
seed-query contract. `fast-check` provides its own reproducibility information
for generated property failures.

## Flaky test prevention

To reduce flaky tests:

- keep game logic testable without real time where possible;
- avoid assertions based on exact animation frames;
- avoid Canvas pixel assertions;
- use DOM status hooks for E2E;
- keep E2E scenarios short;
- test one main flow before adding more cases.
