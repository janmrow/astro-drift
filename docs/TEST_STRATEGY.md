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
next values and, where valuable, verify that caller-owned inputs are unchanged.

Current focus:

- engine rules: initial player/input state, movement, boundaries, scoring,
  difficulty, pass bonuses, collision, and frame-delta capping;
- asteroid spawning, ranges, variants, movement, bouncing, rotation, and cleanup;
- running-state advancement, initial/reset state creation, score bonuses, and
  bonus-feedback timing;
- deterministic RNG repeatability and output range;
- score and time formatting;
- keyboard movement/action mapping, default prevention, blur reset, and explicit
  input reset; and
- local best-score storage, normalization, and storage-failure behavior.

These tests should stay fast and independent from the browser.

### Property-based tests

[`engine.properties.test.ts`](../tests/unit/engine.properties.test.ts) uses
`fast-check` to check invariants that hold across many generated inputs, not just
hand-picked examples — e.g. player movement always stays within its bounds, score
never decreases, and collision detection always triggers when an asteroid's center
is inside the player hitbox and never triggers once it is farther than its hit
radius away. Delta-time properties use a shared broad arbitrary spanning 0 to 10
seconds, exercising the retained invariants beyond ordinary single-frame timing
without defining separate runtime-frame-specific property coverage.

### E2E tests

E2E tests cover the main browser contract:

- the initial Canvas and DOM status/stat contract;
- starting with Enter or Space;
- rejecting the restart key while the game is still `idle`;
- `running` status plus score, time, and asteroid-count progression;
- limiting `aria-live` announcements to game status; and
- persisting the best score when a running tab becomes hidden.

E2E tests should use DOM status hooks where possible instead of reading Canvas pixels.

Full browser `gameOver`/restart behavior is a manual smoke check. Collision and
clean initial-state behavior remain covered directly by unit tests, but the suite
does not claim automated browser coverage for the complete restart flow.

Randomized game rules continue to accept an injected RNG function. The retained
`createSeededRng` utility is unit-tested and supports deterministic unit scenarios;
browser gameplay supplies randomness from the application shell and does not
expose a seed query contract.

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

## What we do not test

We do not test Canvas rendering pixel by pixel.

Reasons:

- pixel tests are brittle;
- small visual changes can break them without breaking gameplay;
- the important rules are already testable outside Canvas;
- E2E tests can verify user-visible flow through DOM status hooks.

We also do not test every random asteroid shape.

Instead, we test stable behavior:

- spawn state;
- spawned asteroid ranges with controlled randomness;
- movement;
- cleanup;
- collision-related rules.

## Test data strategy

For unit tests, test data should be small and explicit.

Prefer helper factories such as:

```ts
createAsteroid({ x: 500, speed: 120 });
```

Avoid relying on exact random values.

## Flaky test prevention

To reduce flaky tests:

- keep game logic testable without real time where possible;
- avoid assertions based on exact animation frames;
- avoid Canvas pixel assertions;
- use DOM status hooks for E2E;
- keep E2E scenarios short;
- test one main flow before adding more cases.

## Known trade-offs

The project uses a small amount of architecture earlier than a tiny game strictly needs. That is intentional.

The current setup gives us:

- separated game rules;
- testable logic;
- clear rendering boundary;
- readable tests;
- simple documentation;
- quality gates.
