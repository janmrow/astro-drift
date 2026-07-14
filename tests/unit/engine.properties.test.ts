import fc from "fast-check";
import { describe, expect, it } from "vitest";

import {
  ASTEROID_BASE_SPAWN_INTERVAL,
  ASTEROID_MIN_SPAWN_INTERVAL,
  ASTEROID_PASS_BONUS,
  FIERY_ASTEROID_PASS_BONUS,
} from "../../src/game/balance";
import {
  GAME_HEIGHT,
  PLAYER_SCREEN_PADDING,
  collectPassBonuses,
  getAsteroidPassBonus,
  getPlayerHitbox,
  hasAsteroidPassedPlayer,
  isPlayerCollidingWithAsteroid,
  updatePlayer,
  updateScore,
} from "../../src/game/engine";
import {
  ASTEROID_REMOVE_PADDING,
  ASTEROID_VERTICAL_SPAWN_PADDING,
  getAsteroidSpawnInterval,
  updateAsteroids,
} from "../../src/game/asteroids";
import { createAsteroid } from "./helpers";
import type { Asteroid, InputState, Player } from "../../src/game/types";

const PROPERTY_RUNS = 100;

// This wide range stress-tests the pure functions beyond real gameplay.
const deltaTimeArbitrary = fc
  .integer({ min: 0, max: 10_000 })
  .map((milliseconds) => milliseconds / 1_000);

const unitIntervalArbitrary = fc.float({ min: 0, max: 1, noNaN: true });

const inputArbitrary: fc.Arbitrary<InputState> = fc.record({
  up: fc.boolean(),
  down: fc.boolean(),
});

const playerArbitrary: fc.Arbitrary<Player> = fc
  .record({
    width: fc.integer({ min: 48, max: 96 }),
    height: fc.integer({ min: 36, max: 72 }),
  })
  .chain(({ width, height }) => {
    const minY = height / 2 + PLAYER_SCREEN_PADDING;
    const maxY = GAME_HEIGHT - height / 2 - PLAYER_SCREEN_PADDING;

    return fc.record({
      x: fc.integer({ min: -1_000, max: 2_000 }),
      y: fc.integer({ min: Math.ceil(minY), max: Math.floor(maxY) }),
      width: fc.constant(width),
      height: fc.constant(height),
    });
  });

const asteroidArbitrary: fc.Arbitrary<Asteroid> = fc.record({
  id: fc.string({ minLength: 1, maxLength: 24 }),
  variant: fc.constantFrom("standard", "fiery"),
  x: fc.integer({ min: -200, max: 1_200 }),
  y: fc.integer({ min: -100, max: GAME_HEIGHT + 100 }),
  radius: fc.integer({ min: 0, max: 80 }),
  speed: fc.integer({ min: 0, max: 500 }),
  verticalSpeed: fc.integer({ min: -100, max: 100 }),
  rotation: fc.integer({ min: -360, max: 360 }),
  rotationSpeed: fc.integer({ min: -10, max: 10 }),
  points: fc.constant([]),
  hasAwardedPassBonus: fc.boolean(),
});

describe("game engine properties", () => {
  it("keeps player X unchanged and player Y inside the vertical movement bounds", () => {
    fc.assert(
      fc.property(
        playerArbitrary,
        inputArbitrary,
        deltaTimeArbitrary,
        (player, input, deltaTime) => {
          const originalPlayer = { ...player };
          const updatedPlayer = updatePlayer(player, input, deltaTime);

          expect(updatedPlayer.x).toBe(player.x);
          expect(updatedPlayer.y).toBeGreaterThanOrEqual(
            player.height / 2 + PLAYER_SCREEN_PADDING,
          );
          expect(updatedPlayer.y).toBeLessThanOrEqual(
            GAME_HEIGHT - player.height / 2 - PLAYER_SCREEN_PADDING,
          );
          expect(player).toEqual(originalPlayer);
        },
      ),
      { numRuns: PROPERTY_RUNS },
    );
  });

  it("never decreases score when elapsed time is non-negative", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 1_000_000 }),
        deltaTimeArbitrary,
        (currentScore, deltaTime) => {
          expect(updateScore(currentScore, deltaTime)).toBeGreaterThanOrEqual(currentScore);
        },
      ),
      { numRuns: PROPERTY_RUNS },
    );
  });

  it("keeps asteroid spawn intervals within bounds and non-increasing over time", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 10_000 }),
        fc.integer({ min: 0, max: 10_000 }),
        (survivalTime, elapsedTime) => {
          const currentInterval = getAsteroidSpawnInterval(survivalTime);
          const laterInterval = getAsteroidSpawnInterval(survivalTime + elapsedTime);

          expect(currentInterval).toBeGreaterThanOrEqual(ASTEROID_MIN_SPAWN_INTERVAL);
          expect(currentInterval).toBeLessThanOrEqual(ASTEROID_BASE_SPAWN_INTERVAL);
          expect(laterInterval).toBeLessThanOrEqual(currentInterval);
        },
      ),
      { numRuns: PROPERTY_RUNS },
    );
  });

  it("moves asteroids left or keeps them still when elapsed time is non-negative", () => {
    fc.assert(
      fc.property(asteroidArbitrary, deltaTimeArbitrary, (asteroid, deltaTime) => {
        const asteroids = [asteroid];
        const initialX = asteroid.x;
        const expectedYBeforeBounds = asteroid.y + asteroid.verticalSpeed * deltaTime;
        const initialRotation = asteroid.rotation;

        const updatedAsteroids = updateAsteroids(asteroids, deltaTime);

        if (updatedAsteroids.length === 0) {
          expect(initialX - asteroid.speed * deltaTime).toBeLessThan(-ASTEROID_REMOVE_PADDING);
          return;
        }

        expect(updatedAsteroids[0].x).toBeLessThanOrEqual(initialX);
        expect(updatedAsteroids[0].y).toBeGreaterThanOrEqual(
          asteroid.radius + ASTEROID_VERTICAL_SPAWN_PADDING,
        );
        expect(updatedAsteroids[0].y).toBeLessThanOrEqual(
          GAME_HEIGHT - asteroid.radius - ASTEROID_VERTICAL_SPAWN_PADDING,
        );
        expect(updatedAsteroids[0].rotation).toBe(
          initialRotation + asteroid.rotationSpeed * deltaTime,
        );
        expect(asteroid.x).toBe(initialX);
        expect(asteroid.rotation).toBe(initialRotation);

        if (expectedYBeforeBounds < asteroid.radius + ASTEROID_VERTICAL_SPAWN_PADDING) {
          expect(updatedAsteroids[0].verticalSpeed).toBeGreaterThanOrEqual(0);
        }

        if (expectedYBeforeBounds > GAME_HEIGHT - asteroid.radius - ASTEROID_VERTICAL_SPAWN_PADDING) {
          expect(updatedAsteroids[0].verticalSpeed).toBeLessThanOrEqual(0);
        }
      }),
      { numRuns: PROPERTY_RUNS },
    );
  });

  it("never decreases score when applying passed asteroid bonuses", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 1_000_000 }),
        playerArbitrary,
        fc.array(asteroidArbitrary, { minLength: 0, maxLength: 20 }),
        (currentScore, player, asteroids) => {
          const expectedBonus = asteroids
            .filter((asteroid) => !asteroid.hasAwardedPassBonus && hasAsteroidPassedPlayer(player, asteroid))
            .reduce((totalBonus, asteroid) => totalBonus + getAsteroidPassBonus(asteroid), 0);
          const originalAsteroids = asteroids.map((asteroid) => ({ ...asteroid }));
          const result = collectPassBonuses(currentScore, player, asteroids);

          expect(result.score).toBe(currentScore + expectedBonus);
          expect(asteroids).toEqual(originalAsteroids);
        },
      ),
      { numRuns: PROPERTY_RUNS },
    );
  });

  it("does not award pass bonuses to asteroids that were already marked as passed", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 1_000_000 }),
        playerArbitrary,
        fc.array(asteroidArbitrary, { minLength: 0, maxLength: 20 }),
        (currentScore, player, generatedAsteroids) => {
          const asteroids = generatedAsteroids.map((asteroid) => ({
            ...asteroid,
            x: player.x - player.width / 2 - asteroid.radius - 1,
            hasAwardedPassBonus: true,
          }));

          expect(collectPassBonuses(currentScore, player, asteroids).score).toBe(currentScore);
        },
      ),
      { numRuns: PROPERTY_RUNS },
    );
  });

  it("adds only known pass bonus values when new asteroids pass the player", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 1_000_000 }),
        playerArbitrary,
        fc.array(asteroidArbitrary, { minLength: 0, maxLength: 20 }),
        (currentScore, player, generatedAsteroids) => {
          const asteroids = generatedAsteroids.map((asteroid) => ({
            ...asteroid,
            x: player.x - player.width / 2 - asteroid.radius - 1,
            hasAwardedPassBonus: false,
          }));
          const expectedBonus = asteroids.reduce((totalBonus, asteroid) => {
            return (
              totalBonus +
              (asteroid.variant === "fiery" ? FIERY_ASTEROID_PASS_BONUS : ASTEROID_PASS_BONUS)
            );
          }, 0);

          expect(collectPassBonuses(currentScore, player, asteroids).score).toBe(
            currentScore + expectedBonus,
          );
        },
      ),
      { numRuns: PROPERTY_RUNS },
    );
  });

  it("always collides when the asteroid center is inside the player hitbox", () => {
    fc.assert(
      fc.property(
        playerArbitrary,
        fc.integer({ min: 0, max: 80 }),
        unitIntervalArbitrary,
        unitIntervalArbitrary,
        (player, radius, xFraction, yFraction) => {
          const hitbox = getPlayerHitbox(player);
          const asteroid = createAsteroid({
            x: hitbox.left + (hitbox.right - hitbox.left) * xFraction,
            y: hitbox.top + (hitbox.bottom - hitbox.top) * yFraction,
            radius,
          });

          expect(isPlayerCollidingWithAsteroid(player, asteroid)).toBe(true);
        },
      ),
      { numRuns: PROPERTY_RUNS },
    );
  });

  it("never collides when the asteroid is farther than its hit radius from the hitbox", () => {
    fc.assert(
      fc.property(
        playerArbitrary,
        fc.integer({ min: 0, max: 80 }),
        fc.integer({ min: 1, max: 500 }),
        (player, radius, extraDistance) => {
          const hitbox = getPlayerHitbox(player);
          // Collision uses radius * 0.82 as the effective hit radius (see
          // ASTEROID_COLLISION_RADIUS_RATIO in engine.ts); anything farther than
          // that from the hitbox edge can never collide.
          const asteroidHitRadius = radius * 0.82;
          const asteroid = createAsteroid({
            x: hitbox.right + asteroidHitRadius + extraDistance,
            y: player.y,
            radius,
          });

          expect(isPlayerCollidingWithAsteroid(player, asteroid)).toBe(false);
        },
      ),
      { numRuns: PROPERTY_RUNS },
    );
  });
});
