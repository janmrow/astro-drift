import fc from "fast-check";
import { describe, expect, it } from "vitest";

import {
  ASTEROID_BASE_SPAWN_INTERVAL,
  ASTEROID_MIN_SPAWN_INTERVAL,
  ASTEROID_PASS_BONUS,
  ASTEROID_REMOVE_PADDING,
  FIERY_ASTEROID_PASS_BONUS,
  GAME_HEIGHT,
  PLAYER_AREA_MAX_X,
  PLAYER_SCREEN_PADDING,
  applyPassedAsteroidBonuses,
  getAsteroidSpawnInterval,
  getAsteroidPassBonus,
  hasAsteroidPassedPlayer,
  updatePlayer,
  updateScore,
} from "../../src/game/engine";
import { ASTEROID_VERTICAL_SPAWN_PADDING, updateAsteroids } from "../../src/game/asteroids";
import type { Asteroid, InputState, Player } from "../../src/game/types";

const PROPERTY_RUNS = 100;

const deltaTimeArbitrary = fc
  .integer({ min: 0, max: 10_000 })
  .map((milliseconds) => milliseconds / 1_000);

const inputArbitrary: fc.Arbitrary<InputState> = fc.record({
  up: fc.boolean(),
  down: fc.boolean(),
  left: fc.boolean(),
  right: fc.boolean(),
});

const playerArbitrary: fc.Arbitrary<Player> = fc
  .record({
    width: fc.integer({ min: 48, max: 96 }),
    height: fc.integer({ min: 36, max: 72 }),
  })
  .chain(({ width, height }) => {
    const minX = width / 2 + PLAYER_SCREEN_PADDING;
    const maxX = PLAYER_AREA_MAX_X;
    const minY = height / 2 + PLAYER_SCREEN_PADDING;
    const maxY = GAME_HEIGHT - height / 2 - PLAYER_SCREEN_PADDING;

    return fc.record({
      x: fc.integer({ min: Math.ceil(minX), max: Math.floor(maxX) }),
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
  passed: fc.boolean(),
});

describe("game engine properties", () => {
  it("keeps an in-bounds player inside the playable movement bounds", () => {
    fc.assert(
      fc.property(
        playerArbitrary,
        inputArbitrary,
        deltaTimeArbitrary,
        (player, input, deltaTime) => {
          const updatedPlayer = updatePlayer(player, input, deltaTime);

          expect(updatedPlayer.x).toBeGreaterThanOrEqual(player.width / 2 + PLAYER_SCREEN_PADDING);
          expect(updatedPlayer.x).toBeLessThanOrEqual(PLAYER_AREA_MAX_X);
          expect(updatedPlayer.y).toBeGreaterThanOrEqual(
            player.height / 2 + PLAYER_SCREEN_PADDING,
          );
          expect(updatedPlayer.y).toBeLessThanOrEqual(
            GAME_HEIGHT - player.height / 2 - PLAYER_SCREEN_PADDING,
          );
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

        updateAsteroids(asteroids, deltaTime);

        if (asteroids.length === 0) {
          expect(initialX - asteroid.speed * deltaTime).toBeLessThan(-ASTEROID_REMOVE_PADDING);
          return;
        }

        expect(asteroids[0].x).toBeLessThanOrEqual(initialX);
        expect(asteroids[0].y).toBeGreaterThanOrEqual(
          asteroid.radius + ASTEROID_VERTICAL_SPAWN_PADDING,
        );
        expect(asteroids[0].y).toBeLessThanOrEqual(
          GAME_HEIGHT - asteroid.radius - ASTEROID_VERTICAL_SPAWN_PADDING,
        );
        expect(asteroids[0].rotation).toBe(initialRotation + asteroid.rotationSpeed * deltaTime);

        if (expectedYBeforeBounds < asteroid.radius + ASTEROID_VERTICAL_SPAWN_PADDING) {
          expect(asteroids[0].verticalSpeed).toBeGreaterThanOrEqual(0);
        }

        if (expectedYBeforeBounds > GAME_HEIGHT - asteroid.radius - ASTEROID_VERTICAL_SPAWN_PADDING) {
          expect(asteroids[0].verticalSpeed).toBeLessThanOrEqual(0);
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
            .filter((asteroid) => !asteroid.passed && hasAsteroidPassedPlayer(player, asteroid))
            .reduce((totalBonus, asteroid) => totalBonus + getAsteroidPassBonus(asteroid), 0);
          const updatedScore = applyPassedAsteroidBonuses(currentScore, player, asteroids);

          expect(updatedScore).toBe(currentScore + expectedBonus);
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
            passed: true,
          }));

          expect(applyPassedAsteroidBonuses(currentScore, player, asteroids)).toBe(currentScore);
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
            passed: false,
          }));
          const expectedBonus = asteroids.reduce((totalBonus, asteroid) => {
            return (
              totalBonus +
              (asteroid.variant === "fiery" ? FIERY_ASTEROID_PASS_BONUS : ASTEROID_PASS_BONUS)
            );
          }, 0);

          expect(applyPassedAsteroidBonuses(currentScore, player, asteroids)).toBe(
            currentScore + expectedBonus,
          );
        },
      ),
      { numRuns: PROPERTY_RUNS },
    );
  });
});
