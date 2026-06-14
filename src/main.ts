import "./style.css";

import {
  createInitialPlayer,
  createInputState,
  hasPlayerCollision,
  updatePlayer,
  updateScore,
} from "./game/engine";
import {
  createInitialAsteroidSpawnState,
  updateAsteroidSpawning,
  updateAsteroids,
} from "./game/asteroids";
import type { Asteroid, GameStatus } from "./game/types";
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
let asteroidSpawnState = createInitialAsteroidSpawnState();
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
    asteroidSpawnState = updateAsteroidSpawning(
      asteroids,
      asteroidSpawnState,
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
  asteroidSpawnState = createInitialAsteroidSpawnState();
  score = 0;
  survivalTime = 0;
  previousFrameTime = performance.now();
}