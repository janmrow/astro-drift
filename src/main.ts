import "./style.css";

const GAME_WIDTH = 960;
const GAME_HEIGHT = 540;

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

const context = canvas.getContext("2d");

if (!context) {
  throw new Error("Canvas 2D context is not available.");
}

const stars = createStars(90);

renderStartScreen(context, stars);

function createStars(count: number): Star[] {
  return Array.from({ length: count }, () => ({
    x: Math.random() * GAME_WIDTH,
    y: Math.random() * GAME_HEIGHT,
    radius: Math.random() * 1.8 + 0.4,
    alpha: Math.random() * 0.7 + 0.25,
  }));
}

function renderStartScreen(ctx: CanvasRenderingContext2D, starField: Star[]): void {
  drawBackground(ctx);
  drawStars(ctx, starField);
  drawPreviewShip(ctx);
  drawStartText(ctx);
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

function drawPreviewShip(ctx: CanvasRenderingContext2D): void {
  const shipX = 180;
  const shipY = GAME_HEIGHT / 2;

  ctx.beginPath();
  ctx.moveTo(shipX + 34, shipY);
  ctx.lineTo(shipX - 24, shipY - 22);
  ctx.lineTo(shipX - 14, shipY);
  ctx.lineTo(shipX - 24, shipY + 22);
  ctx.closePath();

  ctx.fillStyle = "#d9f7ff";
  ctx.fill();

  ctx.strokeStyle = "#9ee9ff";
  ctx.lineWidth = 3;
  ctx.stroke();
}

function drawStartText(ctx: CanvasRenderingContext2D): void {
  ctx.fillStyle = "#f4f1ff";
  ctx.font = "700 48px system-ui, sans-serif";
  ctx.fillText("Astro Drift", 320, 245);

  ctx.fillStyle = "#cfc8ef";
  ctx.font = "400 22px system-ui, sans-serif";
  ctx.fillText("A small retro arcade QA/SDET lab.", 322, 285);

  ctx.fillStyle = "#9ee9ff";
  ctx.font = "700 18px system-ui, sans-serif";
  ctx.fillText("Canvas shell ready", 322, 330);
}