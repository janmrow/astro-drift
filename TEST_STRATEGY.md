# Test Strategy

## Project context

Astro Drift QA Lab is a small browser arcade game built as a QA/SDET portfolio project.

The goal is not to create a large game.  
The goal is to build a small playable loop and surround it with practical quality engineering.

Current product loop:

```text
idle → running → gameOver → restart
```

The game is rendered on Canvas, but the core rules are kept outside the rendering layer.

## Main product risks

The most important risks are:

- player movement feels unfair or inconsistent;
- collision detection feels too strict or too loose;
- difficulty ramps too quickly or too slowly;
- restart does not reset the game cleanly;
- future E2E tests become flaky because they depend on Canvas pixels;
- project grows too much and loses its simple portfolio focus.

## Test levels

### Unit tests

Unit tests cover pure game logic.

Current focus:

- player initial state;
- player movement;
- movement boundaries;
- scoring;
- difficulty calculation;
- collision detection;
- asteroid movement;
- asteroid cleanup;
- asteroid spawn state.

These tests should stay fast and independent from the browser.

### E2E tests

E2E tests cover the main browser contract:

- page loads;
- canvas exists;
- game starts with Enter or Space;
- game status changes from `idle` to `running`;
- score, time, and asteroid count update while playing.

E2E tests should use DOM status hooks where possible instead of reading Canvas pixels.

Future E2E coverage may include game over and restart only if those flows can be made deterministic without relying on random asteroid timing.

### API tests

API tests are planned for a later leaderboard milestone.

They are intentionally not part of the current frontend quality milestone.

Later scope:

- `POST /scores`;
- `GET /scores`;
- validation errors;
- leaderboard sorting;
- SQL persistence checks.

## What is automated now

Current automated checks:

```text
npm run lint
npm test
npm run test:e2e
npm run build
```

Current unit test areas:

- `src/game/engine.ts`;
- `src/game/asteroids.ts`.

## Planned quality gates

The frontend quality gate is:

```text
npm run lint
npm test
npm run test:e2e
npm run build
```

CI should run these checks on pull requests and main branch updates.

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

For future API tests, test data should use clear names and scores, for example:

```json
{
  "nickname": "Pilot",
  "score": 120
}
```

## Flaky test prevention

To reduce flaky tests:

- keep game logic testable without real time where possible;
- avoid assertions based on exact animation frames;
- avoid Canvas pixel assertions;
- use DOM status hooks for E2E;
- keep E2E scenarios short;
- test one main flow before adding more cases.

## Known trade-offs

The project uses a small amount of architecture earlier than a tiny game strictly needs.

That is intentional.

The goal is to demonstrate practical quality engineering:

- separated game rules;
- testable logic;
- clear rendering boundary;
- readable tests;
- simple documentation;
- quality gates.

Backend, SQL, Docker and API tests are still part of the broader roadmap, but they are deferred until the frontend game and quality baseline feel solid.
