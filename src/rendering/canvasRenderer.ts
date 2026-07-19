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

const RUNNING_STAR_SPEED_MULTIPLIERS: Record<StarLayer, number> = {
  far: 1.25,
  near: 1.5,
};

const NEAR_STAR_RATIO = 0.3;

const HUD_PANEL = {
  x: 16,
  y: 16,
  width: 189,
  height: 68,
  cornerClip: 11,
  scoreX: 30,
  timeX: 124,
  labelBaseline: 42,
  valueBaseline: 69,
};

const IDLE_LOWER_STACK_SHIFT_Y = 48;

const PLAYER_SHIP = {
  impulseLength: 10,
  impulseHalfHeight: 2,
  impulseHullHalfHeight: 4,
};

const ASTEROID_SURFACE_LAYOUTS = [
  { rotation: 0, mirrorY: 1, craterCount: 2 },
  { rotation: (Math.PI * 2) / 3, mirrorY: -1, craterCount: 1 },
  { rotation: (-Math.PI * 2) / 3, mirrorY: 1, craterCount: 2 },
] as const;

type AsteroidSurfaceLayout = (typeof ASTEROID_SURFACE_LAYOUTS)[number];

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

export function updateStars(
  starField: Star[],
  deltaTime: number,
  currentStatus: GameStatus,
): void {
  for (const star of starField) {
    const speedMultiplier =
      currentStatus === "running" ? RUNNING_STAR_SPEED_MULTIPLIERS[star.layer] : 1;

    star.x -= star.speed * speedMultiplier * deltaTime;

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
  drawPlayer(ctx, currentPlayer, currentStatus);

  drawVignette(ctx);

  if (bonusFeedback) {
    drawBonusFeedback(
      ctx,
      bonusFeedback.text,
      currentPlayer,
      bonusFeedback.timeLeft,
      fontFamilies.monospace,
    );
  }

  switch (currentStatus) {
    case "idle":
      drawStartOverlay(ctx, fontFamilies);
      break;
    case "running":
      drawRunningHud(ctx, currentScore, currentSurvivalTime, fontFamilies.monospace);
      break;
    case "gameOver":
      drawGameOverOverlay(
        ctx,
        currentScore,
        currentSurvivalTime,
        currentBestScore,
        fontFamilies,
      );
      break;
    default:
      assertNever(currentStatus);
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

function drawPlayer(
  ctx: CanvasRenderingContext2D,
  currentPlayer: Player,
  currentStatus: GameStatus,
): void {
  const halfWidth = currentPlayer.width / 2;
  const halfHeight = currentPlayer.height / 2;

  ctx.save();
  ctx.translate(currentPlayer.x, currentPlayer.y);

  if (currentStatus === "running") {
    ctx.fillStyle = PALETTE.asteroidHeatBright;
    ctx.beginPath();
    ctx.moveTo(-halfWidth, -PLAYER_SHIP.impulseHullHalfHeight);
    ctx.lineTo(-halfWidth - PLAYER_SHIP.impulseLength, -PLAYER_SHIP.impulseHalfHeight);
    ctx.lineTo(-halfWidth - PLAYER_SHIP.impulseLength, PLAYER_SHIP.impulseHalfHeight);
    ctx.lineTo(-halfWidth, PLAYER_SHIP.impulseHullHalfHeight);
    ctx.closePath();
    ctx.fill();
  }

  ctx.fillStyle = PALETTE.playerHull;
  ctx.beginPath();
  ctx.moveTo(halfWidth, 0);
  ctx.bezierCurveTo(halfWidth - 7, -7, halfWidth - 18, -11, 5, -12);
  ctx.lineTo(-10, -23);
  ctx.quadraticCurveTo(-18, -halfHeight, -29, -20);
  ctx.lineTo(-25, -9);
  ctx.quadraticCurveTo(-33, -8, -halfWidth, -4);
  ctx.lineTo(-halfWidth, 4);
  ctx.quadraticCurveTo(-33, 8, -25, 9);
  ctx.lineTo(-29, 20);
  ctx.quadraticCurveTo(-18, halfHeight, -10, 23);
  ctx.lineTo(5, 12);
  ctx.bezierCurveTo(halfWidth - 18, 11, halfWidth - 7, 7, halfWidth, 0);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = PALETTE.playerShadow;
  ctx.beginPath();
  ctx.moveTo(halfWidth - 8, 0);
  ctx.bezierCurveTo(14, -6, -3, -8, -23, -6);
  ctx.quadraticCurveTo(-30, -3, -31, 0);
  ctx.quadraticCurveTo(-30, 3, -23, 6);
  ctx.bezierCurveTo(-3, 8, 14, 6, halfWidth - 8, 0);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = PALETTE.accentCopper;
  ctx.beginPath();
  ctx.arc(-13, -14, 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(-13, 14, 2, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = PALETTE.accentAmber;
  ctx.beginPath();
  ctx.ellipse(14, 0, 9, 6, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = PALETTE.playerHull;
  ctx.beginPath();
  ctx.ellipse(16, -2, 3, 1.5, -0.18, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
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

  buildAsteroidPath(ctx, asteroid);
  ctx.fillStyle = getAsteroidFill(asteroid.variant);
  ctx.fill();

  buildAsteroidPath(ctx, asteroid);
  ctx.clip();
  drawAsteroidSurface(ctx, asteroid);

  ctx.restore();
}

function buildAsteroidPath(ctx: CanvasRenderingContext2D, asteroid: Asteroid): void {
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
}

function getAsteroidFill(variant: AsteroidVariant): string {
  switch (variant) {
    case "fiery":
      return PALETTE.asteroidFiery;
    case "standard":
      return PALETTE.asteroidStandard;
    default:
      return assertNever(variant);
  }
}

function drawAsteroidSurface(ctx: CanvasRenderingContext2D, asteroid: Asteroid): void {
  const layout = selectAsteroidSurfaceLayout(asteroid);

  ctx.save();
  ctx.rotate(layout.rotation);
  ctx.scale(1, layout.mirrorY);

  switch (asteroid.variant) {
    case "fiery":
      drawFieryAsteroidSurface(ctx, asteroid.radius);
      break;
    case "standard":
      drawStandardAsteroidSurface(ctx, asteroid.radius, layout);
      break;
    default:
      assertNever(asteroid.variant);
  }

  ctx.restore();
}

function selectAsteroidSurfaceLayout(asteroid: Asteroid): AsteroidSurfaceLayout {
  let stableIdTotal = 0;
  let stablePointTotal = 0;

  for (const [index, character] of [...asteroid.id].entries()) {
    stableIdTotal += character.charCodeAt(0) * (index + 1);
  }

  for (const [index, point] of asteroid.points.entries()) {
    stablePointTotal += Math.round(point.distanceMultiplier * 100) * (index + 1);
  }

  const stableVariantOffset = asteroid.variant === "fiery" ? 1 : 0;
  const layoutIndex =
    (stableIdTotal +
      stablePointTotal +
      Math.round(asteroid.radius * 10) +
      stableVariantOffset) %
    ASTEROID_SURFACE_LAYOUTS.length;

  return ASTEROID_SURFACE_LAYOUTS[layoutIndex];
}

function drawStandardAsteroidSurface(
  ctx: CanvasRenderingContext2D,
  radius: number,
  layout: AsteroidSurfaceLayout,
): void {
  ctx.fillStyle = withAlpha(PALETTE.asteroidFacet, 0.52);
  ctx.beginPath();
  ctx.moveTo(-radius * 0.5, -radius * 0.16);
  ctx.lineTo(-radius * 0.1, -radius * 0.48);
  ctx.lineTo(radius * 0.16, -radius * 0.18);
  ctx.lineTo(-radius * 0.08, radius * 0.05);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = withAlpha(PALETTE.asteroidMark, 0.58);
  ctx.beginPath();
  ctx.ellipse(
    radius * 0.25,
    radius * 0.2,
    radius * 0.14,
    radius * 0.1,
    0.2,
    0,
    Math.PI * 2,
  );
  ctx.fill();

  if (layout.craterCount === 2) {
    ctx.beginPath();
    ctx.ellipse(
      -radius * 0.3,
      radius * 0.34,
      radius * 0.09,
      radius * 0.07,
      -0.25,
      0,
      Math.PI * 2,
    );
    ctx.fill();
  }
}

function drawFieryAsteroidSurface(ctx: CanvasRenderingContext2D, radius: number): void {
  ctx.fillStyle = withAlpha(PALETTE.asteroidHeat, 0.82);
  ctx.beginPath();
  ctx.moveTo(-radius * 0.04, -radius * 0.32);
  ctx.lineTo(radius * 0.45, -radius * 0.2);
  ctx.lineTo(radius * 0.78, radius * 0.08);
  ctx.lineTo(radius * 0.38, radius * 0.36);
  ctx.lineTo(radius * 0.02, radius * 0.24);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = PALETTE.asteroidHeatBright;
  ctx.beginPath();
  ctx.moveTo(radius * 0.34, -radius * 0.12);
  ctx.lineTo(radius * 0.62, radius * 0.05);
  ctx.lineTo(radius * 0.34, radius * 0.18);
  ctx.lineTo(radius * 0.17, radius * 0.02);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = withAlpha(PALETTE.asteroidMark, 0.7);
  ctx.beginPath();
  ctx.ellipse(
    -radius * 0.32,
    -radius * 0.18,
    radius * 0.13,
    radius * 0.1,
    -0.25,
    0,
    Math.PI * 2,
  );
  ctx.fill();
}

function drawRunningHud(
  ctx: CanvasRenderingContext2D,
  currentScore: number,
  currentSurvivalTime: number,
  fontFamily: string,
): void {
  const scoreText = formatScore(currentScore);
  const timeText = formatTime(currentSurvivalTime);

  ctx.save();
  ctx.textAlign = "left";

  ctx.fillStyle = withAlpha(PALETTE.hudPanel, 0.92);
  ctx.beginPath();
  ctx.moveTo(HUD_PANEL.x, HUD_PANEL.y);
  ctx.lineTo(HUD_PANEL.x + HUD_PANEL.width - HUD_PANEL.cornerClip, HUD_PANEL.y);
  ctx.lineTo(HUD_PANEL.x + HUD_PANEL.width, HUD_PANEL.y + HUD_PANEL.cornerClip);
  ctx.lineTo(HUD_PANEL.x + HUD_PANEL.width, HUD_PANEL.y + HUD_PANEL.height);
  ctx.lineTo(HUD_PANEL.x, HUD_PANEL.y + HUD_PANEL.height);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = PALETTE.accentCopper;
  ctx.font = fontStyle("hudLabel", fontFamily, 600);
  ctx.fillText("SCORE", HUD_PANEL.scoreX, HUD_PANEL.labelBaseline);
  ctx.fillText("TIME", HUD_PANEL.timeX, HUD_PANEL.labelBaseline);

  ctx.fillStyle = PALETTE.textPrimary;
  ctx.font = fontStyle("hudValue", fontFamily, 600);
  ctx.fillText(scoreText, HUD_PANEL.scoreX, HUD_PANEL.valueBaseline);
  ctx.fillText(timeText, HUD_PANEL.timeX, HUD_PANEL.valueBaseline);

  ctx.restore();
}

function drawStartOverlay(ctx: CanvasRenderingContext2D, fontFamilies: FontFamilies): void {
  ctx.save();
  ctx.fillStyle = withAlpha(PALETTE.stateScrim, 0.58);
  ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

  ctx.textAlign = "left";

  ctx.fillStyle = PALETTE.accentCopper;
  ctx.fillRect(166, 153, 70, 3);

  ctx.fillStyle = PALETTE.textPrimary;
  ctx.font = fontStyle("idleTitle", fontFamilies.sans, 560);
  ctx.fillText("Astro Drift", 166, 226);

  ctx.fillStyle = PALETTE.textMuted;
  ctx.font = fontStyle("body", fontFamilies.sans);
  ctx.fillText("Find a path through the twilight.", 169, 276 + IDLE_LOWER_STACK_SHIFT_Y);

  ctx.fillStyle = PALETTE.accentAmber;
  ctx.font = fontStyle("idleAction", fontFamilies.sans, 650);
  ctx.fillText("Press Enter to start", 169, 342 + IDLE_LOWER_STACK_SHIFT_Y);

  ctx.fillStyle = PALETTE.textMuted;
  ctx.font = fontStyle("controlHint", fontFamilies.monospace, 500);
  ctx.fillText("↑ / ↓ to steer", 171, 380 + IDLE_LOWER_STACK_SHIFT_Y);

  ctx.strokeStyle = PALETTE.lineMuted;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(720, 150);
  ctx.lineTo(792, 150);
  ctx.lineTo(814, 172);
  ctx.stroke();

  ctx.restore();
}

function drawGameOverOverlay(
  ctx: CanvasRenderingContext2D,
  finalScore: number,
  finalSurvivalTime: number,
  bestScore: number,
  fontFamilies: FontFamilies,
): void {
  ctx.save();
  ctx.fillStyle = withAlpha(PALETTE.stateScrim, 0.68);
  ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

  ctx.textAlign = "left";

  ctx.fillStyle = PALETTE.accentCopper;
  ctx.font = fontStyle("stateLabel", fontFamilies.monospace, 650);
  ctx.fillText("GAME OVER", 170, 129);

  ctx.fillStyle = PALETTE.textMuted;
  ctx.font = fontStyle("body", fontFamilies.sans, 450);
  ctx.fillText("Final score", 170, 179);

  ctx.fillStyle = PALETTE.accentAmber;
  ctx.font = fontStyle("gameOverScore", fontFamilies.monospace, 650);
  ctx.fillText(formatScore(finalScore), 164, 244);

  ctx.fillStyle = PALETTE.accentCopper;
  ctx.fillRect(170, 268, 360, 2);

  ctx.fillStyle = PALETTE.textMuted;
  ctx.font = fontStyle("stateData", fontFamilies.monospace, 500);
  ctx.fillText(`SURVIVAL TIME   ${formatTime(finalSurvivalTime)}`, 170, 308);

  ctx.fillStyle = PALETTE.textPrimary;
  ctx.font = fontStyle("stateBest", fontFamilies.monospace, 650);
  ctx.fillText(`BEST SCORE      ${formatScore(bestScore)}`, 170, 347);

  ctx.fillStyle = PALETTE.accentAmber;
  ctx.font = fontStyle("stateAction", fontFamilies.sans, 650);
  ctx.fillText("Press Enter to restart", 170, 414);

  ctx.restore();
}

const BONUS_FEEDBACK_RISE_DISTANCE = 18;
const BONUS_FEEDBACK_MIN_Y = HUD_PANEL.y + HUD_PANEL.height + 20;

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
  ctx.fillStyle = PALETTE.accentAmber;
  ctx.font = fontStyle("pointPopup", fontFamily, 700);
  ctx.fillText(text, x, y);
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
