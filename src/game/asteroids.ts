import {
  ASTEROID_BASE_MAX_SPEED,
  ASTEROID_BASE_MIN_SPEED,
  ASTEROID_MAX_RADIUS,
  ASTEROID_MIN_RADIUS,
  ASTEROID_REMOVE_PADDING,
  ASTEROID_SPEED_RAMP,
  GAME_HEIGHT,
  GAME_WIDTH,
  getAsteroidSpawnInterval,
} from "./engine";
import type { Asteroid, AsteroidPoint } from "./types";

export type AsteroidSpawnState = {
  timer: number;
  nextId: number;
};

const ASTEROID_VERTICAL_SPAWN_PADDING = 16;
const ASTEROID_POINT_COUNT = 9;
const ASTEROID_MIN_POINT_RADIUS_RATIO = 0.8;
const ASTEROID_MAX_POINT_RADIUS_RATIO = 1.2;
const ASTEROID_MIN_ROTATION_SPEED = -1.2;
const ASTEROID_MAX_ROTATION_SPEED = 1.2;

export function createInitialAsteroidSpawnState(): AsteroidSpawnState {
  return {
    timer: 0,
    nextId: 1,
  };
}

export function updateAsteroidSpawning(
  currentAsteroids: Asteroid[],
  currentSpawnState: AsteroidSpawnState,
  deltaTime: number,
  currentSurvivalTime: number,
): AsteroidSpawnState {
  let nextTimer = currentSpawnState.timer + deltaTime;
  let nextId = currentSpawnState.nextId;

  const spawnInterval = getAsteroidSpawnInterval(currentSurvivalTime);

  while (nextTimer >= spawnInterval) {
    currentAsteroids.push(createAsteroid(currentSurvivalTime, nextId));
    nextId += 1;
    nextTimer -= spawnInterval;
  }

  return {
    timer: nextTimer,
    nextId,
  };
}

export function updateAsteroids(currentAsteroids: Asteroid[], deltaTime: number): void {
  for (const asteroid of currentAsteroids) {
    asteroid.x -= asteroid.speed * deltaTime;
    asteroid.rotation += asteroid.rotationSpeed * deltaTime;
  }

  for (let index = currentAsteroids.length - 1; index >= 0; index--) {
    if (currentAsteroids[index].x < -ASTEROID_REMOVE_PADDING) {
      currentAsteroids.splice(index, 1);
    }
  }
}

function createAsteroid(currentSurvivalTime: number, id: number): Asteroid {
  const radius = randomBetween(ASTEROID_MIN_RADIUS, ASTEROID_MAX_RADIUS);
  const speedBonus = currentSurvivalTime * ASTEROID_SPEED_RAMP;

  return {
    id: `asteroid-${id}`,
    x: GAME_WIDTH + radius,
    y: randomBetween(
      radius + ASTEROID_VERTICAL_SPAWN_PADDING,
      GAME_HEIGHT - radius - ASTEROID_VERTICAL_SPAWN_PADDING,
    ),
    radius,
    speed: randomBetween(
      ASTEROID_BASE_MIN_SPEED + speedBonus,
      ASTEROID_BASE_MAX_SPEED + speedBonus,
    ),
    rotation: randomBetween(0, Math.PI * 2),
    rotationSpeed: randomBetween(ASTEROID_MIN_ROTATION_SPEED, ASTEROID_MAX_ROTATION_SPEED),
    points: createAsteroidPoints(ASTEROID_POINT_COUNT),
    passed: false,
  };
}

function createAsteroidPoints(count: number): AsteroidPoint[] {
  const points: AsteroidPoint[] = [];
  const angleStep = (Math.PI * 2) / count;

  for (let i = 0; i < count; i++) {
    const angle = i * angleStep;
    const distanceMultiplier = randomBetween(
      ASTEROID_MIN_POINT_RADIUS_RATIO,
      ASTEROID_MAX_POINT_RADIUS_RATIO,
    );

    points.push({ angle, distanceMultiplier });
  }

  return points;
}

function randomBetween(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}
