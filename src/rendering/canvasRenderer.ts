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
  speed: number;
  layer: StarLayer;
};

type StarLayer = "far" | "near";

const STAR_WRAP_PADDING = 4;

const STAR_LAYER_SETTINGS: Record<
  StarLayer,
  {
    radiusMin: number;
    radiusRange: number;
    alphaMin: number;
    alphaRange: number;
    speedMin: number;
    speedRange: number;
  }
> = {
  far: {
    radiusMin: 0.35,
    radiusRange: 1.1,
    alphaMin: 0.22,
    alphaRange: 0.42,
    speedMin: 7,
    speedRange: 10,
  },
  near: {
    radiusMin: 1.1,
    radiusRange: 1.45,
    alphaMin: 0.42,
    alphaRange: 0.42,
    speedMin: 22,
    speedRange: 18,
  },
};

const NEAR_STAR_RATIO = 0.32;

const HUD_PANEL = {
  x: 560,
  y: 32,
  width: 352,
  height: 124,
  padding: 20,
  statusBaseline: 32,
  labelBaseline: 64,
  scoreBaseline: 92,
  bestScoreBaseline: 91,
  detailsBaseline: 118,
  asteroidCountXOffset: 198,
};

const PLAYER_SECTOR_GUIDE = {
  xOffset: 24,
  verticalPadding: 36,
  labelX: 48,
  labelBaselineFromBottom: 32,
};

const BONUS_BADGE = {
  x: 860,
  y: 132,
  width: 36,
  height: 16,
};

const PALETTE = {
  backgroundTop: "#22103a",
  backgroundMid: "#29123a",
  backgroundBottom: "#10071f",
  surface: "rgba(7, 4, 23, 0.52)",
  surfaceStrong: "rgba(7, 4, 23, 0.76)",
  text: "#f6f0ff",
  mutedText: "#c9bfe8",
  cyan: "#7df9ff",
  cyanSoft: "rgba(125, 249, 255, 0.62)",
  cyanDim: "rgba(125, 249, 255, 0.18)",
  magenta: "#d83b86",
  magentaSoft: "rgba(216, 59, 134, 0.42)",
  amber: "#ffb86c",
  rust: "#a34a38",
  darkGold: "#b98b3f",
  asteroidFill: "#211936",
  asteroidStroke: "#78e6f0",
  fieryAsteroidFill: "#4b1723",
  fieryAsteroidStroke: "#ff6b45",
  fieryAsteroidGlow: "rgba(255, 91, 53, 0.38)",
};

export function createStars(count: number): Star[] {
  const nearStarStartIndex = Math.floor(count * (1 - NEAR_STAR_RATIO));

  return Array.from({ length: count }, (_, index) => {
    const layer: StarLayer = index >= nearStarStartIndex ? "near" : "far";
    const settings = STAR_LAYER_SETTINGS[layer];

    return {
      x: Math.random() * GAME_WIDTH,
      y: Math.random() * GAME_HEIGHT,
      radius: Math.random() * settings.radiusRange + settings.radiusMin,
      alpha: Math.random() * settings.alphaRange + settings.alphaMin,
      speed: Math.random() * settings.speedRange + settings.speedMin,
      layer,
    };
  });
}

export function updateStars(starField: Star[], deltaTime: number): void {
  for (const star of starField) {
    star.x -= star.speed * deltaTime;

    if (star.x < -STAR_WRAP_PADDING) {
      star.x = GAME_WIDTH + STAR_WRAP_PADDING;
      star.y = Math.random() * GAME_HEIGHT;
    }
  }
}

export function renderFrame(
  ctx: CanvasRenderingContext2D,
  starField: Star[],
  currentPlayer: Player,
  currentAsteroids: Asteroid[],
  currentStatus: GameStatus,
  currentScore: number,
  currentSurvivalTime: number,
  currentBestScore: number,
  bonusFeedbackText: string | null,
  frameTime: number,
  ambientMotionSuppressed = false,
): void {
  drawBackground(ctx);
  drawStars(ctx, starField);
  drawPlayerAreaGuide(ctx, frameTime, ambientMotionSuppressed);
  drawAsteroids(ctx, currentAsteroids);
  drawPlayer(ctx, currentPlayer, frameTime, ambientMotionSuppressed);
  drawStatusText(ctx, currentStatus, currentAsteroids.length, currentScore, currentSurvivalTime, currentBestScore);

  if (bonusFeedbackText) {
    drawBonusFeedback(ctx, bonusFeedbackText);
  }

  drawVignette(ctx);

  if (currentStatus === "idle") {
    drawStartOverlay(ctx);
  }

  if (currentStatus === "gameOver") {
    drawGameOverOverlay(ctx, currentScore, currentSurvivalTime, currentBestScore);
  }
}

function drawBackground(ctx: CanvasRenderingContext2D): void {
  const skyGradient = ctx.createLinearGradient(0, 0, 0, GAME_HEIGHT);

  skyGradient.addColorStop(0, PALETTE.backgroundTop);
  skyGradient.addColorStop(0.56, PALETTE.backgroundMid);
  skyGradient.addColorStop(1, PALETTE.backgroundBottom);

  ctx.fillStyle = skyGradient;
  ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
}

function drawStars(ctx: CanvasRenderingContext2D, starField: Star[]): void {
  for (const star of starField) {
    const alphaMultiplier = star.layer === "near" ? 0.86 : 0.64;

    ctx.beginPath();
    ctx.fillStyle = `rgba(246, 240, 255, ${star.alpha * alphaMultiplier})`;
    ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawPlayer(
  ctx: CanvasRenderingContext2D,
  currentPlayer: Player,
  frameTime: number,
  ambientMotionSuppressed: boolean,
): void {
  const noseX = currentPlayer.x + currentPlayer.width / 2;
  const tailX = currentPlayer.x - currentPlayer.width / 2;
  const centerY = currentPlayer.y;

  ctx.save();
  ctx.shadowColor = PALETTE.magentaSoft;
  ctx.shadowBlur = ambientMotionSuppressed ? 13 : getPulse(frameTime, 8, 18, 0.002);

  ctx.beginPath();
  ctx.moveTo(noseX, centerY);
  ctx.lineTo(tailX, centerY - currentPlayer.height / 2);
  ctx.lineTo(tailX + 12, centerY);
  ctx.lineTo(tailX, centerY + currentPlayer.height / 2);
  ctx.closePath();

  ctx.fillStyle = PALETTE.magenta;
  ctx.fill();

  ctx.shadowBlur = 4;
  ctx.strokeStyle = PALETTE.rust;
  ctx.lineWidth = 3;
  ctx.stroke();

  ctx.restore();

  ctx.beginPath();
  ctx.fillStyle = PALETTE.darkGold;
  ctx.arc(currentPlayer.x - 6, centerY, 5, 0, Math.PI * 2);
  ctx.fill();
}

function drawAsteroids(ctx: CanvasRenderingContext2D, currentAsteroids: Asteroid[]): void {
  for (const asteroid of currentAsteroids) {
    drawAsteroid(ctx, asteroid);
  }
}

function drawAsteroid(ctx: CanvasRenderingContext2D, asteroid: Asteroid): void {
  const asteroidStyle = getAsteroidStyle(asteroid);

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

  ctx.shadowColor = asteroidStyle.glow;
  ctx.shadowBlur = 12;
  ctx.fillStyle = asteroidStyle.fill;
  ctx.fill();

  ctx.strokeStyle = asteroidStyle.stroke;
  ctx.lineWidth = asteroid.variant === "fiery" ? 3 : 2;
  ctx.stroke();

  ctx.restore();
}

function getAsteroidStyle(asteroid: Asteroid): {
  fill: string;
  stroke: string;
  glow: string;
} {
  if (asteroid.variant === "fiery") {
    return {
      fill: PALETTE.fieryAsteroidFill,
      stroke: PALETTE.fieryAsteroidStroke,
      glow: PALETTE.fieryAsteroidGlow,
    };
  }

  return {
    fill: PALETTE.asteroidFill,
    stroke: PALETTE.asteroidStroke,
    glow: "rgba(125, 249, 255, 0.24)",
  };
}

function drawStatusText(
  ctx: CanvasRenderingContext2D,
  currentStatus: GameStatus,
  asteroidCount: number,
  currentScore: number,
  currentSurvivalTime: number,
  currentBestScore: number,
): void {
  const { x, y, width, height, padding } = HUD_PANEL;

  ctx.fillStyle = PALETTE.surface;
  ctx.fillRect(x, y, width, height);

  ctx.strokeStyle = PALETTE.cyanDim;
  ctx.lineWidth = 1;
  ctx.strokeRect(x, y, width, height);

  ctx.fillStyle = PALETTE.text;
  ctx.font = "700 24px system-ui, sans-serif";

  const statusText =
    currentStatus === "idle"
      ? "Ready to drift"
      : currentStatus === "gameOver"
        ? "Collision detected"
        : "Avoid the asteroids";

  ctx.fillText(statusText, x + padding, y + HUD_PANEL.statusBaseline);

  ctx.fillStyle = "rgba(201, 191, 232, 0.74)";
  ctx.font = "700 11px system-ui, sans-serif";
  ctx.fillText("SCORE", x + padding, y + HUD_PANEL.labelBaseline);
  ctx.textAlign = "right";
  ctx.fillText("BEST", x + width - padding, y + HUD_PANEL.labelBaseline);
  ctx.textAlign = "start";

  ctx.fillStyle = PALETTE.cyan;
  ctx.font = "700 24px system-ui, sans-serif";
  ctx.fillText(formatScore(currentScore), x + padding, y + HUD_PANEL.scoreBaseline);

  ctx.fillStyle = PALETTE.text;
  ctx.font = "700 18px system-ui, sans-serif";
  ctx.textAlign = "right";
  ctx.fillText(formatScore(currentBestScore), x + width - padding, y + HUD_PANEL.bestScoreBaseline);
  ctx.textAlign = "start";

  ctx.fillStyle = PALETTE.mutedText;
  ctx.font = "400 15px system-ui, sans-serif";
  ctx.fillText(`Time: ${formatTime(currentSurvivalTime)}`, x + padding, y + HUD_PANEL.detailsBaseline);
  ctx.fillText(
    `Asteroids: ${asteroidCount}`,
    x + HUD_PANEL.asteroidCountXOffset,
    y + HUD_PANEL.detailsBaseline,
  );
}

function drawStartOverlay(ctx: CanvasRenderingContext2D): void {
  ctx.fillStyle = "rgba(7, 4, 23, 0.68)";
  ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

  ctx.fillStyle = PALETTE.text;
  ctx.font = "700 58px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("Astro Drift", GAME_WIDTH / 2, GAME_HEIGHT / 2 - 74);

  ctx.fillStyle = PALETTE.mutedText;
  ctx.font = "400 22px system-ui, sans-serif";
  ctx.fillText("Avoid incoming asteroids and survive as long as possible.", GAME_WIDTH / 2, GAME_HEIGHT / 2 - 26);

  ctx.fillStyle = PALETTE.cyan;
  ctx.font = "700 21px system-ui, sans-serif";
  ctx.fillText("Press Enter or Space to start", GAME_WIDTH / 2, GAME_HEIGHT / 2 + 30);

  ctx.fillStyle = PALETTE.mutedText;
  ctx.font = "400 17px system-ui, sans-serif";
  ctx.fillText("Move with Arrow Keys or WASD", GAME_WIDTH / 2, GAME_HEIGHT / 2 + 68);

  ctx.textAlign = "start";
}

function drawGameOverOverlay(
  ctx: CanvasRenderingContext2D,
  finalScore: number,
  finalSurvivalTime: number,
  bestScore: number,
): void {
  ctx.fillStyle = PALETTE.surfaceStrong;
  ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

  ctx.fillStyle = PALETTE.text;
  ctx.font = "700 56px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("Game Over", GAME_WIDTH / 2, GAME_HEIGHT / 2 - 70);

  ctx.fillStyle = PALETTE.amber;
  ctx.font = "700 30px system-ui, sans-serif";
  ctx.fillText(`Final score: ${formatScore(finalScore)}`, GAME_WIDTH / 2, GAME_HEIGHT / 2 - 24);

  ctx.fillStyle = PALETTE.text;
  ctx.font = "700 22px system-ui, sans-serif";
  ctx.fillText(`Best score: ${formatScore(bestScore)}`, GAME_WIDTH / 2, GAME_HEIGHT / 2 + 14);

  ctx.fillStyle = PALETTE.mutedText;
  ctx.font = "400 21px system-ui, sans-serif";
  ctx.fillText(`Survival time: ${formatTime(finalSurvivalTime)}`, GAME_WIDTH / 2, GAME_HEIGHT / 2 + 50);

  ctx.fillStyle = PALETTE.text;
  ctx.font = "700 19px system-ui, sans-serif";
  ctx.fillText("Press R, Enter or Space to restart", GAME_WIDTH / 2, GAME_HEIGHT / 2 + 100);

  ctx.textAlign = "start";
}

function drawPlayerAreaGuide(
  ctx: CanvasRenderingContext2D,
  frameTime: number,
  ambientMotionSuppressed: boolean,
): void {
  const guideX = PLAYER_AREA_MAX_X + PLAYER_SECTOR_GUIDE.xOffset;
  const guideOpacity = ambientMotionSuppressed ? 0.22 : getPulse(frameTime, 0.14, 0.3, 0.0016);

  ctx.strokeStyle = `rgba(125, 249, 255, ${guideOpacity})`;
  ctx.lineWidth = 2;
  ctx.setLineDash([8, 10]);
  ctx.beginPath();
  ctx.moveTo(guideX, PLAYER_SECTOR_GUIDE.verticalPadding);
  ctx.lineTo(guideX, GAME_HEIGHT - PLAYER_SECTOR_GUIDE.verticalPadding);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.fillStyle = PALETTE.cyanSoft;
  ctx.font = "600 14px system-ui, sans-serif";
  ctx.fillText(
    "player sector",
    PLAYER_SECTOR_GUIDE.labelX,
    GAME_HEIGHT - PLAYER_SECTOR_GUIDE.labelBaselineFromBottom,
  );
}

function drawBonusFeedback(ctx: CanvasRenderingContext2D, text: string): void {
  ctx.fillStyle = "rgba(255, 184, 108, 0.12)";
  ctx.fillRect(BONUS_BADGE.x, BONUS_BADGE.y, BONUS_BADGE.width, BONUS_BADGE.height);

  ctx.strokeStyle = "rgba(255, 184, 108, 0.42)";
  ctx.lineWidth = 1;
  ctx.strokeRect(BONUS_BADGE.x, BONUS_BADGE.y, BONUS_BADGE.width, BONUS_BADGE.height);

  ctx.fillStyle = PALETTE.amber;
  ctx.font = "700 11px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(text, BONUS_BADGE.x + BONUS_BADGE.width / 2, BONUS_BADGE.y + 12);
  ctx.textAlign = "start";
}

function drawVignette(ctx: CanvasRenderingContext2D): void {
  const vignette = ctx.createRadialGradient(
    GAME_WIDTH / 2,
    GAME_HEIGHT / 2,
    GAME_WIDTH * 0.24,
    GAME_WIDTH / 2,
    GAME_HEIGHT / 2,
    GAME_WIDTH * 0.72,
  );

  vignette.addColorStop(0, "rgba(0, 0, 0, 0)");
  vignette.addColorStop(0.72, "rgba(8, 3, 20, 0.14)");
  vignette.addColorStop(1, "rgba(4, 1, 12, 0.42)");

  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
}

function getPulse(frameTime: number, min: number, max: number, speed: number): number {
  const midpoint = (min + max) / 2;
  const amplitude = (max - min) / 2;

  return midpoint + Math.sin(frameTime * speed) * amplitude;
}
