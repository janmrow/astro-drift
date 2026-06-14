import "./style.css";
import {
  ASTEROID_BASE_MAX_SPEED,
  ASTEROID_BASE_MIN_SPEED,
  ASTEROID_MAX_RADIUS,
  ASTEROID_MIN_RADIUS,
  ASTEROID_REMOVE_PADDING,
  ASTEROID_SPEED_RAMP,
  GAME_HEIGHT,
  GAME_WIDTH,
  createInitialPlayer,
  createInputState,
  getAsteroidSpawnInterval,
  hasPlayerCollision,
  updatePlayer,
  updateScore,
} from "./game/engine";
import type { Asteroid, AsteroidPoint, GameStatus } from "./game/types";
import { setupKeyboardControls } from "./input/keyboard";
import { createStars, renderFrame } from "./rendering/canvasRenderer";

const canvas = document.querySelector<HTMLCanvasElement>("#game-canvas");

if (!canvas) {
  throw new Error("Game canvas was not found.");
}

const context = canvas.getContext("2d") as CanvasRenderingContext2D;

if (!context) {
  throw new Error("Canvas 2D context is not available.");
}

const stars = createStars(90);
const input = createInputState();
let player = createInitialPlayer();

const asteroids: Asteroid[] = [];

let gameStatus: GameStatus = "running";
let previousFrameTime = performance.now();
let asteroidSpawnTimer = 0;
let nextAsteroidId = 1;
let score = 0;
let survivalTime = 0;

setupKeyboardControls(input, restartGameIfGameOver);
requestAnimationFrame(runGameLoop);

function runGameLoop(currentFrameTime: number): void {
  const deltaTime = Math.min((currentFrameTime - previousFrameTime) / 1000, 0.033);

  previousFrameTime = currentFrameTime;

  if (gameStatus === "running") {
    survivalTime += deltaTime;

    player = updatePlayer(player, input, deltaTime);
    asteroidSpawnTimer = updateAsteroidSpawning(
      asteroids,
      asteroidSpawnTimer,
      deltaTime,
      survivalTime,
    );
    updateAsteroids(asteroids, deltaTime);
    score = updateScore(score, deltaTime);

    if (hasPlayerCollision(player, asteroids)) {
      gameStatus = "gameOver";
    }
  }

  renderFrame(context, stars, player, asteroids, gameStatus, score, survivalTime);

  requestAnimationFrame(runGameLoop);
}

function updateAsteroidSpawning(
  currentAsteroids: Asteroid[],
  currentTimer: number,
  deltaTime: number,
  currentSurvivalTime: number,
): number {
  let nextTimer = currentTimer + deltaTime;
  const MathSpawnInterval = getAsteroidSpawnInterval(currentSurvivalTime);

  while (nextTimer >= MathSpawnInterval) {
    currentAsteroids.push(createAsteroid(currentSurvivalTime));
    nextTimer -= MathSpawnInterval;
  }

  return nextTimer;
}

function restartGameIfGameOver(): boolean {
  if (gameStatus !== "gameOver") {
    return false;
  }

  restartGame();
  return true;
}

function restartGame(): void {
  gameStatus = "running";
  player = createInitialPlayer();
  asteroids.length = 0;
  asteroidSpawnTimer = 0;
  score = 0;
  survivalTime = 0;
  previousFrameTime = performance.now();
}

function createAsteroid(currentSurvivalTime: number): Asteroid {
  const radius = randomBetween(ASTEROID_MIN_RADIUS, ASTEROID_MAX_RADIUS);
  const speedBonus = currentSurvivalTime * ASTEROID_SPEED_RAMP;

  return {
    id: `asteroid-${nextAsteroidId++}`,
    x: GAME_WIDTH + radius,
    y: randomBetween(radius + 16, GAME_HEIGHT - radius - 16),
    radius,
    speed: randomBetween(
      ASTEROID_BASE_MIN_SPEED + speedBonus,
      ASTEROID_BASE_MAX_SPEED + speedBonus,
    ),
    rotation: randomBetween(0, Math.PI * 2),
    rotationSpeed: randomBetween(-1.2, 1.2),
    points: createAsteroidPoints(9),
  };
}

function createAsteroidPoints(count: number): AsteroidPoint[] {
  return Array.from({ length: count }, (_, index) => ({
    angle: (Math.PI * 2 * index) / count,
    distanceMultiplier: randomBetween(0.72, 1.12),
  }));
}

function updateAsteroids(currentAsteroids: Asteroid[], deltaTime: number): void {
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

function randomBetween(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}