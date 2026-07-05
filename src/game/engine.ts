import type { Asteroid, InputState, Player, PlayerHitbox } from "./types";

export const GAME_WIDTH = 960;
export const GAME_HEIGHT = 540;

export const PLAYER_SPEED = 325;
export const PLAYER_AREA_MAX_X = GAME_WIDTH * 0.4;
export const PLAYER_START_X = 170;
export const PLAYER_START_Y = GAME_HEIGHT / 2;

export const SCORE_PER_SECOND = 10;
export const ASTEROID_PASS_BONUS = 25;
export const FIERY_ASTEROID_PASS_BONUS = 100;

// Caps long frames after tab switches so movement does not jump across the field.
export const MAX_FRAME_DELTA_SECONDS = 0.033;

export const PLAYER_SCREEN_PADDING = 12;
// Slightly smaller than the drawn ship so near misses still feel fair.
const PLAYER_HITBOX_WIDTH_RATIO = 0.72;
const PLAYER_HITBOX_HEIGHT_RATIO = 0.64;
const ASTEROID_COLLISION_RADIUS_RATIO = 0.82;

export function createInitialPlayer(): Player {
  return {
    x: PLAYER_START_X,
    y: PLAYER_START_Y,
    width: 72,
    height: 54,
  };
}

export function createInputState(): InputState {
  return {
    up: false,
    down: false,
    left: false,
    right: false,
  };
}

export function updatePlayer(
  currentPlayer: Player,
  currentInput: InputState,
  deltaTime: number,
): Player {
  const directionX = Number(currentInput.right) - Number(currentInput.left);
  const directionY = Number(currentInput.down) - Number(currentInput.up);
  const directionLength = Math.hypot(directionX, directionY);

  if (directionLength === 0) {
    return currentPlayer;
  }

  const normalizedX = directionX / directionLength;
  const normalizedY = directionY / directionLength;

  return {
    ...currentPlayer,
    x: clamp(
      currentPlayer.x + normalizedX * PLAYER_SPEED * deltaTime,
      currentPlayer.width / 2 + PLAYER_SCREEN_PADDING,
      PLAYER_AREA_MAX_X,
    ),
    y: clamp(
      currentPlayer.y + normalizedY * PLAYER_SPEED * deltaTime,
      currentPlayer.height / 2 + PLAYER_SCREEN_PADDING,
      GAME_HEIGHT - currentPlayer.height / 2 - PLAYER_SCREEN_PADDING,
    ),
  };
}

export function updateScore(currentScore: number, deltaTime: number): number {
  return currentScore + SCORE_PER_SECOND * deltaTime;
}

export function applyPassedAsteroidBonuses(
  currentScore: number,
  currentPlayer: Player,
  currentAsteroids: Asteroid[],
): number {
  let nextScore = currentScore;

  for (const asteroid of currentAsteroids) {
    if (!asteroid.passed && hasAsteroidPassedPlayer(currentPlayer, asteroid)) {
      asteroid.passed = true;
      nextScore += getAsteroidPassBonus(asteroid);
    }
  }

  return nextScore;
}

export function getAsteroidPassBonus(asteroid: Asteroid): number {
  return asteroid.variant === "fiery" ? FIERY_ASTEROID_PASS_BONUS : ASTEROID_PASS_BONUS;
}

export function hasAsteroidPassedPlayer(currentPlayer: Player, asteroid: Asteroid): boolean {
  const playerLeftEdge = currentPlayer.x - currentPlayer.width / 2;
  return asteroid.x + asteroid.radius < playerLeftEdge;
}

export function hasPlayerCollision(currentPlayer: Player, currentAsteroids: Asteroid[]): boolean {
  return currentAsteroids.some((asteroid) => isPlayerCollidingWithAsteroid(currentPlayer, asteroid));
}

export function isPlayerCollidingWithAsteroid(currentPlayer: Player, asteroid: Asteroid): boolean {
  const hitbox = getPlayerHitbox(currentPlayer);
  const asteroidHitRadius = asteroid.radius * ASTEROID_COLLISION_RADIUS_RATIO;

  const closestX = clamp(asteroid.x, hitbox.left, hitbox.right);
  const closestY = clamp(asteroid.y, hitbox.top, hitbox.bottom);

  const distanceX = asteroid.x - closestX;
  const distanceY = asteroid.y - closestY;

  return distanceX * distanceX + distanceY * distanceY <= asteroidHitRadius * asteroidHitRadius;
}

export function getPlayerHitbox(currentPlayer: Player): PlayerHitbox {
  const hitboxWidth = currentPlayer.width * PLAYER_HITBOX_WIDTH_RATIO;
  const hitboxHeight = currentPlayer.height * PLAYER_HITBOX_HEIGHT_RATIO;

  return {
    left: currentPlayer.x - hitboxWidth / 2,
    right: currentPlayer.x + hitboxWidth / 2,
    top: currentPlayer.y - hitboxHeight / 2,
    bottom: currentPlayer.y + hitboxHeight / 2,
  };
}

export function formatScore(currentScore: number): string {
  return Math.floor(currentScore).toString().padStart(5, "0");
}

export function formatTime(seconds: number): string {
  return `${Math.floor(seconds)}s`;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function capFrameDelta(rawDeltaSeconds: number): number {
  return Math.min(rawDeltaSeconds, MAX_FRAME_DELTA_SECONDS);
}
