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

Core game rules are split across `src/game/engine.ts`, `src/game/asteroids.ts`, and `src/game/types.ts`.

The game logic includes:

- player movement;
- movement boundaries;
- score calculation;
- difficulty calculation;
- collision checks;
- restart-related state creation;
- formatting helpers used by the game state.

The rendering layer stays responsible for drawing:

- background;
- stars;
- player;
- asteroids;
- HUD;
- game over overlay.

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
- **Per-frame score/bonus math is core logic.** `applyScoreBonuses` and `updateBonusFeedbackTimer`
  (`src/game/state.ts`) are pure functions, unit-tested the same way as the rest of `src/game/`.
- **The frame-delta cap is core logic.** `capFrameDelta` (`src/game/engine.ts`) is a pure,
  unit-tested function instead of an inline `Math.min` in the render loop.
- **`gameStatus` transitions themselves stay thin glue in `main.ts`.** Deciding *when* to move
  from `idle` to `running` to `gameOver` is directly tied to keyboard input and the
  `requestAnimationFrame` loop — there is little logic to unit-test in isolation, and the
  transitions are already covered by E2E tests exercising the real input → status → DOM path.

This does not change the trade-off described above: rendering stays out of `src/game/`, and
`main.ts` stays thin glue that wires input, state, rendering, and storage together.
