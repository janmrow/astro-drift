import "./style.css";

import { createLightMusicController as createBackgroundMusicController } from "./audio/lightMusicController";
import { capFrameDelta, createInputState } from "./game/engine";
import { formatScore, formatTime } from "./game/format";
import {
  advanceRunningGame,
  createInitialGameState,
  type GameState,
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
const radioStatusElement = getRequiredElement("[data-testid='radio-status']");

const context = getRequiredContext(canvas);
const canvasStyles = window.getComputedStyle(canvas);
const fontFamilies = {
  sans: canvasStyles.getPropertyValue("--font-sans").trim(),
  monospace: canvasStyles.getPropertyValue("--font-monospace").trim(),
};

const STAR_COUNT = 50;

const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const stars = createStars(STAR_COUNT);
const input = createInputState();
const backgroundMusic = createBackgroundMusicController();

let gameStatus: GameStatus = "idle";
let radioEnabled = true;
let previousFrameTime = performance.now();
let bestScore = readBestScore();

let gameState: GameState = createInitialGameState();

const resetKeyboardControls = setupKeyboardControls(input, {
  onGameAction: handleGameAction,
  onRadioToggle: handleRadioToggle,
});
document.addEventListener("visibilitychange", handleVisibilityChange);
window.addEventListener("pagehide", handlePageHide);
window.addEventListener("pageshow", handlePageShow);
requestAnimationFrame(runGameLoop);

function handleVisibilityChange(): void {
  if (document.visibilityState === "hidden" && gameStatus === "running") {
    persistBestScore();
  }

  syncAudioVisibility();
}

function handlePageHide(event: PageTransitionEvent): void {
  if (event.persisted) {
    void backgroundMusic.setPageVisible(false).catch(reportAudioFailure);
    return;
  }

  backgroundMusic.dispose();
}

function handlePageShow(event: PageTransitionEvent): void {
  if (event.persisted) {
    syncAudioVisibility();
  }
}

function syncAudioVisibility(): void {
  void backgroundMusic
    .setPageVisible(document.visibilityState !== "hidden")
    .catch(reportAudioFailure);
}

function persistBestScore(): void {
  bestScore = saveBestScore(gameState.score);
}

function runGameLoop(currentFrameTime: number): void {
  const deltaTime = capFrameDelta((currentFrameTime - previousFrameTime) / 1000);

  previousFrameTime = currentFrameTime;

  const ambientMotionSuppressed = prefersReducedMotion && gameStatus !== "running";

  updateStars(stars, ambientMotionSuppressed ? 0 : deltaTime, gameStatus);

  if (gameStatus === "running") {
    const result = advanceRunningGame(gameState, input, deltaTime, Math.random);
    gameState = result.gameState;

    if (result.collided) {
      gameStatus = "gameOver";
      backgroundMusic.setGameOverLevel();
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
    fontFamilies,
    radioEnabled,
  });
  updateDomStatus();

  requestAnimationFrame(runGameLoop);
}

function handleGameAction(): void {
  if (gameStatus === "idle") {
    startGame();
    startMusicFromUserGestureIfEnabled();
    return;
  }

  if (gameStatus === "gameOver") {
    restartGame();
    startMusicFromUserGestureIfEnabled();
  }
}

function handleRadioToggle(): void {
  radioEnabled = !radioEnabled;
  backgroundMusic.setRadioEnabled(radioEnabled);
  radioStatusElement.textContent = radioEnabled ? "Radio on" : "Radio off";

  if (radioEnabled && gameStatus === "running") {
    void backgroundMusic.startFromUserGesture().catch(reportAudioFailure);
  }
}

function startMusicFromUserGestureIfEnabled(): void {
  if (radioEnabled) {
    void backgroundMusic.startFromUserGesture().catch(reportAudioFailure);
  }
}

function reportAudioFailure(error: unknown): void {
  console.warn("Background music is unavailable; gameplay will continue silently.", error);
}

function startGame(): void {
  gameStatus = "running";
  backgroundMusic.setRunningLevel();
  previousFrameTime = performance.now();
}

function restartGame(): void {
  gameStatus = "running";
  backgroundMusic.setRunningLevel();
  gameState = createInitialGameState();
  resetKeyboardControls();
  previousFrameTime = performance.now();
}

let lastStatusText = "";

function updateDomStatus(): void {
  if (gameStatus !== lastStatusText) {
    statusElement.textContent = gameStatus;
    lastStatusText = gameStatus;
  }

  scoreElement.textContent = formatScore(gameState.score);
  timeElement.textContent = formatTime(gameState.survivalTime);
  asteroidCountElement.textContent = gameState.asteroids.length.toString();
}

function getRequiredContext(canvasElement: HTMLCanvasElement): CanvasRenderingContext2D {
  const context = canvasElement.getContext("2d");

  if (!context) {
    throw new Error("Canvas 2D context is not available.");
  }

  return context;
}

function getRequiredElement<ElementType extends HTMLElement = HTMLElement>(
  selector: string,
): ElementType {
  const element = document.querySelector<ElementType>(selector);

  if (!element) {
    throw new Error(`Required element was not found: ${selector}`);
  }

  return element;
}
