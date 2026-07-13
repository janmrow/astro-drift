import "./style.css";

import { capFrameDelta, createInputState } from "./game/engine";
import { formatScore, formatTime } from "./game/format";
import { createSeededRng } from "./game/rng";
import {
  advanceRunningGame,
  createInitialGameState,
  type GameState,
} from "./game/state";
import type { GameStatus } from "./game/types";
import { resetInputState, setupKeyboardControls } from "./input/keyboard";
import { createStars, renderFrame, updateStars } from "./rendering/canvasRenderer";
import { readBestScore, saveBestScore } from "./storage/bestScoreStorage";

const canvas = document.querySelector<HTMLCanvasElement>("#game-canvas");

if (!canvas) {
  throw new Error("Game canvas was not found.");
}

const statusElement = getRequiredElement("[data-testid='game-status']");
const scoreElement = getRequiredElement("[data-testid='game-score']");
const timeElement = getRequiredElement("[data-testid='game-time']");
const asteroidCountElement = getRequiredElement("[data-testid='asteroid-count']");

const context = getRequiredContext(canvas);
const fontFamily = window.getComputedStyle(canvas).fontFamily;

const STAR_COUNT = 90;

const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function createAsteroidRngFromLocation(): () => number {
  const seedParam = new URLSearchParams(window.location.search).get("seed");
  return seedParam !== null ? createSeededRng(Number(seedParam)) : Math.random;
}

let asteroidRng = createAsteroidRngFromLocation();

const stars = createStars(STAR_COUNT);
const input = createInputState();

let gameStatus: GameStatus = "idle";
let previousFrameTime = performance.now();
let bestScore = readBestScore();

let gameState: GameState = createInitialGameState();

setupKeyboardControls(input, handleGameAction);
document.addEventListener("visibilitychange", handleVisibilityChange);
requestAnimationFrame(runGameLoop);

function handleVisibilityChange(): void {
  if (document.visibilityState === "hidden" && gameStatus === "running") {
    persistBestScore();
  }
}

function persistBestScore(): void {
  bestScore = saveBestScore(gameState.score);
}

function runGameLoop(currentFrameTime: number): void {
  const deltaTime = capFrameDelta((currentFrameTime - previousFrameTime) / 1000);

  previousFrameTime = currentFrameTime;

  const ambientMotionSuppressed = prefersReducedMotion && gameStatus !== "running";

  updateStars(stars, ambientMotionSuppressed ? 0 : deltaTime);

  if (gameStatus === "running") {
    const result = advanceRunningGame(gameState, input, deltaTime, asteroidRng);
    gameState = result.gameState;

    if (result.collided) {
      gameStatus = "gameOver";
      persistBestScore();
    }
  }

  renderFrame({
    context,
    stars,
    player: gameState.player,
    asteroids: gameState.asteroids,
    status: gameStatus,
    score: gameState.score,
    survivalTime: gameState.survivalTime,
    bestScore,
    bonusFeedback: gameState.bonusFeedback,
    fontFamily,
  });
  updateDomStatus();

  requestAnimationFrame(runGameLoop);
}

const START_KEYS = ["enter", " "];

function handleGameAction(key: string): void {
  if (gameStatus === "idle") {
    if (!START_KEYS.includes(key.toLowerCase())) {
      return;
    }

    startGame();
    return;
  }

  if (gameStatus === "gameOver") {
    restartGame();
  }
}

function startGame(): void {
  gameStatus = "running";
  previousFrameTime = performance.now();
}

function restartGame(): void {
  gameStatus = "running";
  gameState = createInitialGameState();
  resetInputState(input);
  asteroidRng = createAsteroidRngFromLocation();
  previousFrameTime = performance.now();
}

let lastStatusText = "";
let lastScoreText = "";
let lastTimeText = "";
let lastAsteroidCountText = "";

function updateDomStatus(): void {
  if (gameStatus !== lastStatusText) {
    statusElement.textContent = gameStatus;
    lastStatusText = gameStatus;
  }

  const scoreText = formatScore(gameState.score);

  if (scoreText !== lastScoreText) {
    scoreElement.textContent = scoreText;
    lastScoreText = scoreText;
  }

  const timeText = formatTime(gameState.survivalTime);

  if (timeText !== lastTimeText) {
    timeElement.textContent = timeText;
    lastTimeText = timeText;
  }

  const asteroidCountText = gameState.asteroids.length.toString();

  if (asteroidCountText !== lastAsteroidCountText) {
    asteroidCountElement.textContent = asteroidCountText;
    lastAsteroidCountText = asteroidCountText;
  }
}

function getRequiredContext(canvasElement: HTMLCanvasElement): CanvasRenderingContext2D {
  const context = canvasElement.getContext("2d");

  if (!context) {
    throw new Error("Canvas 2D context is not available.");
  }

  return context;
}

function getRequiredElement(selector: string): HTMLElement {
  const element = document.querySelector<HTMLElement>(selector);

  if (!element) {
    throw new Error(`Required element was not found: ${selector}`);
  }

  return element;
}
