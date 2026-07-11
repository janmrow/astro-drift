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

Unit tests cover pure game logic.

Current focus:

- player initial state;
- player movement;
- movement boundaries;
- input state defaults;
- scoring;
- passed asteroid bonuses;
- difficulty calculation;
- collision detection;
- asteroid movement;
- asteroid cleanup;
- asteroid spawn state;
- local best score storage.

These tests should stay fast and independent from the browser.

### Property-based tests

`engine.properties.test.ts` uses `fast-check` to check invariants that hold across
many generated inputs, not just hand-picked examples — e.g. player movement always
stays within its bounds, score never decreases, and collision detection always
triggers when an asteroid's center is inside the player hitbox and never triggers
once it is farther than its hit radius away. Where an invariant is meant to reflect
actual single-frame gameplay (not just the pure function's general robustness), the
delta-time arbitrary is bounded to the runtime's ~0.033s frame cap rather than the
wider range used elsewhere.

### E2E tests

E2E tests cover the main browser contract:

- page loads;
- canvas exists;
- game starts with Enter or Space;
- game status changes from `idle` to `running`;
- score, time, and asteroid count update while playing;
- collision moves status to `gameOver`, and pressing `R` restarts into a clean state
  (using a `?seed=` query param for a deterministic asteroid RNG, see `src/game/rng.ts`).

E2E tests should use DOM status hooks where possible instead of reading Canvas pixels.

## What is automated now

Current automated checks:

```text
npm run lint
npm test
npm run test:e2e
npm run build
```

`npm run test:coverage` reports unit test coverage. There is no enforced threshold yet — it exists as a backstop to catch silent coverage regressions.

Current unit test areas:

- `src/game/engine.ts`;
- `src/game/asteroids.ts`;
- `src/game/state.ts` (initial/restart state creation, score-bonus and bonus-feedback-timer math);
- `src/game/rng.ts` (seeded RNG used for deterministic asteroid spawning);
- `src/storage/bestScoreStorage.ts`.

### CI

CI should run these checks on pull requests and main branch updates:

```text
npm run lint
npm test
npm run test:e2e
npm run build
```

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
