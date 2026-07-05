import { describe, expect, it } from "vitest";

import {
  ASTEROID_BASE_MAX_SPEED,
  ASTEROID_BASE_MIN_SPEED,
  ASTEROID_BASE_SPAWN_INTERVAL,
  ASTEROID_MAX_RADIUS,
  ASTEROID_MAX_ROTATION_SPEED,
  ASTEROID_MAX_SPEED,
  ASTEROID_MIN_RADIUS,
  ASTEROID_MIN_ROTATION_SPEED,
  ASTEROID_REMOVE_PADDING,
  ASTEROID_SPEED_RAMP,
  FIERY_ASTEROID_CHANCE,
  FIERY_ASTEROID_MAX_RADIUS_MULTIPLIER,
  FIERY_ASTEROID_MAX_VERTICAL_SPEED,
  FIERY_ASTEROID_MIN_RADIUS_MULTIPLIER,
  FIERY_ASTEROID_MIN_VERTICAL_SPEED,
  FIERY_ASTEROID_ROTATION_MULTIPLIER,
  FIERY_ASTEROID_SPEED_MULTIPLIER,
  STANDARD_ASTEROID_DIAGONAL_CHANCE,
  STANDARD_ASTEROID_MAX_VERTICAL_SPEED,
  STANDARD_ASTEROID_MIN_VERTICAL_SPEED,
  createInitialAsteroidSpawnState,
  updateAsteroidSpawning,
  updateAsteroids,
} from "../../src/game/asteroids";
import { GAME_HEIGHT, GAME_WIDTH } from "../../src/game/engine";
import type { Asteroid } from "../../src/game/types";
import { createAsteroid } from "./helpers";

type AsteroidRandomRolls = {
  variant: number;
  radius?: number;
  speed?: number;
  rotationDirection?: number;
  rotationSpeed?: number;
  y?: number;
  diagonal?: number;
  verticalDirection?: number;
  verticalSpeed?: number;
  rotation?: number;
  pointDistanceMultiplier?: number;
};

function asteroidRandomValues({
  variant,
  radius = 0.5,
  speed = 0.5,
  rotationDirection = 0.75,
  rotationSpeed = 0.75,
  y = 0.5,
  diagonal = 1,
  verticalDirection = 0.75,
  verticalSpeed = 0.5,
  rotation = 0.5,
  pointDistanceMultiplier = 0.5,
}: AsteroidRandomRolls): number[] {
  const values = [
    variant,
    radius,
    speed,
    rotationDirection,
    rotationSpeed,
    y,
  ];

  if (variant < FIERY_ASTEROID_CHANCE) {
    values.push(verticalDirection, verticalSpeed);
  } else {
    values.push(diagonal);

    if (diagonal < STANDARD_ASTEROID_DIAGONAL_CHANCE) {
      values.push(verticalDirection, verticalSpeed);
    }
  }

  return [...values, rotation, ...Array<number>(9).fill(pointDistanceMultiplier)];
}

function createAsteroidRng(rolls: AsteroidRandomRolls): () => number {
  const values = asteroidRandomValues(rolls);

  return () => values.shift() ?? 0.5;
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

    const updatedSpawnState = updateAsteroidSpawning(
      asteroids,
      spawnState,
      ASTEROID_BASE_SPAWN_INTERVAL + 0.1,
      0,
    );

    expect(asteroids).toHaveLength(1);
    expect(asteroids[0].id).toBe("asteroid-1");
    expect(asteroids[0].passed).toBe(false);
    expect(updatedSpawnState.nextId).toBe(2);
    expect(updatedSpawnState.timer).toBeCloseTo(0.1);
  });

  it("spawns multiple asteroids when more than one interval passes", () => {
    const asteroids: Asteroid[] = [];
    const spawnState = createInitialAsteroidSpawnState();

    const updatedSpawnState = updateAsteroidSpawning(
      asteroids,
      spawnState,
      ASTEROID_BASE_SPAWN_INTERVAL * 2 + 0.2,
      0,
    );

    expect(asteroids).toHaveLength(2);
    expect(asteroids.map((asteroid) => asteroid.id)).toEqual(["asteroid-1", "asteroid-2"]);
    expect(updatedSpawnState.nextId).toBe(3);
    expect(updatedSpawnState.timer).toBeCloseTo(0.2);
  });

  it("does not spawn or advance the timer when elapsed time is zero", () => {
    const asteroids: Asteroid[] = [];
    const spawnState = {
      timer: 0.5,
      nextId: 3,
    };

    const updatedSpawnState = updateAsteroidSpawning(asteroids, spawnState, 0, 0);

    expect(asteroids).toHaveLength(0);
    expect(updatedSpawnState).toEqual(spawnState);
  });

  it("spawns the full interval multiple after a large elapsed time jump", () => {
    const asteroids: Asteroid[] = [];

    const updatedSpawnState = updateAsteroidSpawning(
      asteroids,
      createInitialAsteroidSpawnState(),
      5,
      0,
    );

    expect(asteroids).toHaveLength(4);
    expect(asteroids.map((asteroid) => asteroid.id)).toEqual([
      "asteroid-1",
      "asteroid-2",
      "asteroid-3",
      "asteroid-4",
    ]);
    expect(updatedSpawnState.nextId).toBe(5);
    expect(updatedSpawnState.timer).toBeCloseTo(0.2);
  });

  it("continues spawning from an existing timer and id", () => {
    const asteroids: Asteroid[] = [];
    const spawnState = {
      timer: ASTEROID_BASE_SPAWN_INTERVAL - 0.1,
      nextId: 7,
    };

    const updatedSpawnState = updateAsteroidSpawning(asteroids, spawnState, 0.2, 0);

    expect(asteroids).toHaveLength(1);
    expect(asteroids[0].id).toBe("asteroid-7");
    expect(updatedSpawnState.nextId).toBe(8);
    expect(updatedSpawnState.timer).toBeCloseTo(0.1);
  });

  it("does not spawn an asteroid before the spawn interval passes", () => {
    const asteroids: Asteroid[] = [];
    const spawnState = createInitialAsteroidSpawnState();

    const updatedSpawnState = updateAsteroidSpawning(
      asteroids,
      spawnState,
      ASTEROID_BASE_SPAWN_INTERVAL - 0.1,
      0,
    );

    expect(asteroids).toHaveLength(0);
    expect(updatedSpawnState.nextId).toBe(1);
    expect(updatedSpawnState.timer).toBeCloseTo(ASTEROID_BASE_SPAWN_INTERVAL - 0.1);
  });

  it("creates spawned asteroids inside the expected gameplay ranges", () => {
    const asteroids: Asteroid[] = [];
    const survivalTime = 20;
    const radius = (ASTEROID_MIN_RADIUS + ASTEROID_MAX_RADIUS) / 2;
    const speedBonus = survivalTime * ASTEROID_SPEED_RAMP;

    updateAsteroidSpawning(
      asteroids,
      createInitialAsteroidSpawnState(),
      ASTEROID_BASE_SPAWN_INTERVAL,
      survivalTime,
      () => 0.5,
    );

    expect(asteroids).toHaveLength(1);
    expect(asteroids[0]).toMatchObject({
      id: "asteroid-1",
      variant: "standard",
      radius,
      x: GAME_WIDTH + radius,
      y: GAME_HEIGHT / 2,
      speed: (ASTEROID_BASE_MIN_SPEED + ASTEROID_BASE_MAX_SPEED) / 2 + speedBonus,
      verticalSpeed: 0,
      rotation: Math.PI,
      rotationSpeed: (ASTEROID_MIN_ROTATION_SPEED + ASTEROID_MAX_ROTATION_SPEED) / 2,
      passed: false,
    });
    expect(asteroids[0].points).toHaveLength(9);
    expect(asteroids[0].points[0]).toEqual({
      angle: 0,
      distanceMultiplier: 1,
    });
  });

  it("increases spawned asteroid speed as survival time grows", () => {
    const earlyAsteroids: Asteroid[] = [];
    const laterAsteroids: Asteroid[] = [];

    updateAsteroidSpawning(
      earlyAsteroids,
      createInitialAsteroidSpawnState(),
      ASTEROID_BASE_SPAWN_INTERVAL,
      0,
      () => 0.5,
    );
    updateAsteroidSpawning(
      laterAsteroids,
      createInitialAsteroidSpawnState(),
      ASTEROID_BASE_SPAWN_INTERVAL,
      60,
      () => 0.5,
    );

    expect(laterAsteroids[0].speed).toBeGreaterThan(earlyAsteroids[0].speed);
  });

  it("does not exceed the maximum asteroid speed after long survival times", () => {
    const asteroids: Asteroid[] = [];

    updateAsteroidSpawning(
      asteroids,
      createInitialAsteroidSpawnState(),
      ASTEROID_BASE_SPAWN_INTERVAL,
      10_000,
      () => 1,
    );

    expect(asteroids[0].speed).toBe(ASTEROID_MAX_SPEED);
  });

  it("creates fiery asteroids with faster speed and rotation when the variant roll hits", () => {
    const expectedRadiusMultiplier =
      (FIERY_ASTEROID_MIN_RADIUS_MULTIPLIER + FIERY_ASTEROID_MAX_RADIUS_MULTIPLIER) / 2;

    const standardAsteroids: Asteroid[] = [];
    const fieryAsteroids: Asteroid[] = [];

    updateAsteroidSpawning(
      standardAsteroids,
      createInitialAsteroidSpawnState(),
      ASTEROID_BASE_SPAWN_INTERVAL,
      0,
      createAsteroidRng({ variant: FIERY_ASTEROID_CHANCE + 0.01 }),
    );
    updateAsteroidSpawning(
      fieryAsteroids,
      createInitialAsteroidSpawnState(),
      ASTEROID_BASE_SPAWN_INTERVAL,
      0,
      createAsteroidRng({ variant: FIERY_ASTEROID_CHANCE - 0.01 }),
    );

    expect(standardAsteroids[0].variant).toBe("standard");
    expect(fieryAsteroids[0].variant).toBe("fiery");
    expect(fieryAsteroids[0].radius).toBeCloseTo(
      standardAsteroids[0].radius * expectedRadiusMultiplier,
    );
    expect(fieryAsteroids[0].speed).toBeCloseTo(
      standardAsteroids[0].speed * FIERY_ASTEROID_SPEED_MULTIPLIER,
    );
    expect(fieryAsteroids[0].rotationSpeed).toBeCloseTo(
      standardAsteroids[0].rotationSpeed * FIERY_ASTEROID_ROTATION_MULTIPLIER,
    );
    expect(fieryAsteroids[0].verticalSpeed).toBeCloseTo(
      (FIERY_ASTEROID_MIN_VERTICAL_SPEED + FIERY_ASTEROID_MAX_VERTICAL_SPEED) / 2,
    );
  });

  it("keeps fiery asteroid vertical drift small compared to standard diagonal drift", () => {
    const fieryAsteroids: Asteroid[] = [];

    updateAsteroidSpawning(
      fieryAsteroids,
      createInitialAsteroidSpawnState(),
      ASTEROID_BASE_SPAWN_INTERVAL,
      0,
      createAsteroidRng({ variant: FIERY_ASTEROID_CHANCE - 0.01, verticalSpeed: 1 }),
    );

    expect(Math.abs(fieryAsteroids[0].verticalSpeed)).toBe(FIERY_ASTEROID_MAX_VERTICAL_SPEED);
    expect(FIERY_ASTEROID_MAX_VERTICAL_SPEED).toBeLessThan(STANDARD_ASTEROID_MIN_VERTICAL_SPEED);
  });

  it("creates diagonal standard asteroids when the diagonal movement roll hits", () => {
    const expectedVerticalSpeed =
      (STANDARD_ASTEROID_MIN_VERTICAL_SPEED + STANDARD_ASTEROID_MAX_VERTICAL_SPEED) / 2;

    const asteroids: Asteroid[] = [];

    updateAsteroidSpawning(
      asteroids,
      createInitialAsteroidSpawnState(),
      ASTEROID_BASE_SPAWN_INTERVAL,
      0,
      createAsteroidRng({
        variant: FIERY_ASTEROID_CHANCE + 0.01,
        diagonal: STANDARD_ASTEROID_DIAGONAL_CHANCE - 0.01,
        verticalDirection: 0.75,
        verticalSpeed: 0.5,
      }),
    );

    expect(asteroids[0].variant).toBe("standard");
    expect(asteroids[0].verticalSpeed).toBe(expectedVerticalSpeed);
  });

  it("keeps standard asteroids moving straight when the diagonal movement roll misses", () => {
    const asteroids: Asteroid[] = [];

    updateAsteroidSpawning(
      asteroids,
      createInitialAsteroidSpawnState(),
      ASTEROID_BASE_SPAWN_INTERVAL,
      0,
      createAsteroidRng({
        variant: FIERY_ASTEROID_CHANCE + 0.01,
        diagonal: STANDARD_ASTEROID_DIAGONAL_CHANCE + 0.01,
      }),
    );

    expect(asteroids[0].variant).toBe("standard");
    expect(asteroids[0].verticalSpeed).toBe(0);
  });

  it("creates asteroid rotation speeds with noticeable but bounded spin", () => {
    const leftSpinAsteroids: Asteroid[] = [];

    updateAsteroidSpawning(
      leftSpinAsteroids,
      createInitialAsteroidSpawnState(),
      ASTEROID_BASE_SPAWN_INTERVAL,
      0,
      createAsteroidRng({
        variant: FIERY_ASTEROID_CHANCE + 0.01,
        rotationDirection: 0.25,
        rotationSpeed: 0,
      }),
    );

    const rightSpinAsteroids: Asteroid[] = [];

    updateAsteroidSpawning(
      rightSpinAsteroids,
      createInitialAsteroidSpawnState(),
      ASTEROID_BASE_SPAWN_INTERVAL,
      0,
      createAsteroidRng({
        variant: FIERY_ASTEROID_CHANCE + 0.01,
        rotationDirection: 0.75,
        rotationSpeed: 1,
      }),
    );

    expect(leftSpinAsteroids[0].rotationSpeed).toBe(-ASTEROID_MIN_ROTATION_SPEED);
    expect(rightSpinAsteroids[0].rotationSpeed).toBe(ASTEROID_MAX_ROTATION_SPEED);
  });

  it("moves asteroids to the left according to their speed", () => {
    const asteroids = [
      createAsteroid({
        x: 500,
        speed: 120,
      }),
    ];

    updateAsteroids(asteroids, 0.5);

    expect(asteroids[0].x).toBe(440);
  });

  it("moves asteroids vertically according to their vertical speed", () => {
    const asteroids = [
      createAsteroid({
        y: 250,
        verticalSpeed: 30,
      }),
    ];

    updateAsteroids(asteroids, 0.5);

    expect(asteroids[0].y).toBe(265);
  });

  it("bounces asteroids away from the top and bottom movement bounds", () => {
    const topAsteroid = createAsteroid({
      y: 10,
      radius: 30,
      verticalSpeed: -30,
    });
    const bottomAsteroid = createAsteroid({
      y: GAME_HEIGHT - 10,
      radius: 30,
      verticalSpeed: 30,
    });

    const asteroids = [topAsteroid, bottomAsteroid];

    updateAsteroids(asteroids, 0.5);

    expect(topAsteroid.y).toBe(46);
    expect(topAsteroid.verticalSpeed).toBe(30);
    expect(bottomAsteroid.y).toBe(GAME_HEIGHT - 46);
    expect(bottomAsteroid.verticalSpeed).toBe(-30);
  });

  it("updates asteroid rotation", () => {
    const asteroids = [
      createAsteroid({
        rotation: 1,
        rotationSpeed: 0.5,
      }),
    ];

    updateAsteroids(asteroids, 2);

    expect(asteroids[0].rotation).toBe(2);
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

    updateAsteroids(asteroids, 0);

    expect(asteroids).toHaveLength(1);
    expect(asteroids[0].id).toBe("asteroid-visible");
  });
});
