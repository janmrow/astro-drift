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

- engine rules: fixed horizontal player position, vertical movement and bounds,
  gameplay-speed multiplier combinations, pass-only scoring, exact standard (`25`)
  and fiery (`100`) rewards, one-time reward accounting, collision, and frame-delta
  capping;
- asteroid spawning across continuous vertical ranges, standard/fiery variant
  chance and identity, horizontal movement at a stable Y position, rotation,
  cleanup, and bounded speed and spawn-interval difficulty ramps, including the
  final speed cap for both variants;
- running-state advancement, initial/reset state creation, scaled gameplay time and
  world movement, survival time remaining independent from score, and real-time
  individual `+25`/`+100` feedback timing;
- deterministic RNG repeatability and output range;
- score and time formatting;
- keyboard mapping for Arrow Up/Down and W/S vertical movement, Arrow Left/A braking,
  Arrow Right/D boosting, overlapping held aliases, Enter-only game actions, ignored
  Space/R, default prevention, blur reset, and explicit input reset; and
- local best-score storage, normalization, and storage-failure behavior.

These tests should stay fast and independent from the browser.

### Property-based tests

[`engine.properties.test.ts`](../tests/unit/engine.properties.test.ts) uses
`fast-check` to check invariants that hold across many generated inputs, not just
hand-picked examples. These include preserving player X while keeping Y in bounds;
keeping spawn intervals and final standard/fiery speeds within their limits as
difficulty rises; moving and rotating asteroids without changing their Y position;
and awarding only known pass values without duplicate rewards. Collision properties
cover definite hits inside the player hitbox and definite misses beyond the
asteroid hit radius. Delta-time properties use a shared broad arbitrary spanning
0 to 10 seconds, exercising retained invariants beyond ordinary single-frame timing
without defining separate runtime-frame-specific property coverage.

### E2E tests

E2E tests cover the main browser contract:

- the initial page contract: the exact browser title, visible Canvas and its
  accessible name and control description, visually hidden page heading,
  desktop-hidden responsive gameplay guidance, visible chart-window label,
  removed legacy visible chrome, and initial DOM status/stat values;
- the compact page-shell contract at a 320 CSS-pixel viewport: the same DOM
  gameplay guidance becomes visible with Enter start/restart, Arrow/W/S steering,
  Left/A braking, and Right/D boosting instructions, while the Canvas and
  chart-window label remain visible and the status/stat panels remain hidden;
- starting with Enter while Space and R leave the game `idle`;
- reaching `gameOver` through a deterministic browser scenario and restarting the
  round with Enter;
- survival time and asteroid count advancing while score remains pass-based, then
  observing a standard `25`-point pass;
- limiting `aria-live` announcements to game status; and
- persisting the best score when a running tab becomes hidden.

E2E tests should use DOM status hooks where possible instead of reading Canvas pixels.

The browser persistence scenario verifies the visibility-change save boundary;
storage parsing, normalization, higher-score selection, and failure handling remain
unit-level coverage. Best score is derived from score, not survival time.

Canvas-only presentation and feel remain manual browser checks. This includes
palette and visual hierarchy; player and asteroid appearance; asteroid surface
clipping; engine-impulse appearance; HUD, state-screen, and pass-feedback
readability; responsive Canvas readability and balance; layered star parallax;
reduced-motion appearance;
contrast, overlap, and gameplay-speed clarity; and any screenshot comparison.
Playwright covers only the stable responsive DOM visibility contract described
above; it does not validate Canvas text size or appearance.
The underlying feedback, collision, movement, and scoring rules are covered below
the browser layer, but that does not make those visual contracts E2E-covered.

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

We do not test Canvas rendering pixel by pixel, compare screenshots, or mock
Canvas draw calls.

Reasons:

- pixel tests are brittle;
- small visual changes can break them without breaking gameplay;
- the important rules are already testable outside Canvas;
- E2E tests can verify user-visible flow through DOM status hooks.

We also do not test every random asteroid shape.

Instead, we test stable behavior:

- spawn state;
- spawned asteroid ranges with controlled randomness;
- horizontal movement with stable Y and retained rotation;
- bounded speed and spawn-interval ramps;
- cleanup;
- one-time standard and fiery pass rewards; and
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
