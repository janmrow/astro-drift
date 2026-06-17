import {
  GAME_HEIGHT,
  GAME_WIDTH,
  PLAYER_AREA_MAX_X,
  formatScore,
  formatTime,
} from "../game/engine";
import type { Asteroid, GameStatus, Player } from "../game/types";

export type Star = {
  x: number;
  y: number;
  radius: number;
  alpha: number;
};

export function createStars(count: number): Star[] {
  return Array.from({ length: count }, () => ({
    x: Math.random() * GAME_WIDTH,
    y: Math.random() * GAME_HEIGHT,
    radius: Math.random() * 1.8 + 0.4,
    alpha: Math.random() * 0.7 + 0.25,
  }));
}

export function renderFrame(
  ctx: CanvasRenderingContext2D,
  starField: Star[],
  currentPlayer: Player,
  currentAsteroids: Asteroid[],
  currentStatus: GameStatus,
  currentScore: number,
  currentSurvivalTime: number,
  bonusFeedbackText: string | null,
): void {
  drawBackground(ctx);
  drawStars(ctx, starField);
  drawPlayerAreaGuide(ctx);
  drawAsteroids(ctx, currentAsteroids);
  drawPlayer(ctx, currentPlayer);
  drawStatusText(ctx, currentStatus, currentAsteroids.length, currentScore, currentSurvivalTime);

  if (bonusFeedbackText) {
    drawBonusFeedback(ctx, bonusFeedbackText);
  }

  if (currentStatus === "idle") {
    drawStartOverlay(ctx);
  }

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

  const statusText =
    currentStatus === "idle"
      ? "Ready to drift"
      : currentStatus === "gameOver"
        ? "Collision detected"
        : "Avoid the asteroids";

  ctx.fillText(statusText, 432, 64);

  ctx.fillStyle = "#9ee9ff";
  ctx.font = "700 20px system-ui, sans-serif";
  ctx.fillText(`Score: ${formatScore(currentScore)}`, 432, 98);

  ctx.fillStyle = "#cfc8ef";
  ctx.font = "400 15px system-ui, sans-serif";
  ctx.fillText(`Time: ${formatTime(currentSurvivalTime)}`, 432, 124);
  ctx.fillText(`Asteroids: ${asteroidCount}`, 548, 124);
}

function drawStartOverlay(ctx: CanvasRenderingContext2D): void {
  ctx.fillStyle = "rgba(5, 5, 16, 0.68)";
  ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

  ctx.fillStyle = "#f4f1ff";
  ctx.font = "700 58px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("Astro Drift", GAME_WIDTH / 2, GAME_HEIGHT / 2 - 74);

  ctx.fillStyle = "#cfc8ef";
  ctx.font = "400 22px system-ui, sans-serif";
  ctx.fillText("Avoid incoming asteroids and survive as long as possible.", GAME_WIDTH / 2, GAME_HEIGHT / 2 - 26);

  ctx.fillStyle = "#9ee9ff";
  ctx.font = "700 21px system-ui, sans-serif";
  ctx.fillText("Press Enter or Space to start", GAME_WIDTH / 2, GAME_HEIGHT / 2 + 30);

  ctx.fillStyle = "#cfc8ef";
  ctx.font = "400 17px system-ui, sans-serif";
  ctx.fillText("Move with Arrow Keys or WASD", GAME_WIDTH / 2, GAME_HEIGHT / 2 + 68);

  ctx.textAlign = "start";
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

function drawBonusFeedback(ctx: CanvasRenderingContext2D, text: string): void {
  ctx.fillStyle = "#9ee9ff";
  ctx.font = "700 22px system-ui, sans-serif";
  ctx.fillText(text, 650, 100);
}