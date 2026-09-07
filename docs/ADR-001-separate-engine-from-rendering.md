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
owns keyboard events, `src/storage/bestScoreStorage.ts` owns browser
persistence, and `src/audio/` owns the deterministic music definition and
Tone.js/Web Audio lifecycle.

## Consequences

This makes the project easier to test. Unit tests can cover the important game rules without opening a browser and without checking Canvas pixels.

Examples of rules that should be testable:

- player does not leave the allowed area;
- passed asteroids award score exactly once;
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
  covers selected state transitions and shell contracts. Collision and state rules
  stay covered directly at unit/property level.

This does not change the trade-off described above: rendering stays out of `src/game/`, and
`main.ts` stays thin glue that wires input, state, rendering, audio, and storage together.

## Addendum: audio is an imperative presentation boundary

Procedural background music is another browser-facing presentation effect, not
a game rule. `src/audio/lateLibrary.ts` owns the deterministic Late Library
composition data. `src/audio/backgroundMusic.ts` owns Tone.js, lazy browser
audio startup, synthesis and scheduling, state-level gain, visibility, and
disposal.

`src/main.ts` translates only broad application transitions—start/restart,
game over, visibility, the session-local radio preference, and page
teardown—into controller operations. After a user gesture starts the audio
session, the outer state gain provides the running level, a ducked game-over
level, and silence while idle, muted, or hidden. These transitions do not
rebuild the track or schedule.

The Canvas renderer receives the radio preference as presentation-only input
for its speaker icon, while a non-interactive DOM status exposes the same state
to accessibility tools and browser tests. Scoring, collision, movement, and
difficulty do not know about music. In particular, `src/game/` does not depend
on Web Audio or the audio controller.

This boundary keeps the selected composition directly testable as data while
leaving Web Audio effects in the imperative shell. It does not introduce a
general soundtrack service, playlist, audio backend, or adaptive-music system.

## Addendum: lightweight Web Audio loop replaces Tone.js

The Tone.js graph (`src/audio/backgroundMusic.ts`) and the Late Library data
(`src/audio/lateLibrary.ts`) are replaced by a smaller Web Audio shell with
the same boundary: `src/audio/simpleComposition.ts` owns the deterministic
4-chord loop data, `src/audio/lightMusicController.ts` owns lazy
`AudioContext` startup, synthesis and scheduling, state-level gain,
visibility, and disposal.

`src/main.ts` keeps translating only broad application transitions into the
same controller operations, and `src/game/` still has no audio dependency.
The startup path is atomic (a failed graph build resets to pre-start so a
later gesture can retry) and the lookahead scheduler clamps catch-up after
long pauses instead of burst-scheduling missed bars.
