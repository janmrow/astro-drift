import type { Asteroid } from "../../src/game/types";

export function createAsteroid(overrides: Partial<Asteroid> = {}): Asteroid {
  return {
    id: "asteroid-test",
    variant: "standard",
    x: 500,
    y: 250,
    radius: 30,
    speed: 100,
    verticalSpeed: 0,
    rotation: 0,
    rotationSpeed: 0,
    points: [],
    passed: false,
    ...overrides,
  };
}
