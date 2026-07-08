import { GAME_HEIGHT, GAME_WIDTH, PLAYER_AREA_MAX_X } from "../game/engine";
import { formatScore, formatTime } from "../game/format";
import {
  assertNever,
  type Asteroid,
  type AsteroidVariant,
  type GameStatus,
  type Player,
} from "../game/types";
import { PALETTE } from "./theme";

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

const HUD_SCORE_BASELINE = 92;
// Best-score uses a smaller font than score, so it needs a 1px nudge to look
// baseline-aligned with it.
const HUD_BEST_SCORE_BASELINE_OFFSET = 1;

const HUD_PANEL = {
  x: 560,
  y: 32,
  width: 352,
  height: 124,
  padding: 20,
  statusBaseline: 32,
  labelBaseline: 64,
  scoreBaseline: HUD_SCORE_BASELINE,
  bestScoreBaseline: HUD_SCORE_BASELINE - HUD_BEST_SCORE_BASELINE_OFFSET,
  detailsBaseline: 118,
  asteroidCountXOffset: 198,
};

const PLAYER_SECTOR_GUIDE = {
  xOffset: 24,
  verticalPadding: 36,
  labelX: 48,
  labelBaselineFromBottom: 32,
};

const STATUS_TEXT: Record<GameStatus, string> = {
  idle: "Ready to drift",
  running: "Avoid the asteroids",
  gameOver: "Collision detected",
};

const PLAYER_SHIP = {
  hullNotchInset: 12,
  hullOutlineWidth: 3,
  hullShoulderXInset: 0.35,
  hullShoulderYInset: 0.32,
  cockpitXOffset: 6,
  cockpitRadius: 5,
};

const BONUS_BADGE = {
  x: 860,
  y: 132,
  width: 36,
  height: 16,
};

// Colors for HUD/overlay elements that are out of scope for the PR1 palette
// redesign (see docs/VISUAL-STYLE-CONSTRAINTS.md) and stay unchanged here.
const UI_COLORS = {
  surface: "rgba(7, 4, 23, 0.52)",
  surfaceStrong: "rgba(7, 4, 23, 0.76)",
  text: "#f6f0ff",
  mutedText: "#c9bfe8",
  cyan: "#7df9ff",
  cyanDim: "rgba(125, 249, 255, 0.18)",
  amber: "#ffb86c",
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
    const baseColor = star.layer === "near" ? PALETTE.starCool : PALETTE.starWarm;

    ctx.beginPath();
    ctx.fillStyle = withAlpha(baseColor, star.alpha * alphaMultiplier);
    ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
    ctx.fill();
  }
}

function withAlpha(hex: string, alpha: number): string {
  const r = Number.parseInt(hex.slice(1, 3), 16);
  const g = Number.parseInt(hex.slice(3, 5), 16);
  const b = Number.parseInt(hex.slice(5, 7), 16);

  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function drawPlayer(
  ctx: CanvasRenderingContext2D,
  currentPlayer: Player,
  // No longer used now that the glow pulse is gone; kept so the call site in
  // main.ts (out of scope for this PR) doesn't need to change.
  _frameTime: number,
  _ambientMotionSuppressed: boolean,
): void {
  const noseX = currentPlayer.x + currentPlayer.width / 2;
  const tailX = currentPlayer.x - currentPlayer.width / 2;
  const centerY = currentPlayer.y;
  const shoulderX = noseX - currentPlayer.width * PLAYER_SHIP.hullShoulderXInset;
  const shoulderYOffset = currentPlayer.height * PLAYER_SHIP.hullShoulderYInset;

  ctx.beginPath();
  ctx.moveTo(noseX, centerY);
  ctx.lineTo(shoulderX, centerY - shoulderYOffset);
  ctx.lineTo(tailX, centerY - currentPlayer.height / 2);
  ctx.lineTo(tailX + PLAYER_SHIP.hullNotchInset, centerY);
  ctx.lineTo(tailX, centerY + currentPlayer.height / 2);
  ctx.lineTo(shoulderX, centerY + shoulderYOffset);
  ctx.closePath();

  ctx.fillStyle = PALETTE.playerAccent;
  ctx.fill();

  ctx.strokeStyle = PALETTE.playerAccentDark;
  ctx.lineWidth = PLAYER_SHIP.hullOutlineWidth;
  ctx.stroke();

  ctx.beginPath();
  ctx.fillStyle = PALETTE.playerAccentDark;
  ctx.arc(currentPlayer.x - PLAYER_SHIP.cockpitXOffset, centerY, PLAYER_SHIP.cockpitRadius, 0, Math.PI * 2);
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

  ctx.fillStyle = asteroidStyle.fill;
  ctx.fill();

  ctx.strokeStyle = asteroidStyle.stroke;
  ctx.lineWidth = getAsteroidStrokeWidth(asteroid.variant);
  ctx.stroke();

  ctx.restore();
}

const ASTEROID_FILL_ALPHA = 0.28;

function getAsteroidStyle(asteroid: Asteroid): {
  fill: string;
  stroke: string;
} {
  switch (asteroid.variant) {
    case "fiery":
      return {
        fill: withAlpha(PALETTE.hazardEscalated, ASTEROID_FILL_ALPHA),
        stroke: PALETTE.hazardEscalated,
      };
    case "standard":
      return {
        fill: withAlpha(PALETTE.hazardStandard, ASTEROID_FILL_ALPHA),
        stroke: PALETTE.hazardStandard,
      };
    default:
      return assertNever(asteroid.variant);
  }
}

function getAsteroidStrokeWidth(variant: AsteroidVariant): number {
  switch (variant) {
    case "fiery":
      return 3;
    case "standard":
      return 2;
    default:
      return assertNever(variant);
  }
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

  ctx.fillStyle = UI_COLORS.surface;
  ctx.fillRect(x, y, width, height);

  ctx.strokeStyle = UI_COLORS.cyanDim;
  ctx.lineWidth = 1;
  ctx.strokeRect(x, y, width, height);

  ctx.fillStyle = UI_COLORS.text;
  ctx.font = "700 24px system-ui, sans-serif";

  ctx.fillText(STATUS_TEXT[currentStatus], x + padding, y + HUD_PANEL.statusBaseline);

  ctx.fillStyle = "rgba(201, 191, 232, 0.74)";
  ctx.font = "700 11px system-ui, sans-serif";
  ctx.fillText("SCORE", x + padding, y + HUD_PANEL.labelBaseline);
  ctx.textAlign = "right";
  ctx.fillText("BEST", x + width - padding, y + HUD_PANEL.labelBaseline);
  ctx.textAlign = "start";

  ctx.fillStyle = UI_COLORS.cyan;
  ctx.font = "700 24px system-ui, sans-serif";
  ctx.fillText(formatScore(currentScore), x + padding, y + HUD_PANEL.scoreBaseline);

  ctx.fillStyle = UI_COLORS.text;
  ctx.font = "700 18px system-ui, sans-serif";
  ctx.textAlign = "right";
  ctx.fillText(formatScore(currentBestScore), x + width - padding, y + HUD_PANEL.bestScoreBaseline);
  ctx.textAlign = "start";

  ctx.fillStyle = UI_COLORS.mutedText;
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

  ctx.save();
  ctx.textAlign = "center";

  ctx.fillStyle = UI_COLORS.text;
  ctx.font = "700 58px system-ui, sans-serif";
  ctx.fillText("Astro Drift", GAME_WIDTH / 2, GAME_HEIGHT / 2 - 74);

  ctx.fillStyle = UI_COLORS.mutedText;
  ctx.font = "400 22px system-ui, sans-serif";
  ctx.fillText("Avoid incoming asteroids and survive as long as possible.", GAME_WIDTH / 2, GAME_HEIGHT / 2 - 26);

  ctx.fillStyle = UI_COLORS.cyan;
  ctx.font = "700 21px system-ui, sans-serif";
  ctx.fillText("Press Enter or Space to start", GAME_WIDTH / 2, GAME_HEIGHT / 2 + 30);

  ctx.fillStyle = UI_COLORS.mutedText;
  ctx.font = "400 17px system-ui, sans-serif";
  ctx.fillText("Move with Arrow Keys or WASD", GAME_WIDTH / 2, GAME_HEIGHT / 2 + 68);

  ctx.restore();
}

function drawGameOverOverlay(
  ctx: CanvasRenderingContext2D,
  finalScore: number,
  finalSurvivalTime: number,
  bestScore: number,
): void {
  ctx.fillStyle = UI_COLORS.surfaceStrong;
  ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

  ctx.save();
  ctx.textAlign = "center";

  ctx.fillStyle = UI_COLORS.text;
  ctx.font = "700 56px system-ui, sans-serif";
  ctx.fillText("Game Over", GAME_WIDTH / 2, GAME_HEIGHT / 2 - 70);

  ctx.fillStyle = UI_COLORS.amber;
  ctx.font = "700 30px system-ui, sans-serif";
  ctx.fillText(`Final score: ${formatScore(finalScore)}`, GAME_WIDTH / 2, GAME_HEIGHT / 2 - 24);

  ctx.fillStyle = UI_COLORS.text;
  ctx.font = "700 22px system-ui, sans-serif";
  ctx.fillText(`Best score: ${formatScore(bestScore)}`, GAME_WIDTH / 2, GAME_HEIGHT / 2 + 14);

  ctx.fillStyle = UI_COLORS.mutedText;
  ctx.font = "400 21px system-ui, sans-serif";
  ctx.fillText(`Survival time: ${formatTime(finalSurvivalTime)}`, GAME_WIDTH / 2, GAME_HEIGHT / 2 + 50);

  ctx.fillStyle = UI_COLORS.text;
  ctx.font = "700 19px system-ui, sans-serif";
  ctx.fillText("Press R, Enter or Space to restart", GAME_WIDTH / 2, GAME_HEIGHT / 2 + 100);

  ctx.restore();
}

const PLAYER_SECTOR_GUIDE_ALPHA = 0.22;

function drawPlayerAreaGuide(
  ctx: CanvasRenderingContext2D,
  // No longer used now that the guide's pulse is gone; kept so the call site
  // in main.ts (out of scope for this PR) doesn't need to change.
  _frameTime: number,
  _ambientMotionSuppressed: boolean,
): void {
  const guideX = PLAYER_AREA_MAX_X + PLAYER_SECTOR_GUIDE.xOffset;

  ctx.strokeStyle = withAlpha(PALETTE.chrome, PLAYER_SECTOR_GUIDE_ALPHA);
  ctx.lineWidth = 2;
  ctx.setLineDash([8, 10]);
  ctx.beginPath();
  ctx.moveTo(guideX, PLAYER_SECTOR_GUIDE.verticalPadding);
  ctx.lineTo(guideX, GAME_HEIGHT - PLAYER_SECTOR_GUIDE.verticalPadding);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.fillStyle = PALETTE.chrome;
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

  ctx.save();
  ctx.fillStyle = UI_COLORS.amber;
  ctx.font = "700 11px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(text, BONUS_BADGE.x + BONUS_BADGE.width / 2, BONUS_BADGE.y + 12);
  ctx.restore();
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
