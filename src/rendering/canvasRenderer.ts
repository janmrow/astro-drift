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

const HUD_CORNER = {
  x: 24,
  scoreBaseline: 48,
  timeBaseline: 74,
};

const PLAYER_SECTOR_GUIDE = {
  xOffset: 24,
  verticalPadding: 36,
  labelX: 48,
  labelBaselineFromBottom: 32,
};

const PLAYER_SHIP = {
  hullNotchInset: 12,
  hullOutlineWidth: 3,
  hullShoulderXInset: 0.35,
  hullShoulderYInset: 0.32,
  cockpitXOffset: 6,
  cockpitRadius: 5,
};

// Colors for HUD/overlay elements that are out of scope for the palette
// redesign (see docs/VISUAL-STYLE-CONSTRAINTS.md) and stay unchanged here.
// text/mutedText resolve through PALETTE since those roles are shared with
// the rest of the redesign; the rest have no equivalent PALETTE role yet.
const UI_COLORS = {
  surfaceStrong: "rgba(7, 4, 23, 0.76)",
  text: PALETTE.textPrimary,
  mutedText: PALETTE.textMuted,
  cyan: "#7df9ff",
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
  bonusFeedbackFraction: number,
  frameTime: number,
  ambientMotionSuppressed = false,
): void {
  drawBackground(ctx);
  drawStars(ctx, starField);
  drawPlayerAreaGuide(ctx, frameTime, ambientMotionSuppressed);
  drawAsteroids(ctx, currentAsteroids);
  drawPlayer(ctx, currentPlayer, frameTime, ambientMotionSuppressed);
  drawScore(ctx, currentScore, currentSurvivalTime);

  if (bonusFeedbackText) {
    drawBonusFeedback(ctx, bonusFeedbackText, currentPlayer, bonusFeedbackFraction);
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

const HEX_COLOR_PATTERN = /^#[0-9a-fA-F]{6}$/;
const hexToRgbCache = new Map<string, [number, number, number]>();

function withAlpha(hex: string, alpha: number): string {
  let rgb = hexToRgbCache.get(hex);

  if (!rgb) {
    if (!HEX_COLOR_PATTERN.test(hex)) {
      throw new Error(`withAlpha expects a "#rrggbb" hex color, got "${hex}"`);
    }

    rgb = [
      Number.parseInt(hex.slice(1, 3), 16),
      Number.parseInt(hex.slice(3, 5), 16),
      Number.parseInt(hex.slice(5, 7), 16),
    ];
    hexToRgbCache.set(hex, rgb);
  }

  const [r, g, b] = rgb;

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

// High but not fully opaque, so the fill reads as a solid rock silhouette
// (matching the pre-redesign look) rather than a background-dependent tint.
const ASTEROID_FILL_ALPHA = 0.85;

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

function drawScore(ctx: CanvasRenderingContext2D, currentScore: number, currentSurvivalTime: number): void {
  const { x, scoreBaseline, timeBaseline } = HUD_CORNER;

  ctx.font = "700 24px system-ui, sans-serif";
  ctx.strokeStyle = PALETTE.backgroundBottom;
  ctx.lineWidth = 4;
  ctx.strokeText(formatScore(currentScore), x, scoreBaseline);
  ctx.fillStyle = PALETTE.textPrimary;
  ctx.fillText(formatScore(currentScore), x, scoreBaseline);

  ctx.font = "400 15px system-ui, sans-serif";
  ctx.strokeStyle = PALETTE.backgroundBottom;
  ctx.lineWidth = 3;
  ctx.strokeText(formatTime(currentSurvivalTime), x, timeBaseline);
  ctx.fillStyle = UI_COLORS.mutedText;
  ctx.fillText(formatTime(currentSurvivalTime), x, timeBaseline);
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

const PLAYER_SECTOR_GUIDE_LINE_ALPHA = 0.22;
const PLAYER_SECTOR_GUIDE_LABEL_ALPHA = 0.65;

function drawPlayerAreaGuide(
  ctx: CanvasRenderingContext2D,
  // No longer used now that the guide's pulse is gone; kept so the call site
  // in main.ts (out of scope for this PR) doesn't need to change.
  _frameTime: number,
  _ambientMotionSuppressed: boolean,
): void {
  const guideX = PLAYER_AREA_MAX_X + PLAYER_SECTOR_GUIDE.xOffset;

  ctx.strokeStyle = withAlpha(PALETTE.chrome, PLAYER_SECTOR_GUIDE_LINE_ALPHA);
  ctx.lineWidth = 2;
  ctx.setLineDash([8, 10]);
  ctx.beginPath();
  ctx.moveTo(guideX, PLAYER_SECTOR_GUIDE.verticalPadding);
  ctx.lineTo(guideX, GAME_HEIGHT - PLAYER_SECTOR_GUIDE.verticalPadding);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.fillStyle = withAlpha(PALETTE.chrome, PLAYER_SECTOR_GUIDE_LABEL_ALPHA);
  ctx.font = "600 14px system-ui, sans-serif";
  ctx.fillText(
    "player sector",
    PLAYER_SECTOR_GUIDE.labelX,
    GAME_HEIGHT - PLAYER_SECTOR_GUIDE.labelBaselineFromBottom,
  );
}

const BONUS_FEEDBACK_RISE_DISTANCE = 18;

function drawBonusFeedback(
  ctx: CanvasRenderingContext2D,
  text: string,
  currentPlayer: Player,
  feedbackFraction: number,
): void {
  const x = currentPlayer.x;
  const y = currentPlayer.y - currentPlayer.height - feedbackFraction * BONUS_FEEDBACK_RISE_DISTANCE;

  ctx.save();
  ctx.globalAlpha = feedbackFraction;
  ctx.fillStyle = UI_COLORS.amber;
  ctx.font = "700 11px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(text, x, y);
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
