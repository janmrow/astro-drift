import "./style.css";

import {
  applyPassedAsteroidBonuses,
  createInitialPlayer,
  createInputState,
  formatScore,
  formatTime,
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

const STAR_COUNT = 90;
// Caps long frames after tab switches so movement does not jump across the field.
const MAX_FRAME_DELTA_SECONDS = 0.033;
const BONUS_FEEDBACK_DURATION = 0.65;

const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const stars = createStars(STAR_COUNT);
const input = createInputState();
let player = createInitialPlayer();

const asteroids: Asteroid[] = [];

let gameStatus: GameStatus = "idle";
let previousFrameTime = performance.now();
let asteroidSpawnState = createInitialAsteroidSpawnState();
let score = 0;
let survivalTime = 0;
let bestScore = readBestScore();
let bonusFeedbackText: string | null = null;
let bonusFeedbackTimeLeft = 0;

setupKeyboardControls(input, handleGameAction);
requestAnimationFrame(runGameLoop);

function runGameLoop(currentFrameTime: number): void {
  const deltaTime = Math.min(
    (currentFrameTime - previousFrameTime) / 1000,
    MAX_FRAME_DELTA_SECONDS,
  );

  previousFrameTime = currentFrameTime;

  const ambientMotionSuppressed = prefersReducedMotion && gameStatus !== "running";

  updateStars(stars, ambientMotionSuppressed ? 0 : deltaTime);

  if (gameStatus === "running") {
    survivalTime += deltaTime;

    player = updatePlayer(player, input, deltaTime);
    asteroidSpawnState = updateAsteroidSpawning(
      asteroids,
      asteroidSpawnState,
      deltaTime,
      survivalTime,
    );
    score = applyScoreBonuses(score);
    updateAsteroids(asteroids, deltaTime);

    if (hasPlayerCollision(player, asteroids)) {
      gameStatus = "gameOver";
      bestScore = saveBestScore(score);
    } else {
      score = updateScore(score, deltaTime);
      updateBonusFeedbackTimer(deltaTime);
    }
  }

  renderFrame(
    context,
    stars,
    player,
    asteroids,
    gameStatus,
    score,
    survivalTime,
    bestScore,
    bonusFeedbackTimeLeft > 0 ? bonusFeedbackText : null,
    currentFrameTime,
    ambientMotionSuppressed,
  );
  updateDomStatus();

  requestAnimationFrame(runGameLoop);
}

const START_KEYS = ["enter", " "];

function handleGameAction(key: string): boolean {
  if (gameStatus === "idle") {
    if (!START_KEYS.includes(key.toLowerCase())) {
      return false;
    }

    startGame();
    return true;
  }

  if (gameStatus === "gameOver") {
    restartGame();
    return true;
  }

  return false;
}

function startGame(): void {
  gameStatus = "running";
  previousFrameTime = performance.now();
}

function restartGame(): void {
  gameStatus = "running";
  player = createInitialPlayer();
  asteroids.length = 0;
  asteroidSpawnState = createInitialAsteroidSpawnState();
  score = 0;
  survivalTime = 0;
  bonusFeedbackText = null;
  bonusFeedbackTimeLeft = 0;
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

  const scoreText = formatScore(score);

  if (scoreText !== lastScoreText) {
    scoreElement.textContent = scoreText;
    lastScoreText = scoreText;
  }

  const timeText = formatTime(survivalTime);

  if (timeText !== lastTimeText) {
    timeElement.textContent = timeText;
    lastTimeText = timeText;
  }

  const asteroidCountText = asteroids.length.toString();

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

function applyScoreBonuses(currentScore: number): number {
  const scoreBeforeBonus = currentScore;
  const scoreAfterBonus = applyPassedAsteroidBonuses(currentScore, player, asteroids);
  const bonusPoints = Math.floor(scoreAfterBonus - scoreBeforeBonus);

  if (bonusPoints > 0) {
    bonusFeedbackText = `+${bonusPoints}`;
    bonusFeedbackTimeLeft = BONUS_FEEDBACK_DURATION;
  }

  return scoreAfterBonus;
}

function updateBonusFeedbackTimer(deltaTime: number): void {
  if (bonusFeedbackTimeLeft <= 0) {
    return;
  }

  bonusFeedbackTimeLeft = Math.max(0, bonusFeedbackTimeLeft - deltaTime);

  if (bonusFeedbackTimeLeft === 0) {
    bonusFeedbackText = null;
  }
}
