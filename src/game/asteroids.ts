import {
  ASTEROID_BASE_MAX_SPEED,
  ASTEROID_BASE_MIN_SPEED,
  ASTEROID_MAX_RADIUS,
  ASTEROID_MAX_SPEED,
  ASTEROID_MIN_RADIUS,
  ASTEROID_REMOVE_PADDING,
  ASTEROID_SPEED_RAMP,
  GAME_HEIGHT,
  GAME_WIDTH,
  clamp,
  getAsteroidSpawnInterval,
} from "./engine";
import type { Asteroid, AsteroidPoint, AsteroidVariant } from "./types";

export type AsteroidSpawnState = {
  timer: number;
  nextId: number;
};

export const ASTEROID_VERTICAL_SPAWN_PADDING = 16;
const ASTEROID_POINT_COUNT = 9;
const ASTEROID_MIN_POINT_RADIUS_RATIO = 0.8;
const ASTEROID_MAX_POINT_RADIUS_RATIO = 1.2;
export const ASTEROID_MIN_ROTATION_SPEED = 0.35;
export const ASTEROID_MAX_ROTATION_SPEED = 1.1;
export const STANDARD_ASTEROID_DIAGONAL_CHANCE = 0.35;
export const STANDARD_ASTEROID_MIN_VERTICAL_SPEED = 18;
export const STANDARD_ASTEROID_MAX_VERTICAL_SPEED = 44;
export const FIERY_ASTEROID_CHANCE = 0.12;
export const FIERY_ASTEROID_SPEED_MULTIPLIER = 1.7;
export const FIERY_ASTEROID_ROTATION_MULTIPLIER = 1.7;
export const FIERY_ASTEROID_MIN_RADIUS_MULTIPLIER = 1.2;
export const FIERY_ASTEROID_MAX_RADIUS_MULTIPLIER = 1.3;

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
    asteroid.y += asteroid.verticalSpeed * deltaTime;
    asteroid.rotation += asteroid.rotationSpeed * deltaTime;

    const minY = asteroid.radius + ASTEROID_VERTICAL_SPAWN_PADDING;
    const maxY = GAME_HEIGHT - asteroid.radius - ASTEROID_VERTICAL_SPAWN_PADDING;

    if (asteroid.y < minY) {
      asteroid.y = minY;
      asteroid.verticalSpeed = Math.abs(asteroid.verticalSpeed);
    }

    if (asteroid.y > maxY) {
      asteroid.y = maxY;
      asteroid.verticalSpeed = -Math.abs(asteroid.verticalSpeed);
    }
  }

  for (let index = currentAsteroids.length - 1; index >= 0; index--) {
    if (currentAsteroids[index].x < -ASTEROID_REMOVE_PADDING) {
      currentAsteroids.splice(index, 1);
    }
  }
}

function createAsteroid(currentSurvivalTime: number, id: number): Asteroid {
  const variant = createAsteroidVariant();
  const baseRadius = randomBetween(ASTEROID_MIN_RADIUS, ASTEROID_MAX_RADIUS);
  const radius = getAsteroidRadius(baseRadius, variant);
  const speedBonus = currentSurvivalTime * ASTEROID_SPEED_RAMP;
  const speed = clamp(
    randomBetween(ASTEROID_BASE_MIN_SPEED + speedBonus, ASTEROID_BASE_MAX_SPEED + speedBonus),
    ASTEROID_BASE_MIN_SPEED,
    ASTEROID_MAX_SPEED,
  );
  const rotationSpeed = createAsteroidRotationSpeed(variant);

  return {
    id: `asteroid-${id}`,
    variant,
    x: GAME_WIDTH + radius,
    y: randomBetween(
      radius + ASTEROID_VERTICAL_SPAWN_PADDING,
      GAME_HEIGHT - radius - ASTEROID_VERTICAL_SPAWN_PADDING,
    ),
    radius,
    speed: getAsteroidSpeed(speed, variant),
    verticalSpeed: createAsteroidVerticalSpeed(variant),
    rotation: randomBetween(0, Math.PI * 2),
    rotationSpeed,
    points: createAsteroidPoints(ASTEROID_POINT_COUNT),
    passed: false,
  };
}

function createAsteroidVariant(): AsteroidVariant {
  return Math.random() < FIERY_ASTEROID_CHANCE ? "fiery" : "standard";
}

function getAsteroidSpeed(baseSpeed: number, variant: AsteroidVariant): number {
  return variant === "fiery" ? baseSpeed * FIERY_ASTEROID_SPEED_MULTIPLIER : baseSpeed;
}

function createAsteroidVerticalSpeed(variant: AsteroidVariant): number {
  if (variant === "fiery" || Math.random() >= STANDARD_ASTEROID_DIAGONAL_CHANCE) {
    return 0;
  }

  const direction = Math.random() < 0.5 ? -1 : 1;
  return direction * randomBetween(STANDARD_ASTEROID_MIN_VERTICAL_SPEED, STANDARD_ASTEROID_MAX_VERTICAL_SPEED);
}

function createAsteroidRotationSpeed(variant: AsteroidVariant): number {
  const direction = Math.random() < 0.5 ? -1 : 1;
  const rotationSpeed = direction * randomBetween(ASTEROID_MIN_ROTATION_SPEED, ASTEROID_MAX_ROTATION_SPEED);

  return getAsteroidRotationSpeed(rotationSpeed, variant);
}

function getAsteroidRadius(baseRadius: number, variant: AsteroidVariant): number {
  if (variant === "standard") {
    return baseRadius;
  }

  const radiusProgress = (baseRadius - ASTEROID_MIN_RADIUS) / (ASTEROID_MAX_RADIUS - ASTEROID_MIN_RADIUS);
  const radiusMultiplier =
    FIERY_ASTEROID_MAX_RADIUS_MULTIPLIER -
    radiusProgress * (FIERY_ASTEROID_MAX_RADIUS_MULTIPLIER - FIERY_ASTEROID_MIN_RADIUS_MULTIPLIER);

  return baseRadius * radiusMultiplier;
}

function getAsteroidRotationSpeed(baseRotationSpeed: number, variant: AsteroidVariant): number {
  return variant === "fiery"
    ? baseRotationSpeed * FIERY_ASTEROID_ROTATION_MULTIPLIER
    : baseRotationSpeed;
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
