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
  PLAYER_AREA_MAX_X,
  createInitialPlayer,
  createInputState,
  formatScore,
  formatTime,
  getAsteroidSpawnInterval,
  hasPlayerCollision,
  updatePlayer,
  updateScore,
} from "./game/engine";
import type { Asteroid, AsteroidPoint, GameStatus, InputState, Player } from "./game/types";

type Star = {
  x: number;
  y: number;
  radius: number;
  alpha: number;
};

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

setupKeyboardControls(input);
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

function createStars(count: number): Star[] {
  return Array.from({ length: count }, () => ({
    x: Math.random() * GAME_WIDTH,
    y: Math.random() * GAME_HEIGHT,
    radius: Math.random() * 1.8 + 0.4,
    alpha: Math.random() * 0.7 + 0.25,
  }));
}

function setupKeyboardControls(currentInput: InputState): void {
  window.addEventListener("keydown", (event) => {
    if (gameStatus === "gameOver" && isRestartKey(event.key)) {
      restartGame();
      event.preventDefault();
      return;
    }

    updateInputFromKey(event.key, true, currentInput);

    if (isMovementKey(event.key)) {
      event.preventDefault();
    }
  });

  window.addEventListener("keyup", (event) => {
    updateInputFromKey(event.key, false, currentInput);

    if (isMovementKey(event.key)) {
      event.preventDefault();
    }
  });
}

function updateInputFromKey(key: string, isPressed: boolean, currentInput: InputState): void {
  switch (key.toLowerCase()) {
    case "arrowup":
    case "w":
      currentInput.up = isPressed;
      break;
    case "arrowdown":
    case "s":
      currentInput.down = isPressed;
      break;
    case "arrowleft":
    case "a":
      currentInput.left = isPressed;
      break;
    case "arrowright":
    case "d":
      currentInput.right = isPressed;
      break;
  }
}

function isMovementKey(key: string): boolean {
  return ["arrowup", "arrowdown", "arrowleft", "arrowright", "w", "a", "s", "d"].includes(
    key.toLowerCase(),
  );
}

function isRestartKey(key: string): boolean {
  return ["r", "enter", " "].includes(key.toLowerCase());
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

function renderFrame(
  ctx: CanvasRenderingContext2D,
  starField: Star[],
  currentPlayer: Player,
  currentAsteroids: Asteroid[],
  currentStatus: GameStatus,
  currentScore: number,
  currentSurvivalTime: number,
): void {
  drawBackground(ctx);
  drawStars(ctx, starField);
  drawPlayerAreaGuide(ctx);
  drawAsteroids(ctx, currentAsteroids);
  drawPlayer(ctx, currentPlayer);
  drawStatusText(ctx, currentStatus, currentAsteroids.length, currentScore, currentSurvivalTime);

  if (currentStatus === "gameOver") {
    drawGameOverOverlay(ctx, currentScore, currentSurvivalTime);
  }
}

function drawBackground(ctx: CanvasRenderingContext2D): void {
  const gradient = ctx.createLinearGradient(0, 0, GAME_WIDTH, GAME_HEIGHT);

  gradient.addColorStop(0, "#080814");
  gradient.addColorStop(0.5, "#11112a");
  gradient.addColorStop(1, "#050510");

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
}

function drawStars(ctx: CanvasRenderingContext2D, starField: Star[]): void {
  for (const star of starField) {
    ctx.beginPath();
    ctx.fillStyle = `rgba(244, 241, 255, ${star.alpha})`;
    ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawPlayer(ctx: CanvasRenderingContext2D, currentPlayer: Player): void {
  const noseX = currentPlayer.x + currentPlayer.width / 2;
  const tailX = currentPlayer.x - currentPlayer.width / 2;
  const centerY = currentPlayer.y;

  ctx.beginPath();
  ctx.moveTo(noseX, centerY);
  ctx.lineTo(tailX, centerY - currentPlayer.height / 2);
  ctx.lineTo(tailX + 12, centerY);
  ctx.lineTo(tailX, centerY + currentPlayer.height / 2);
  ctx.closePath();

  ctx.fillStyle = "#d9f7ff";
  ctx.fill();

  ctx.strokeStyle = "#9ee9ff";
  ctx.lineWidth = 3;
  ctx.stroke();

  ctx.beginPath();
  ctx.fillStyle = "#7a5cff";
  ctx.arc(currentPlayer.x - 6, centerY, 5, 0, Math.PI * 2);
  ctx.fill();
}

function drawAsteroids(ctx: CanvasRenderingContext2D, currentAsteroids: Asteroid[]): void {
  for (const asteroid of currentAsteroids) {
    drawAsteroid(ctx, asteroid);
  }
}

function drawAsteroid(ctx: CanvasRenderingContext2D, asteroid: Asteroid): void {
  ctx.save();
  ctx.translate(asteroid.x, asteroid.y);
  ctx.rotate(asteroid.rotation);

  ctx.beginPath();

  for (const [index, point] of asteroid.points.entries()) {
    const pointRadius = asteroid.radius * point.distanceMultiplier;
    const x = Math.cos(point.angle) * pointRadius;
    const y = Math.sin(point.angle) * pointRadius;

    if (index === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  }

  ctx.closePath();
  ctx.fillStyle = "#68617d";
  ctx.fill();

  ctx.strokeStyle = "#b8acd8";
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.restore();
}

function drawStatusText(
  ctx: CanvasRenderingContext2D,
  currentStatus: GameStatus,
  asteroidCount: number,
  currentScore: number,
  currentSurvivalTime: number,
): void {
  ctx.fillStyle = "rgba(5, 5, 16, 0.42)";
  ctx.fillRect(412, 32, 312, 116);

  ctx.strokeStyle = "rgba(158, 233, 255, 0.2)";
  ctx.lineWidth = 1;
  ctx.strokeRect(412, 32, 312, 116);

  ctx.fillStyle = "#f4f1ff";
  ctx.font = "700 24px system-ui, sans-serif";
  ctx.fillText(currentStatus === "gameOver" ? "Collision detected" : "Avoid the asteroids", 432, 64);

  ctx.fillStyle = "#9ee9ff";
  ctx.font = "700 20px system-ui, sans-serif";
  ctx.fillText(`Score: ${formatScore(currentScore)}`, 432, 98);

  ctx.fillStyle = "#cfc8ef";
  ctx.font = "400 15px system-ui, sans-serif";
  ctx.fillText(`Time: ${formatTime(currentSurvivalTime)}`, 432, 124);
  ctx.fillText(`Asteroids: ${asteroidCount}`, 548, 124);
}

function drawGameOverOverlay(
  ctx: CanvasRenderingContext2D,
  finalScore: number,
  finalSurvivalTime: number,
): void {
  ctx.fillStyle = "rgba(5, 5, 16, 0.76)";
  ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

  ctx.fillStyle = "#f4f1ff";
  ctx.font = "700 56px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("Game Over", GAME_WIDTH / 2, GAME_HEIGHT / 2 - 70);

  ctx.fillStyle = "#9ee9ff";
  ctx.font = "700 30px system-ui, sans-serif";
  ctx.fillText(`Final score: ${formatScore(finalScore)}`, GAME_WIDTH / 2, GAME_HEIGHT / 2 - 18);

  ctx.fillStyle = "#cfc8ef";
  ctx.font = "400 21px system-ui, sans-serif";
  ctx.fillText(`Survival time: ${formatTime(finalSurvivalTime)}`, GAME_WIDTH / 2, GAME_HEIGHT / 2 + 22);

  ctx.fillStyle = "#f4f1ff";
  ctx.font = "700 19px system-ui, sans-serif";
  ctx.fillText("Press R, Enter or Space to restart", GAME_WIDTH / 2, GAME_HEIGHT / 2 + 72);

  ctx.textAlign = "start";
}

function drawPlayerAreaGuide(ctx: CanvasRenderingContext2D): void {
  ctx.strokeStyle = "rgba(158, 233, 255, 0.16)";
  ctx.lineWidth = 2;
  ctx.setLineDash([8, 10]);
  ctx.beginPath();
  ctx.moveTo(PLAYER_AREA_MAX_X + 24, 36);
  ctx.lineTo(PLAYER_AREA_MAX_X + 24, GAME_HEIGHT - 36);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.fillStyle = "rgba(158, 233, 255, 0.52)";
  ctx.font = "600 14px system-ui, sans-serif";
  ctx.fillText("player sector", 48, GAME_HEIGHT - 32);
}