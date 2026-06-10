# ADR-001: Separate game engine from rendering

## Status

Accepted

## Context

Astro Drift started as a small playable prototype in `src/main.ts`.

That was useful for quickly proving the core loop:

- player movement;
- incoming asteroids;
- collision;
- score;
- game over;
- restart.

Now the project is moving from prototype code toward a QA/SDET portfolio project.  
The main goal is not only to have a working game, but to show that the game logic can be tested without relying on Canvas rendering.

Canvas is good for drawing the game, but it is not a good place to validate core rules.

## Decision

Core game rules are moved into `src/game/engine.ts` and typed through `src/game/types.ts`.

The engine should contain logic such as:

- player movement;
- movement boundaries;
- score calculation;
- difficulty calculation;
- collision checks;
- restart-related state creation;
- formatting helpers used by the game state.

The rendering layer should stay responsible for drawing:

- background;
- stars;
- player;
- asteroids;
- HUD;
- game over overlay.

## Consequences

This makes the project easier to test.

Unit tests can cover the important game rules without opening a browser and without checking Canvas pixels.

Examples of rules that should be testable:

- player does not leave the allowed area;
- score grows with time;
- asteroid spawn interval changes with survival time;
- collision detection works;
- restart creates a clean state.

The trade-off is that we introduce a small amount of structure earlier than a tiny game strictly needs.

That trade-off is intentional because this project is also meant to demonstrate quality engineering, not only gameplay.

## Non-goals

This decision does not mean we are introducing heavy architecture.

We are not adding:

- Clean Architecture;
- CQRS;
- event sourcing;
- complex domain layers;
- unnecessary abstractions.

The goal is simple:

> Keep rendering separate from game rules so the important behavior can be tested directly.