import {
  ASTEROID_BASE_MAX_SPEED,
  ASTEROID_BASE_MIN_SPEED,
  ASTEROID_BASE_SPAWN_INTERVAL,
  ASTEROID_MAX_RADIUS,
  ASTEROID_MAX_ROTATION_SPEED,
  ASTEROID_MIN_RADIUS,
  ASTEROID_MIN_ROTATION_SPEED,
  ASTEROID_MIN_SPAWN_INTERVAL,
  ASTEROID_SPEED_HARD_CAP,
  ASTEROID_SPEED_RAMP,
  ASTEROID_SPAWN_RAMP,
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
} from "./balance";
import { GAME_HEIGHT, GAME_WIDTH, clamp } from "./engine";
import { assertNever, type Asteroid, type AsteroidPoint, type AsteroidVariant } from "./types";

export type AsteroidSpawnState = {
  timer: number;
  nextId: number;
};

export const ASTEROID_REMOVE_PADDING = 80;

export const ASTEROID_VERTICAL_SPAWN_PADDING = 16;
const ASTEROID_POINT_COUNT = 9;
const ASTEROID_MIN_POINT_RADIUS_RATIO = 0.8;
const ASTEROID_MAX_POINT_RADIUS_RATIO = 1.2;

export function createInitialAsteroidSpawnState(): AsteroidSpawnState {
  return {
    timer: 0,
    nextId: 1,
  };
}

export function getAsteroidSpawnInterval(currentSurvivalTime: number): number {
  return clamp(
    ASTEROID_BASE_SPAWN_INTERVAL - currentSurvivalTime * ASTEROID_SPAWN_RAMP,
    ASTEROID_MIN_SPAWN_INTERVAL,
    ASTEROID_BASE_SPAWN_INTERVAL,
  );
}

export function updateAsteroidSpawning(
  currentAsteroids: Asteroid[],
  currentSpawnState: AsteroidSpawnState,
  deltaTime: number,
  currentSurvivalTime: number,
  rng: () => number = Math.random,
): { asteroids: Asteroid[]; spawnState: AsteroidSpawnState } {
  const nextAsteroids = [...currentAsteroids];
  let nextTimer = currentSpawnState.timer + deltaTime;
  let nextId = currentSpawnState.nextId;

  const spawnInterval = getAsteroidSpawnInterval(currentSurvivalTime);

  while (nextTimer >= spawnInterval) {
    nextAsteroids.push(createAsteroid(currentSurvivalTime, nextId, rng));
    nextId += 1;
    nextTimer -= spawnInterval;
  }

  return {
    asteroids: nextAsteroids,
    spawnState: {
      timer: nextTimer,
      nextId,
    },
  };
}

export function updateAsteroids(currentAsteroids: Asteroid[], deltaTime: number): Asteroid[] {
  return currentAsteroids
    .map((currentAsteroid) => {
      const asteroid = {
        ...currentAsteroid,
        x: currentAsteroid.x - currentAsteroid.speed * deltaTime,
        y: currentAsteroid.y + currentAsteroid.verticalSpeed * deltaTime,
        rotation: currentAsteroid.rotation + currentAsteroid.rotationSpeed * deltaTime,
      };

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

      return asteroid;
    })
    .filter((asteroid) => asteroid.x >= -ASTEROID_REMOVE_PADDING);
}

function createAsteroid(currentSurvivalTime: number, id: number, rng: () => number): Asteroid {
  const variant = createAsteroidVariant(rng);
  const baseRadius = randomBetween(ASTEROID_MIN_RADIUS, ASTEROID_MAX_RADIUS, rng);
  const radius = getAsteroidRadius(baseRadius, variant);
  const speedBonus = currentSurvivalTime * ASTEROID_SPEED_RAMP;
  const speed = clamp(
    randomBetween(ASTEROID_BASE_MIN_SPEED + speedBonus, ASTEROID_BASE_MAX_SPEED + speedBonus, rng),
    ASTEROID_BASE_MIN_SPEED,
    ASTEROID_SPEED_HARD_CAP,
  );
  const rotationSpeed = createAsteroidRotationSpeed(variant, rng);

  return {
    id: `asteroid-${id}`,
    variant,
    x: GAME_WIDTH + radius,
    y: randomBetween(
      radius + ASTEROID_VERTICAL_SPAWN_PADDING,
      GAME_HEIGHT - radius - ASTEROID_VERTICAL_SPAWN_PADDING,
      rng,
    ),
    radius,
    speed: getAsteroidSpeed(speed, variant),
    verticalSpeed: createAsteroidVerticalSpeed(variant, rng),
    rotation: randomBetween(0, Math.PI * 2, rng),
    rotationSpeed,
    points: createAsteroidPoints(ASTEROID_POINT_COUNT, rng),
    hasAwardedPassBonus: false,
  };
}

function createAsteroidVariant(rng: () => number): AsteroidVariant {
  return rng() < FIERY_ASTEROID_CHANCE ? "fiery" : "standard";
}

function getAsteroidSpeed(baseSpeed: number, variant: AsteroidVariant): number {
  switch (variant) {
    case "fiery":
      return baseSpeed * FIERY_ASTEROID_SPEED_MULTIPLIER;
    case "standard":
      return baseSpeed;
    default:
      return assertNever(variant);
  }
}

function createAsteroidVerticalSpeed(variant: AsteroidVariant, rng: () => number): number {
  switch (variant) {
    case "fiery":
      return createFieryAsteroidVerticalSpeed(rng);
    case "standard":
      return createStandardAsteroidVerticalSpeed(rng);
    default:
      return assertNever(variant);
  }
}

function createFieryAsteroidVerticalSpeed(rng: () => number): number {
  return randomSign(rng) * randomBetween(FIERY_ASTEROID_MIN_VERTICAL_SPEED, FIERY_ASTEROID_MAX_VERTICAL_SPEED, rng);
}

function createStandardAsteroidVerticalSpeed(rng: () => number): number {
  if (rng() >= STANDARD_ASTEROID_DIAGONAL_CHANCE) {
    return 0;
  }

  return (
    randomSign(rng) * randomBetween(STANDARD_ASTEROID_MIN_VERTICAL_SPEED, STANDARD_ASTEROID_MAX_VERTICAL_SPEED, rng)
  );
}

function createAsteroidRotationSpeed(variant: AsteroidVariant, rng: () => number): number {
  const rotationSpeed = randomSign(rng) * randomBetween(ASTEROID_MIN_ROTATION_SPEED, ASTEROID_MAX_ROTATION_SPEED, rng);

  return getAsteroidRotationSpeed(rotationSpeed, variant);
}

function getAsteroidRadius(baseRadius: number, variant: AsteroidVariant): number {
  switch (variant) {
    case "standard":
      return baseRadius;
    case "fiery": {
      const radiusProgress = (baseRadius - ASTEROID_MIN_RADIUS) / (ASTEROID_MAX_RADIUS - ASTEROID_MIN_RADIUS);
      const radiusMultiplier =
        FIERY_ASTEROID_MAX_RADIUS_MULTIPLIER -
        radiusProgress * (FIERY_ASTEROID_MAX_RADIUS_MULTIPLIER - FIERY_ASTEROID_MIN_RADIUS_MULTIPLIER);

      return baseRadius * radiusMultiplier;
    }
    default:
      return assertNever(variant);
  }
}

function getAsteroidRotationSpeed(baseRotationSpeed: number, variant: AsteroidVariant): number {
  switch (variant) {
    case "fiery":
      return baseRotationSpeed * FIERY_ASTEROID_ROTATION_MULTIPLIER;
    case "standard":
      return baseRotationSpeed;
    default:
      return assertNever(variant);
  }
}

function createAsteroidPoints(count: number, rng: () => number): AsteroidPoint[] {
  const points: AsteroidPoint[] = [];
  const angleStep = (Math.PI * 2) / count;

  for (let i = 0; i < count; i++) {
    const angle = i * angleStep;
    const distanceMultiplier = randomBetween(
      ASTEROID_MIN_POINT_RADIUS_RATIO,
      ASTEROID_MAX_POINT_RADIUS_RATIO,
      rng,
    );

    points.push({ angle, distanceMultiplier });
  }

  return points;
}

function randomBetween(min: number, max: number, rng: () => number): number {
  return rng() * (max - min) + min;
}

function randomSign(rng: () => number): 1 | -1 {
  return rng() < 0.5 ? -1 : 1;
}
