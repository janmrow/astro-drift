import "./style.css";

import {
  capFrameDelta,
  createInputState,
  hasPlayerCollision,
  updatePlayer,
  updateScore,
} from "./game/engine";
import { formatScore, formatTime } from "./game/format";
import { updateAsteroidSpawning, updateAsteroids } from "./game/asteroids";
import { createSeededRng } from "./game/rng";
import {
  applyScoreBonuses,
  createInitialGameState,
  updateBonusFeedbackTimer,
} from "./game/state";
import type { GameStatus } from "./game/types";
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
const BONUS_FEEDBACK_DURATION = 0.65;

const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const seedParam = new URLSearchParams(window.location.search).get("seed");
const asteroidRng = seedParam !== null ? createSeededRng(Number(seedParam)) : Math.random;

const stars = createStars(STAR_COUNT);
const input = createInputState();

let gameStatus: GameStatus = "idle";
let previousFrameTime = performance.now();
let bestScore = readBestScore();

const initialGameState = createInitialGameState();
const asteroids = initialGameState.asteroids;

let player = initialGameState.player;
let asteroidSpawnState = initialGameState.asteroidSpawnState;
let score = initialGameState.score;
let survivalTime = initialGameState.survivalTime;
let bonusFeedbackText = initialGameState.bonusFeedbackText;
let bonusFeedbackTimeLeft = initialGameState.bonusFeedbackTimeLeft;

setupKeyboardControls(input, handleGameAction);
document.addEventListener("visibilitychange", handleVisibilityChange);
requestAnimationFrame(runGameLoop);

function handleVisibilityChange(): void {
  if (document.visibilityState === "hidden" && gameStatus === "running") {
    bestScore = saveBestScore(score);
  }
}

function runGameLoop(currentFrameTime: number): void {
  const deltaTime = capFrameDelta((currentFrameTime - previousFrameTime) / 1000);

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
      asteroidRng,
    );

    const bonusResult = applyScoreBonuses(
      score,
      player,
      asteroids,
      bonusFeedbackText,
      bonusFeedbackTimeLeft,
      BONUS_FEEDBACK_DURATION,
    );
    score = bonusResult.score;
    bonusFeedbackText = bonusResult.bonusFeedbackText;
    bonusFeedbackTimeLeft = bonusResult.bonusFeedbackTimeLeft;

    updateAsteroids(asteroids, deltaTime);

    if (hasPlayerCollision(player, asteroids)) {
      gameStatus = "gameOver";
      bestScore = saveBestScore(score);
    } else {
      score = updateScore(score, deltaTime);

      const timerResult = updateBonusFeedbackTimer(bonusFeedbackText, bonusFeedbackTimeLeft, deltaTime);
      bonusFeedbackText = timerResult.bonusFeedbackText;
      bonusFeedbackTimeLeft = timerResult.bonusFeedbackTimeLeft;
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

  const freshState = createInitialGameState();
  player = freshState.player;
  asteroids.length = 0;
  asteroids.push(...freshState.asteroids);
  asteroidSpawnState = freshState.asteroidSpawnState;
  score = freshState.score;
  survivalTime = freshState.survivalTime;
  bonusFeedbackText = freshState.bonusFeedbackText;
  bonusFeedbackTimeLeft = freshState.bonusFeedbackTimeLeft;

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
