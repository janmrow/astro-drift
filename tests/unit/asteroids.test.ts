import { afterEach, describe, expect, it, vi } from "vitest";

import {
  FIERY_ASTEROID_CHANCE,
  FIERY_ASTEROID_ROTATION_MULTIPLIER,
  FIERY_ASTEROID_SPEED_MULTIPLIER,
  createInitialAsteroidSpawnState,
  updateAsteroidSpawning,
  updateAsteroids,
} from "../../src/game/asteroids";
import {
  ASTEROID_BASE_MAX_SPEED,
  ASTEROID_BASE_MIN_SPEED,
  ASTEROID_BASE_SPAWN_INTERVAL,
  ASTEROID_MAX_RADIUS,
  ASTEROID_MIN_RADIUS,
  ASTEROID_REMOVE_PADDING,
  ASTEROID_SPEED_RAMP,
  GAME_HEIGHT,
  GAME_WIDTH,
} from "../../src/game/engine";
import type { Asteroid } from "../../src/game/types";

function createAsteroid(overrides: Partial<Asteroid> = {}): Asteroid {
  return {
    id: "asteroid-test",
    variant: "standard",
    x: 500,
    y: 250,
    radius: 30,
    speed: 100,
    rotation: 0,
    rotationSpeed: 0.5,
    points: [],
    passed: false,
    ...overrides,
  };
}

function asteroidRandomValues(variantRoll: number): number[] {
  return [variantRoll, 0.5, 0.5, 0.75, 0.5, 0.5, ...Array(9).fill(0.5)];
}

describe("asteroid logic", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

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
    vi.spyOn(Math, "random").mockReturnValue(0.5);

    const asteroids: Asteroid[] = [];
    const survivalTime = 20;
    const radius = (ASTEROID_MIN_RADIUS + ASTEROID_MAX_RADIUS) / 2;
    const speedBonus = survivalTime * ASTEROID_SPEED_RAMP;

    updateAsteroidSpawning(
      asteroids,
      createInitialAsteroidSpawnState(),
      ASTEROID_BASE_SPAWN_INTERVAL,
      survivalTime,
    );

    expect(asteroids).toHaveLength(1);
    expect(asteroids[0]).toMatchObject({
      id: "asteroid-1",
      variant: "standard",
      radius,
      x: GAME_WIDTH + radius,
      y: GAME_HEIGHT / 2,
      speed: (ASTEROID_BASE_MIN_SPEED + ASTEROID_BASE_MAX_SPEED) / 2 + speedBonus,
      rotation: Math.PI,
      rotationSpeed: 0,
      passed: false,
    });
    expect(asteroids[0].points).toHaveLength(9);
    expect(asteroids[0].points[0]).toEqual({
      angle: 0,
      distanceMultiplier: 1,
    });
  });

  it("increases spawned asteroid speed as survival time grows", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.5);

    const earlyAsteroids: Asteroid[] = [];
    const laterAsteroids: Asteroid[] = [];

    updateAsteroidSpawning(
      earlyAsteroids,
      createInitialAsteroidSpawnState(),
      ASTEROID_BASE_SPAWN_INTERVAL,
      0,
    );
    updateAsteroidSpawning(
      laterAsteroids,
      createInitialAsteroidSpawnState(),
      ASTEROID_BASE_SPAWN_INTERVAL,
      60,
    );

    expect(laterAsteroids[0].speed).toBeGreaterThan(earlyAsteroids[0].speed);
  });

  it("creates fiery asteroids with faster speed and rotation when the variant roll hits", () => {
    const randomValues = [
      ...asteroidRandomValues(FIERY_ASTEROID_CHANCE + 0.01),
      ...asteroidRandomValues(FIERY_ASTEROID_CHANCE - 0.01),
    ];

    vi.spyOn(Math, "random").mockImplementation(() => randomValues.shift() ?? 0.5);

    const standardAsteroids: Asteroid[] = [];
    const fieryAsteroids: Asteroid[] = [];

    updateAsteroidSpawning(
      standardAsteroids,
      createInitialAsteroidSpawnState(),
      ASTEROID_BASE_SPAWN_INTERVAL,
      0,
    );
    updateAsteroidSpawning(
      fieryAsteroids,
      createInitialAsteroidSpawnState(),
      ASTEROID_BASE_SPAWN_INTERVAL,
      0,
    );

    expect(standardAsteroids[0].variant).toBe("standard");
    expect(fieryAsteroids[0].variant).toBe("fiery");
    expect(fieryAsteroids[0].speed).toBeCloseTo(
      standardAsteroids[0].speed * FIERY_ASTEROID_SPEED_MULTIPLIER,
    );
    expect(fieryAsteroids[0].rotationSpeed).toBeCloseTo(
      standardAsteroids[0].rotationSpeed * FIERY_ASTEROID_ROTATION_MULTIPLIER,
    );
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
