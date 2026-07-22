import {
  ASTEROID_BASE_MAX_SPEED,
  ASTEROID_BASE_MIN_SPEED,
  ASTEROID_BASE_SPAWN_INTERVAL,
  ASTEROID_INITIAL_SPAWN_TIMER,
  ASTEROID_MAX_RADIUS,
  ASTEROID_MAX_ROTATION_SPEED,
  ASTEROID_MIN_RADIUS,
  ASTEROID_MIN_ROTATION_SPEED,
  ASTEROID_MIN_SPAWN_INTERVAL,
  ASTEROID_SPEED_HARD_CAP,
  ASTEROID_SPEED_RAMP,
  ASTEROID_SPAWN_RAMP,
  ASTEROID_VERTICAL_SPAWN_BAND_COUNT,
  EARLY_RAMP_GRACE_SECONDS,
  FIERY_ASTEROID_CHANCE,
  FIERY_ASTEROID_MAX_RADIUS_MULTIPLIER,
  FIERY_ASTEROID_MIN_RADIUS_MULTIPLIER,
  FIERY_ASTEROID_ROTATION_MULTIPLIER,
  FIERY_ASTEROID_SPEED_MULTIPLIER,
} from "./balance";
import { GAME_HEIGHT, GAME_WIDTH, clamp } from "./engine";
import { assertNever, type Asteroid, type AsteroidPoint, type AsteroidVariant } from "./types";

export type AsteroidSpawnState = {
  timer: number;
  nextId: number;
  remainingBands: number[];
};

export type AsteroidSpawnBandDraw = {
  bandIndex: number;
  remainingBands: number[];
};

export const ASTEROID_REMOVE_PADDING = 80;

export const ASTEROID_VERTICAL_SPAWN_PADDING = 16;
const ASTEROID_MIN_POINT_RADIUS_RATIO = 0.8;
const ASTEROID_MAX_POINT_RADIUS_RATIO = 1.2;

export function createInitialAsteroidSpawnState(): AsteroidSpawnState {
  return {
    timer: ASTEROID_INITIAL_SPAWN_TIMER,
    nextId: 1,
    remainingBands: [],
  };
}

export function drawAsteroidSpawnBand(
  currentRemainingBands: number[],
  rng: () => number,
): AsteroidSpawnBandDraw {
  const remainingBands =
    currentRemainingBands.length > 0
      ? [...currentRemainingBands]
      : createShuffledAsteroidSpawnBands(rng);
  const bandIndex = remainingBands.pop();

  if (bandIndex === undefined) {
    throw new Error("Asteroid spawn band bag must not be empty after refill");
  }

  return { bandIndex, remainingBands };
}

export function getAsteroidDifficultyRampTime(currentSurvivalTime: number): number {
  return Math.max(0, currentSurvivalTime - EARLY_RAMP_GRACE_SECONDS);
}

export function getAsteroidSpawnInterval(currentSurvivalTime: number): number {
  const rampTime = getAsteroidDifficultyRampTime(currentSurvivalTime);

  return clamp(
    ASTEROID_BASE_SPAWN_INTERVAL - rampTime * ASTEROID_SPAWN_RAMP,
    ASTEROID_MIN_SPAWN_INTERVAL,
    ASTEROID_BASE_SPAWN_INTERVAL,
  );
}

export function getAsteroidPointCount(randomValue: number): number {
  return clamp(7 + Math.floor(randomValue * 5), 7, 11);
}

export function updateAsteroidSpawning(
  currentAsteroids: Asteroid[],
  currentSpawnState: AsteroidSpawnState,
  deltaTime: number,
  currentSurvivalTime: number,
  rng: () => number,
): { asteroids: Asteroid[]; spawnState: AsteroidSpawnState } {
  const nextAsteroids = [...currentAsteroids];
  let nextTimer = currentSpawnState.timer + deltaTime;
  let nextId = currentSpawnState.nextId;
  let nextRemainingBands = [...currentSpawnState.remainingBands];

  const spawnInterval = getAsteroidSpawnInterval(currentSurvivalTime);

  while (nextTimer >= spawnInterval) {
    const bandDraw = drawAsteroidSpawnBand(nextRemainingBands, rng);
    nextRemainingBands = bandDraw.remainingBands;
    nextAsteroids.push(createAsteroid(currentSurvivalTime, nextId, bandDraw.bandIndex, rng));
    nextId += 1;
    nextTimer -= spawnInterval;
  }

  return {
    asteroids: nextAsteroids,
    spawnState: {
      timer: nextTimer,
      nextId,
      remainingBands: nextRemainingBands,
    },
  };
}

export function updateAsteroids(currentAsteroids: Asteroid[], deltaTime: number): Asteroid[] {
  return currentAsteroids
    .map((currentAsteroid) => ({
      ...currentAsteroid,
      x: currentAsteroid.x - currentAsteroid.speed * deltaTime,
      rotation: currentAsteroid.rotation + currentAsteroid.rotationSpeed * deltaTime,
    }))
    .filter((asteroid) => asteroid.x >= -ASTEROID_REMOVE_PADDING);
}

function createAsteroid(
  currentSurvivalTime: number,
  id: number,
  spawnBandIndex: number,
  rng: () => number,
): Asteroid {
  const variant = createAsteroidVariant(rng);
  const baseRadius = randomBetween(ASTEROID_MIN_RADIUS, ASTEROID_MAX_RADIUS, rng);
  const radius = getAsteroidRadius(baseRadius, variant);
  const rampTime = getAsteroidDifficultyRampTime(currentSurvivalTime);
  const speedBonus = rampTime * ASTEROID_SPEED_RAMP;
  const speed = randomBetween(
    ASTEROID_BASE_MIN_SPEED + speedBonus,
    ASTEROID_BASE_MAX_SPEED + speedBonus,
    rng,
  );
  const rotationSpeed = createAsteroidRotationSpeed(variant, rng);
  const minimumCenterY = radius + ASTEROID_VERTICAL_SPAWN_PADDING;
  const maximumCenterY = GAME_HEIGHT - radius - ASTEROID_VERTICAL_SPAWN_PADDING;
  const bandHeight =
    (maximumCenterY - minimumCenterY) / ASTEROID_VERTICAL_SPAWN_BAND_COUNT;
  const bandMinimumY = minimumCenterY + spawnBandIndex * bandHeight;
  const bandMaximumY = bandMinimumY + bandHeight;

  return {
    id: `asteroid-${id}`,
    variant,
    x: GAME_WIDTH + radius,
    y: randomBetween(bandMinimumY, bandMaximumY, rng),
    radius,
    speed: getAsteroidSpeed(speed, variant),
    rotation: randomBetween(0, Math.PI * 2, rng),
    rotationSpeed,
    points: createAsteroidPoints(getAsteroidPointCount(rng()), rng),
    hasAwardedPassBonus: false,
  };
}

function createShuffledAsteroidSpawnBands(rng: () => number): number[] {
  const bands = Array.from(
    { length: ASTEROID_VERTICAL_SPAWN_BAND_COUNT },
    (_, bandIndex) => bandIndex,
  );

  for (let currentIndex = bands.length - 1; currentIndex > 0; currentIndex -= 1) {
    const swapIndex = Math.floor(rng() * (currentIndex + 1));
    [bands[currentIndex], bands[swapIndex]] = [bands[swapIndex], bands[currentIndex]];
  }

  return bands;
}

function createAsteroidVariant(rng: () => number): AsteroidVariant {
  return rng() < FIERY_ASTEROID_CHANCE ? "fiery" : "standard";
}

function getAsteroidSpeed(baseSpeed: number, variant: AsteroidVariant): number {
  let finalSpeed: number;

  switch (variant) {
    case "fiery":
      finalSpeed = baseSpeed * FIERY_ASTEROID_SPEED_MULTIPLIER;
      break;
    case "standard":
      finalSpeed = baseSpeed;
      break;
    default:
      return assertNever(variant);
  }

  return clamp(finalSpeed, ASTEROID_BASE_MIN_SPEED, ASTEROID_SPEED_HARD_CAP);
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
