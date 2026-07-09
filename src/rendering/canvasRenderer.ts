import { BONUS_FEEDBACK_DURATION } from "../game/balance";
import { GAME_HEIGHT, GAME_WIDTH, PLAYER_AREA_MAX_X } from "../game/engine";
import { formatScore, formatTime } from "../game/format";
import {
  assertNever,
  type Asteroid,
  type AsteroidVariant,
  type GameStatus,
  type Player,
} from "../game/types";
import { fontStyle, PALETTE } from "./theme";

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

const HUD_SCRIM = {
  centerX: 110,
  centerY: 50,
  radius: 140,
  // Beyond this fraction of the radius the gradient has already faded to
  // near-transparent, so the fill only needs to cover up to here.
  visibleExtent: 0.8,
};

const PLAYER_SECTOR_GUIDE = {
  xOffset: 24,
  verticalPadding: 36,
};

const PLAYER_SHIP = {
  hullNotchInset: 12,
  hullOutlineWidth: 3,
  hullShoulderXInset: 0.35,
  hullShoulderYInset: 0.32,
  cockpitXOffset: 6,
  cockpitRadius: 5,
};

// Colors for HUD/overlay elements with no equivalent PALETTE role yet.
// text/mutedText resolve through PALETTE since those roles are shared with
// the rest of the redesign. Reward-related text uses PALETTE.reward directly
// instead of a UI_COLORS entry.
const UI_COLORS = {
  surfaceStrong: "rgba(7, 4, 23, 0.76)",
  text: PALETTE.textPrimary,
  mutedText: PALETTE.textMuted,
  cyan: "#7df9ff",
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
  bonusFeedbackTimeLeft: number,
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
    drawBonusFeedback(ctx, bonusFeedbackText, currentPlayer, bonusFeedbackTimeLeft);
  }

  drawVignette(ctx);

  if (currentStatus === "idle") {
    drawStartOverlay(ctx);
  }

  if (currentStatus === "gameOver") {
    drawGameOverOverlay(ctx, currentScore, currentSurvivalTime, currentBestScore);
  }
}

// Static geometry and colors, so this is built once on first use and reused
// every frame rather than recreated per frame.
let backgroundGradient: CanvasGradient | null = null;

function drawBackground(ctx: CanvasRenderingContext2D): void {
  if (!backgroundGradient) {
    backgroundGradient = ctx.createLinearGradient(0, 0, 0, GAME_HEIGHT);
    backgroundGradient.addColorStop(0, PALETTE.backgroundTop);
    backgroundGradient.addColorStop(0.56, PALETTE.backgroundMid);
    backgroundGradient.addColorStop(1, PALETTE.backgroundBottom);
  }

  ctx.fillStyle = backgroundGradient;
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

// Draws text with a solid-color outline so it stays legible over the
// starfield/asteroids, without a background panel.
function drawOutlinedText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  font: string,
  lineWidth: number,
  fillColor: string,
): void {
  ctx.font = font;
  ctx.strokeStyle = PALETTE.backgroundBottom;
  ctx.lineWidth = lineWidth;
  ctx.strokeText(text, x, y);
  ctx.fillStyle = fillColor;
  ctx.fillText(text, x, y);
}

// Static position, so the gradient is built once on first use and reused
// every frame rather than recreated per frame (see the gradient cost note in
// docs/VISUAL-STYLE-CONSTRAINTS.md).
let hudScrimGradient: CanvasGradient | null = null;

function drawScore(ctx: CanvasRenderingContext2D, currentScore: number, currentSurvivalTime: number): void {
  const { x, scoreBaseline, timeBaseline } = HUD_CORNER;

  if (!hudScrimGradient) {
    hudScrimGradient = ctx.createRadialGradient(
      HUD_SCRIM.centerX,
      HUD_SCRIM.centerY,
      0,
      HUD_SCRIM.centerX,
      HUD_SCRIM.centerY,
      HUD_SCRIM.radius,
    );
    hudScrimGradient.addColorStop(0, withAlpha(PALETTE.backgroundBottom, 0.55));
    hudScrimGradient.addColorStop(1, withAlpha(PALETTE.backgroundBottom, 0));
  }

  ctx.fillStyle = hudScrimGradient;
  ctx.fillRect(
    0,
    0,
    HUD_SCRIM.centerX + HUD_SCRIM.radius * HUD_SCRIM.visibleExtent,
    HUD_SCRIM.centerY + HUD_SCRIM.radius * HUD_SCRIM.visibleExtent,
  );

  const scoreText = formatScore(currentScore);
  const timeText = formatTime(currentSurvivalTime);

  drawOutlinedText(ctx, scoreText, x, scoreBaseline, fontStyle("md", 700), 4, UI_COLORS.text);
  drawOutlinedText(ctx, timeText, x, timeBaseline, fontStyle("sm"), 3, UI_COLORS.mutedText);
}

function drawStartOverlay(ctx: CanvasRenderingContext2D): void {
  ctx.fillStyle = "rgba(7, 4, 23, 0.68)";
  ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

  ctx.save();
  ctx.textAlign = "center";

  ctx.fillStyle = UI_COLORS.text;
  ctx.font = fontStyle("xxl", 700);
  ctx.fillText("Astro Drift", GAME_WIDTH / 2, GAME_HEIGHT / 2 - 74);

  ctx.fillStyle = UI_COLORS.mutedText;
  ctx.font = fontStyle("md");
  ctx.fillText("Avoid incoming asteroids and survive as long as possible.", GAME_WIDTH / 2, GAME_HEIGHT / 2 - 26);

  ctx.fillStyle = UI_COLORS.cyan;
  ctx.font = fontStyle("md", 700);
  ctx.fillText("Press Enter or Space to start", GAME_WIDTH / 2, GAME_HEIGHT / 2 + 30);

  ctx.fillStyle = UI_COLORS.mutedText;
  ctx.font = fontStyle("sm");
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
  ctx.font = fontStyle("xxl", 700);
  ctx.fillText("Game Over", GAME_WIDTH / 2, GAME_HEIGHT / 2 - 70);

  ctx.fillStyle = PALETTE.reward;
  ctx.font = fontStyle("lg", 700);
  ctx.fillText(`Final score: ${formatScore(finalScore)}`, GAME_WIDTH / 2, GAME_HEIGHT / 2 - 24);

  ctx.fillStyle = UI_COLORS.text;
  ctx.font = fontStyle("md", 700);
  ctx.fillText(`Best score: ${formatScore(bestScore)}`, GAME_WIDTH / 2, GAME_HEIGHT / 2 + 14);

  ctx.fillStyle = UI_COLORS.mutedText;
  ctx.font = fontStyle("md");
  ctx.fillText(`Survival time: ${formatTime(finalSurvivalTime)}`, GAME_WIDTH / 2, GAME_HEIGHT / 2 + 50);

  ctx.fillStyle = UI_COLORS.text;
  ctx.font = fontStyle("md", 700);
  ctx.fillText("Press R, Enter or Space to restart", GAME_WIDTH / 2, GAME_HEIGHT / 2 + 100);

  ctx.restore();
}

const PLAYER_SECTOR_GUIDE_LINE_ALPHA = 0.22;

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
}

const BONUS_FEEDBACK_RISE_DISTANCE = 18;
// Keeps the popup clear of the HUD corner text/scrim when the player is near
// the top-left of the play area.
const BONUS_FEEDBACK_MIN_Y = HUD_CORNER.timeBaseline + 16;

function drawBonusFeedback(
  ctx: CanvasRenderingContext2D,
  text: string,
  currentPlayer: Player,
  feedbackTimeLeft: number,
): void {
  const feedbackFraction = Math.max(0, Math.min(1, feedbackTimeLeft / BONUS_FEEDBACK_DURATION));
  const elapsedFraction = 1 - feedbackFraction;
  const x = currentPlayer.x;
  const y = Math.max(
    BONUS_FEEDBACK_MIN_Y,
    currentPlayer.y - currentPlayer.height - elapsedFraction * BONUS_FEEDBACK_RISE_DISTANCE,
  );

  ctx.save();
  ctx.globalAlpha = feedbackFraction;
  ctx.textAlign = "center";
  drawOutlinedText(ctx, text, x, y, fontStyle("xs", 700), 2, PALETTE.reward);
  ctx.restore();
}

// Static geometry and colors, so this is built once on first use and reused
// every frame rather than recreated per frame.
let vignetteGradient: CanvasGradient | null = null;

function drawVignette(ctx: CanvasRenderingContext2D): void {
  if (!vignetteGradient) {
    vignetteGradient = ctx.createRadialGradient(
      GAME_WIDTH / 2,
      GAME_HEIGHT / 2,
      GAME_WIDTH * 0.24,
      GAME_WIDTH / 2,
      GAME_HEIGHT / 2,
      GAME_WIDTH * 0.72,
    );

    vignetteGradient.addColorStop(0, "rgba(0, 0, 0, 0)");
    vignetteGradient.addColorStop(0.72, "rgba(8, 3, 20, 0.14)");
    vignetteGradient.addColorStop(1, "rgba(4, 1, 12, 0.42)");
  }

  ctx.fillStyle = vignetteGradient;
  ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
}
