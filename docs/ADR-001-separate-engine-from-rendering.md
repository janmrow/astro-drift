# ADR-001: Separate game engine from rendering

## Status

Accepted

## Context

Astro Drift started as a playable prototype in `src/main.ts`. That was enough to prove the core loop:

- player movement;
- incoming asteroids;
- collision;
- score;
- game over;
- restart.

Canvas is good for drawing the game, but it is not a good place to validate core rules.

## Decision

Core game rules and state transitions live under `src/game/`, grouped by
responsibility:

- `state.ts` creates/resets game state and orchestrates each running frame;
- `engine.ts` owns movement, boundaries, scoring, collision, and frame rules;
- `asteroids.ts` owns asteroid spawning, movement, behavior, and cleanup;
- `balance.ts` owns gameplay tuning constants;
- `format.ts` owns score and time formatting;
- `rng.ts` provides the retained deterministic RNG utility; and
- `types.ts` owns shared game-domain types.

This is a responsibility map, not an exhaustive list of symbols. Per-frame game
updates return next values without mutating caller-owned inputs.

The rendering layer stays responsible for drawing:

- background;
- stars;
- player;
- asteroids;
- HUD;
- game over overlay.

Canvas drawing is owned by `src/rendering/canvasRenderer.ts`, while Canvas visual
tokens and font-string construction live in `src/rendering/theme.ts`. DOM styling
lives in `src/style.css`.

Browser effects remain at explicit boundaries. `src/main.ts` owns the animation
loop, time, DOM wiring, and the runtime randomness passed into game rules;
game-rule updates receive that RNG explicitly rather than selecting a global
randomness source. Rendering owns separate visual randomness, currently used only
for the star field in `src/rendering/canvasRenderer.ts`. `src/input/keyboard.ts`
owns keyboard events, and `src/storage/bestScoreStorage.ts` owns browser persistence.

## Consequences

This makes the project easier to test. Unit tests can cover the important game rules without opening a browser and without checking Canvas pixels.

Examples of rules that should be testable:

- player does not leave the allowed area;
- score grows with time;
- asteroid spawn interval changes with survival time;
- collision detection works;
- restart creates a clean state.

The trade-off is a small amount of structure earlier than a tiny game strictly needs. That is intentional.

## Non-goals

This decision does not mean we are introducing heavy architecture or unnecessary abstractions.

Keep rendering separate from game rules so the important behavior can be tested directly.

## Addendum: where game state transitions live

The initial split above did not say explicitly which part of the `idle → running → gameOver`
state machine is "core logic" versus glue. In practice this caused `restartGame()` and related
state resets to grow in `main.ts` without unit coverage. To close that gap:

- **State creation/reset is core logic.** `createInitialGameState()` (`src/game/state.ts`)
  builds the player, asteroids, spawn state, score, survival time, and bonus-feedback fields.
  Both the initial module setup and `restartGame()` call it, so there is one place that defines
  "clean state" instead of two hand-written copies that can drift apart.
- **Per-frame updates are core logic.** `advanceRunningGame()`
  (`src/game/state.ts`) returns the next `GameState` together with collision
  information. Its movement, asteroid, scoring, and bonus-feedback helpers return
  next values without mutating caller-owned state or collections.
- **The frame-delta cap is core logic.** `capFrameDelta` (`src/game/engine.ts`) is a pure,
  unit-tested function instead of an inline `Math.min` in the render loop.
- **`gameStatus` transitions themselves stay thin glue in `main.ts`.** Browser E2E
  covers starting and stable running-state DOM, accessibility, and persistence
  behavior. Collision and state-transition rules stay covered at unit/property
  level; the full browser `gameOver → restart` flow is intentionally a manual
  smoke check after removal of the timing-dependent seeded E2E scenario.

This does not change the trade-off described above: rendering stays out of `src/game/`, and
`main.ts` stays thin glue that wires input, state, rendering, and storage together.
