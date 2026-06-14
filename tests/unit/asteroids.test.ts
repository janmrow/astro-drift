import { describe, expect, it } from "vitest";

import {
  createInitialAsteroidSpawnState,
  updateAsteroidSpawning,
  updateAsteroids,
} from "../../src/game/asteroids";
import { ASTEROID_BASE_SPAWN_INTERVAL, ASTEROID_REMOVE_PADDING } from "../../src/game/engine";
import type { Asteroid } from "../../src/game/types";

function createAsteroid(overrides: Partial<Asteroid> = {}): Asteroid {
  return {
    id: "asteroid-test",
    x: 500,
    y: 250,
    radius: 30,
    speed: 100,
    rotation: 0,
    rotationSpeed: 0.5,
    points: [],
    ...overrides,
  };
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
    expect(updatedSpawnState.nextId).toBe(2);
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