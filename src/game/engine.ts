import {
  ASTEROID_PASS_BONUS,
  FIERY_ASTEROID_PASS_BONUS,
  PLAYER_SPEED,
  SCORE_PER_SECOND,
} from "./balance";
import type { Asteroid, InputState, Player, PlayerHitbox } from "./types";

export const GAME_WIDTH = 960;
export const GAME_HEIGHT = 540;

export const PLAYER_START_X = GAME_WIDTH / 3;
export const PLAYER_START_Y = GAME_HEIGHT / 2;

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
  };
}

export function updatePlayer(
  currentPlayer: Player,
  currentInput: InputState,
  deltaTime: number,
): Player {
  const directionY = Number(currentInput.down) - Number(currentInput.up);

  if (directionY === 0) {
    return currentPlayer;
  }

  return {
    ...currentPlayer,
    y: clamp(
      currentPlayer.y + directionY * PLAYER_SPEED * deltaTime,
      currentPlayer.height / 2 + PLAYER_SCREEN_PADDING,
      GAME_HEIGHT - currentPlayer.height / 2 - PLAYER_SCREEN_PADDING,
    ),
  };
}

export function updateScore(currentScore: number, deltaTime: number): number {
  return currentScore + SCORE_PER_SECOND * deltaTime;
}

export function collectPassBonuses(
  currentScore: number,
  currentPlayer: Player,
  currentAsteroids: Asteroid[],
): { score: number; asteroids: Asteroid[] } {
  let nextScore = currentScore;
  const nextAsteroids = currentAsteroids.map((asteroid) => {
    if (!asteroid.hasAwardedPassBonus && hasAsteroidPassedPlayer(currentPlayer, asteroid)) {
      nextScore += getAsteroidPassBonus(asteroid);
      return { ...asteroid, hasAwardedPassBonus: true };
    }

    return asteroid;
  });

  return { score: nextScore, asteroids: nextAsteroids };
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

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function capFrameDelta(rawDeltaSeconds: number): number {
  if (!Number.isFinite(rawDeltaSeconds)) return 0;
  return clamp(rawDeltaSeconds, 0, MAX_FRAME_DELTA_SECONDS);
}
