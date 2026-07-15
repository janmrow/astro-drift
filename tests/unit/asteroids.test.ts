import { describe, expect, it } from "vitest";

import {
  ASTEROID_BASE_MAX_SPEED,
  ASTEROID_BASE_MIN_SPEED,
  ASTEROID_BASE_SPAWN_INTERVAL,
  ASTEROID_MAX_RADIUS,
  ASTEROID_MAX_ROTATION_SPEED,
  ASTEROID_MIN_RADIUS,
  ASTEROID_MIN_ROTATION_SPEED,
  ASTEROID_SPEED_HARD_CAP,
  ASTEROID_SPEED_RAMP,
  FIERY_ASTEROID_CHANCE,
  FIERY_ASTEROID_MAX_RADIUS_MULTIPLIER,
  FIERY_ASTEROID_MIN_RADIUS_MULTIPLIER,
  FIERY_ASTEROID_ROTATION_MULTIPLIER,
  FIERY_ASTEROID_SPEED_MULTIPLIER,
} from "../../src/game/balance";
import {
  ASTEROID_REMOVE_PADDING,
  createInitialAsteroidSpawnState,
  updateAsteroidSpawning,
  updateAsteroids,
} from "../../src/game/asteroids";
import { GAME_HEIGHT, GAME_WIDTH } from "../../src/game/engine";
import type { Asteroid } from "../../src/game/types";
import { createAsteroid } from "./helpers";

function constantRng(value: number): () => number {
  return () => value;
}

function slightlyBelow(value: number): number {
  return value - Number.EPSILON;
}

function spawnAsteroid(rngValue: number, survivalTime = 0): Asteroid {
  const result = updateAsteroidSpawning(
    [],
    createInitialAsteroidSpawnState(),
    ASTEROID_BASE_SPAWN_INTERVAL,
    survivalTime,
    constantRng(rngValue),
  );

  return result.asteroids[0];
}

describe("asteroid logic", () => {
  it("creates the initial asteroid spawn state", () => {
    const spawnState = createInitialAsteroidSpawnState();

    expect(spawnState).toEqual({
      timer: 0,
      nextId: 1,
    });
  });

  it("spawns an asteroid after the spawn interval passes", () => {
    const asteroids: Asteroid[] = [];
    const spawnState = createInitialAsteroidSpawnState();

    const result = updateAsteroidSpawning(
      asteroids,
      spawnState,
      ASTEROID_BASE_SPAWN_INTERVAL + 0.1,
      0,
    );

    expect(asteroids).toHaveLength(0);
    expect(result.asteroids).toHaveLength(1);
    expect(result.asteroids[0].id).toBe("asteroid-1");
    expect(result.asteroids[0].hasAwardedPassBonus).toBe(false);
    expect(result.spawnState.nextId).toBe(2);
    expect(result.spawnState.timer).toBeCloseTo(0.1);
  });

  it("spawns multiple asteroids when more than one interval passes", () => {
    const asteroids: Asteroid[] = [];
    const spawnState = createInitialAsteroidSpawnState();

    const result = updateAsteroidSpawning(
      asteroids,
      spawnState,
      ASTEROID_BASE_SPAWN_INTERVAL * 2 + 0.2,
      0,
    );

    expect(asteroids).toHaveLength(0);
    expect(result.asteroids.map((asteroid) => asteroid.id)).toEqual([
      "asteroid-1",
      "asteroid-2",
    ]);
    expect(result.spawnState.nextId).toBe(3);
    expect(result.spawnState.timer).toBeCloseTo(0.2);
  });

  it("does not spawn or advance the timer when elapsed time is zero", () => {
    const asteroids: Asteroid[] = [];
    const spawnState = {
      timer: 0.5,
      nextId: 3,
    };

    const result = updateAsteroidSpawning(asteroids, spawnState, 0, 0);

    expect(asteroids).toHaveLength(0);
    expect(result.asteroids).toEqual(asteroids);
    expect(result.spawnState).toEqual(spawnState);
  });

  it("spawns the full interval multiple after a large elapsed time jump", () => {
    const asteroids: Asteroid[] = [];

    const result = updateAsteroidSpawning(
      asteroids,
      createInitialAsteroidSpawnState(),
      5,
      0,
    );

    expect(asteroids).toHaveLength(0);
    expect(result.asteroids.map((asteroid) => asteroid.id)).toEqual([
      "asteroid-1",
      "asteroid-2",
      "asteroid-3",
      "asteroid-4",
    ]);
    expect(result.spawnState.nextId).toBe(5);
    expect(result.spawnState.timer).toBeCloseTo(0.2);
  });

  it("continues spawning from an existing timer and id", () => {
    const asteroids: Asteroid[] = [];
    const spawnState = {
      timer: ASTEROID_BASE_SPAWN_INTERVAL - 0.1,
      nextId: 7,
    };

    const result = updateAsteroidSpawning(asteroids, spawnState, 0.2, 0);

    expect(asteroids).toHaveLength(0);
    expect(result.asteroids).toHaveLength(1);
    expect(result.asteroids[0].id).toBe("asteroid-7");
    expect(result.spawnState.nextId).toBe(8);
    expect(result.spawnState.timer).toBeCloseTo(0.1);
  });

  it("does not spawn an asteroid before the spawn interval passes", () => {
    const asteroids: Asteroid[] = [];
    const spawnState = createInitialAsteroidSpawnState();

    const result = updateAsteroidSpawning(
      asteroids,
      spawnState,
      ASTEROID_BASE_SPAWN_INTERVAL - 0.1,
      0,
    );

    expect(asteroids).toHaveLength(0);
    expect(result.asteroids).toHaveLength(0);
    expect(result.spawnState.nextId).toBe(1);
    expect(result.spawnState.timer).toBeCloseTo(ASTEROID_BASE_SPAWN_INTERVAL - 0.1);
  });

  it("creates spawned asteroids inside the expected gameplay ranges", () => {
    const survivalTime = 20;
    const radius = (ASTEROID_MIN_RADIUS + ASTEROID_MAX_RADIUS) / 2;
    const speedBonus = survivalTime * ASTEROID_SPEED_RAMP;
    const asteroid = spawnAsteroid(0.5, survivalTime);

    expect(asteroid).toMatchObject({
      id: "asteroid-1",
      variant: "standard",
      radius,
      x: GAME_WIDTH + radius,
      y: GAME_HEIGHT / 2,
      speed: (ASTEROID_BASE_MIN_SPEED + ASTEROID_BASE_MAX_SPEED) / 2 + speedBonus,
      rotation: Math.PI,
      rotationSpeed: (ASTEROID_MIN_ROTATION_SPEED + ASTEROID_MAX_ROTATION_SPEED) / 2,
      hasAwardedPassBonus: false,
    });
    expect(asteroid.points).toHaveLength(9);

    for (const [index, point] of asteroid.points.entries()) {
      expect(point.angle).toBeCloseTo((index * Math.PI * 2) / asteroid.points.length);
      expect(point.distanceMultiplier).toBe(1);
    }
  });

  it("increases spawned asteroid speed as survival time grows", () => {
    const earlyAsteroid = spawnAsteroid(0.5);
    const laterAsteroid = spawnAsteroid(0.5, 60);

    expect(laterAsteroid.speed).toBeGreaterThan(earlyAsteroid.speed);
  });

  it("does not exceed the maximum asteroid speed after long survival times", () => {
    const asteroid = spawnAsteroid(1, 10_000);

    expect(asteroid.speed).toBe(ASTEROID_SPEED_HARD_CAP);
  });

  it("uses the fiery asteroid chance as an exclusive variant boundary", () => {
    expect(spawnAsteroid(slightlyBelow(FIERY_ASTEROID_CHANCE)).variant).toBe("fiery");
    expect(spawnAsteroid(FIERY_ASTEROID_CHANCE).variant).toBe("standard");
  });

  it("applies the configured fiery asteroid modifiers", () => {
    const rngValue = FIERY_ASTEROID_CHANCE / 2;
    const asteroid = spawnAsteroid(rngValue);
    const baseRadius = ASTEROID_MIN_RADIUS + rngValue * (ASTEROID_MAX_RADIUS - ASTEROID_MIN_RADIUS);
    const radiusProgress = (baseRadius - ASTEROID_MIN_RADIUS) / (ASTEROID_MAX_RADIUS - ASTEROID_MIN_RADIUS);
    const radiusMultiplier =
      FIERY_ASTEROID_MAX_RADIUS_MULTIPLIER -
      radiusProgress *
        (FIERY_ASTEROID_MAX_RADIUS_MULTIPLIER - FIERY_ASTEROID_MIN_RADIUS_MULTIPLIER);
    const baseSpeed =
      ASTEROID_BASE_MIN_SPEED + rngValue * (ASTEROID_BASE_MAX_SPEED - ASTEROID_BASE_MIN_SPEED);
    const baseRotationSpeed =
      ASTEROID_MIN_ROTATION_SPEED +
      rngValue * (ASTEROID_MAX_ROTATION_SPEED - ASTEROID_MIN_ROTATION_SPEED);

    expect(asteroid.radius).toBeCloseTo(baseRadius * radiusMultiplier);
    expect(asteroid.speed).toBeCloseTo(baseSpeed * FIERY_ASTEROID_SPEED_MULTIPLIER);
    expect(asteroid.rotationSpeed).toBeCloseTo(
      -baseRotationSpeed * FIERY_ASTEROID_ROTATION_MULTIPLIER,
    );
  });

  it("creates asteroid rotation speeds with noticeable but bounded spin", () => {
    const leftSpinAsteroid = spawnAsteroid(FIERY_ASTEROID_CHANCE);
    const rightSpinAsteroid = spawnAsteroid(1);

    expect(leftSpinAsteroid.rotationSpeed).toBeLessThan(0);
    expect(Math.abs(leftSpinAsteroid.rotationSpeed)).toBeGreaterThanOrEqual(
      ASTEROID_MIN_ROTATION_SPEED,
    );
    expect(Math.abs(leftSpinAsteroid.rotationSpeed)).toBeLessThanOrEqual(
      ASTEROID_MAX_ROTATION_SPEED,
    );
    expect(rightSpinAsteroid.rotationSpeed).toBe(ASTEROID_MAX_ROTATION_SPEED);
  });

  it("moves asteroids to the left according to their speed", () => {
    const asteroids = [
      createAsteroid({
        x: 500,
        speed: 120,
      }),
    ];

    const updatedAsteroids = updateAsteroids(asteroids, 0.5);

    expect(updatedAsteroids[0].x).toBe(440);
    expect(asteroids[0].x).toBe(500);
  });

  it("keeps each asteroid at its spawn height", () => {
    const asteroids = [
      createAsteroid({
        y: 250,
      }),
    ];

    const updatedAsteroids = updateAsteroids(asteroids, 0.5);

    expect(updatedAsteroids[0].y).toBe(250);
    expect(asteroids[0].y).toBe(250);
  });

  it("updates asteroid rotation", () => {
    const asteroids = [
      createAsteroid({
        rotation: 1,
        rotationSpeed: 0.5,
      }),
    ];

    const updatedAsteroids = updateAsteroids(asteroids, 2);

    expect(updatedAsteroids[0].rotation).toBe(2);
    expect(asteroids[0].rotation).toBe(1);
  });

  it("removes asteroids after they leave the screen", () => {
    const asteroids = [
      createAsteroid({
        x: -ASTEROID_REMOVE_PADDING - 1,
      }),
      createAsteroid({
        id: "asteroid-visible",
        x: 120,
      }),
    ];

    const updatedAsteroids = updateAsteroids(asteroids, 0);

    expect(updatedAsteroids).toHaveLength(1);
    expect(updatedAsteroids[0].id).toBe("asteroid-visible");
    expect(asteroids).toHaveLength(2);
  });
});
