import { BONUS_FEEDBACK_DURATION } from "../game/balance";
import { GAME_HEIGHT, GAME_WIDTH } from "../game/engine";
import { formatScore, formatTime } from "../game/format";
import type { BonusFeedback } from "../game/state";
import {
  assertNever,
  type Asteroid,
  type AsteroidVariant,
  type GameStatus,
  type Player,
} from "../game/types";
import { fontStyle, PALETTE, type FontFamilies } from "./theme";

export type Star = {
  x: number;
  y: number;
  radius: number;
  alpha: number;
  speed: number;
  layer: StarLayer;
};

type StarLayer = "far" | "near";

export type RenderFrameInput = {
  context: CanvasRenderingContext2D;
  stars: Star[];
  player: Player;
  asteroids: Asteroid[];
  status: GameStatus;
  score: number;
  survivalTime: number;
  bestScore: number;
  bonusFeedback: BonusFeedback;
  fontFamilies: FontFamilies;
};

const STAR_WRAP_PADDING = 4;

const STAR_LAYER_SETTINGS: Record<
  StarLayer,
  {
    radiusMin: number;
    radiusRange: number;
    alpha: number;
    speedMin: number;
    speedRange: number;
  }
> = {
  far: {
    radiusMin: 0.55,
    radiusRange: 0.65,
    alpha: 0.48,
    speedMin: 18,
    speedRange: 12,
  },
  near: {
    radiusMin: 1.3,
    radiusRange: 0.7,
    alpha: 0.82,
    speedMin: 55,
    speedRange: 30,
  },
};

const NEAR_STAR_RATIO = 0.3;

const HUD_CORNER = {
  x: 24,
  scoreBaseline: 48,
  timeBaseline: 74,
};

const PLAYER_SHIP = {
  hullNotchInset: 12,
  hullOutlineWidth: 3,
  hullShoulderXInset: 0.35,
  hullShoulderYInset: 0.32,
  cockpitXOffset: 6,
  cockpitRadius: 5,
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
      alpha: settings.alpha,
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

export function renderFrame({
  context: ctx,
  stars: starField,
  player: currentPlayer,
  asteroids: currentAsteroids,
  status: currentStatus,
  score: currentScore,
  survivalTime: currentSurvivalTime,
  bestScore: currentBestScore,
  bonusFeedback,
  fontFamilies,
}: RenderFrameInput): void {
  drawBackground(ctx);
  drawStars(ctx, starField);
  drawAsteroids(ctx, currentAsteroids);
  drawPlayer(ctx, currentPlayer);
  drawScore(ctx, currentScore, currentSurvivalTime, fontFamilies.monospace);

  if (bonusFeedback) {
    drawBonusFeedback(
      ctx,
      bonusFeedback.text,
      currentPlayer,
      bonusFeedback.timeLeft,
      fontFamilies.monospace,
    );
  }

  drawVignette(ctx);

  if (currentStatus === "idle") {
    drawStartOverlay(ctx, fontFamilies);
  }

  if (currentStatus === "gameOver") {
    drawGameOverOverlay(
      ctx,
      currentScore,
      currentSurvivalTime,
      currentBestScore,
      fontFamilies,
    );
  }
}

// Static geometry and colors, so this is built once on first use and reused
// every frame rather than recreated per frame.
let backgroundGradient: CanvasGradient | null = null;

function drawBackground(ctx: CanvasRenderingContext2D): void {
  if (!backgroundGradient) {
    backgroundGradient = ctx.createLinearGradient(0, 0, 0, GAME_HEIGHT);
    backgroundGradient.addColorStop(0, PALETTE.backgroundTop);
    backgroundGradient.addColorStop(0.55, PALETTE.backgroundMid);
    backgroundGradient.addColorStop(1, PALETTE.backgroundBottom);
  }

  ctx.fillStyle = backgroundGradient;
  ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
}

function drawStars(ctx: CanvasRenderingContext2D, starField: Star[]): void {
  for (const star of starField) {
    const baseColor = star.layer === "near" ? PALETTE.starNear : PALETTE.starFar;

    ctx.beginPath();
    ctx.fillStyle = withAlpha(baseColor, star.alpha);
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

function drawPlayer(ctx: CanvasRenderingContext2D, currentPlayer: Player): void {
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

  ctx.fillStyle = PALETTE.playerHull;
  ctx.fill();

  ctx.strokeStyle = PALETTE.playerShadow;
  ctx.lineWidth = PLAYER_SHIP.hullOutlineWidth;
  ctx.stroke();

  ctx.beginPath();
  ctx.fillStyle = PALETTE.accentAmber;
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
        fill: withAlpha(PALETTE.asteroidFiery, ASTEROID_FILL_ALPHA),
        stroke: PALETTE.asteroidHeat,
      };
    case "standard":
      return {
        fill: withAlpha(PALETTE.asteroidStandard, ASTEROID_FILL_ALPHA),
        stroke: PALETTE.asteroidFacet,
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

function drawScore(
  ctx: CanvasRenderingContext2D,
  currentScore: number,
  currentSurvivalTime: number,
  fontFamily: string,
): void {
  const { x, scoreBaseline, timeBaseline } = HUD_CORNER;

  const scoreText = formatScore(currentScore);
  const timeText = formatTime(currentSurvivalTime);

  drawOutlinedText(
    ctx,
    scoreText,
    x,
    scoreBaseline,
    fontStyle("md", fontFamily, 700),
    4,
    PALETTE.textPrimary,
  );
  drawOutlinedText(
    ctx,
    timeText,
    x,
    timeBaseline,
    fontStyle("sm", fontFamily),
    3,
    PALETTE.textMuted,
  );
}

function drawStartOverlay(ctx: CanvasRenderingContext2D, fontFamilies: FontFamilies): void {
  ctx.fillStyle = "rgba(7, 4, 23, 0.68)";
  ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

  ctx.save();
  ctx.textAlign = "center";

  ctx.fillStyle = PALETTE.textPrimary;
  ctx.font = fontStyle("xxl", fontFamilies.sans, 700);
  ctx.fillText("Astro Drift", GAME_WIDTH / 2, GAME_HEIGHT / 2 - 74);

  ctx.fillStyle = PALETTE.textMuted;
  ctx.font = fontStyle("md", fontFamilies.sans);
  ctx.fillText("Avoid incoming asteroids and survive as long as possible.", GAME_WIDTH / 2, GAME_HEIGHT / 2 - 26);

  ctx.fillStyle = PALETTE.accentAmber;
  ctx.font = fontStyle("md", fontFamilies.sans, 700);
  ctx.fillText("Press Enter to start", GAME_WIDTH / 2, GAME_HEIGHT / 2 + 30);

  ctx.fillStyle = PALETTE.textMuted;
  ctx.font = fontStyle("sm", fontFamilies.monospace);
  ctx.fillText("Move with Arrow Up / Arrow Down", GAME_WIDTH / 2, GAME_HEIGHT / 2 + 68);

  ctx.restore();
}

function drawGameOverOverlay(
  ctx: CanvasRenderingContext2D,
  finalScore: number,
  finalSurvivalTime: number,
  bestScore: number,
  fontFamilies: FontFamilies,
): void {
  ctx.fillStyle = "rgba(7, 4, 23, 0.76)";
  ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

  ctx.save();
  ctx.textAlign = "center";

  ctx.fillStyle = PALETTE.textPrimary;
  ctx.font = fontStyle("xxl", fontFamilies.sans, 700);
  ctx.fillText("Game Over", GAME_WIDTH / 2, GAME_HEIGHT / 2 - 70);

  ctx.fillStyle = PALETTE.accentAmber;
  ctx.font = fontStyle("lg", fontFamilies.monospace, 700);
  ctx.fillText(`Final score: ${formatScore(finalScore)}`, GAME_WIDTH / 2, GAME_HEIGHT / 2 - 24);

  ctx.fillStyle = PALETTE.textPrimary;
  ctx.font = fontStyle("md", fontFamilies.monospace, 700);
  ctx.fillText(`Best score: ${formatScore(bestScore)}`, GAME_WIDTH / 2, GAME_HEIGHT / 2 + 14);

  ctx.fillStyle = PALETTE.textMuted;
  ctx.font = fontStyle("md", fontFamilies.monospace);
  ctx.fillText(`Survival time: ${formatTime(finalSurvivalTime)}`, GAME_WIDTH / 2, GAME_HEIGHT / 2 + 50);

  ctx.fillStyle = PALETTE.textPrimary;
  ctx.font = fontStyle("md", fontFamilies.sans, 700);
  ctx.fillText("Press Enter to restart", GAME_WIDTH / 2, GAME_HEIGHT / 2 + 100);

  ctx.restore();
}

const BONUS_FEEDBACK_RISE_DISTANCE = 18;
// Keeps the popup clear of the HUD corner text when the player is near the
// top-left of the play area.
const BONUS_FEEDBACK_MIN_Y = HUD_CORNER.timeBaseline + 16;

function drawBonusFeedback(
  ctx: CanvasRenderingContext2D,
  text: string,
  currentPlayer: Player,
  feedbackTimeLeft: number,
  fontFamily: string,
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
  drawOutlinedText(
    ctx,
    text,
    x,
    y,
    fontStyle("xs", fontFamily, 700),
    2,
    PALETTE.accentAmber,
  );
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
      125,
      GAME_WIDTH / 2,
      GAME_HEIGHT / 2,
      550,
    );

    vignetteGradient.addColorStop(0, withAlpha(PALETTE.vignette, 0));
    vignetteGradient.addColorStop(1, withAlpha(PALETTE.vignette, 0.34));
  }

  ctx.fillStyle = vignetteGradient;
  ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
}
