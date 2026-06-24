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
