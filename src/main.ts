import "./style.css";

const GAME_WIDTH = 960;
const GAME_HEIGHT = 540;
const PLAYER_SPEED = 280;
const PLAYER_AREA_MAX_X = GAME_WIDTH * 0.4;

type Star = {
  x: number;
  y: number;
  radius: number;
  alpha: number;
};

type Player = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type InputState = {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
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
const player: Player = {
  x: 170,
  y: GAME_HEIGHT / 2,
  width: 58,
  height: 44,
};

let previousFrameTime = performance.now();

setupKeyboardControls(input);
requestAnimationFrame(runGameLoop);

function runGameLoop(currentFrameTime: number): void {
  const deltaTime = Math.min((currentFrameTime - previousFrameTime) / 1000, 0.033);

  previousFrameTime = currentFrameTime;

  updatePlayer(player, input, deltaTime);
  renderFrame(context, stars, player);

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

function createInputState(): InputState {
  return {
    up: false,
    down: false,
    left: false,
    right: false,
  };
}

function setupKeyboardControls(currentInput: InputState): void {
  window.addEventListener("keydown", (event) => {
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

function updatePlayer(currentPlayer: Player, currentInput: InputState, deltaTime: number): void {
  const directionX = Number(currentInput.right) - Number(currentInput.left);
  const directionY = Number(currentInput.down) - Number(currentInput.up);
  const directionLength = Math.hypot(directionX, directionY);

  if (directionLength === 0) {
    return;
  }

  const normalizedX = directionX / directionLength;
  const normalizedY = directionY / directionLength;

  currentPlayer.x = clamp(
    currentPlayer.x + normalizedX * PLAYER_SPEED * deltaTime,
    currentPlayer.width / 2 + 12,
    PLAYER_AREA_MAX_X,
  );

  currentPlayer.y = clamp(
    currentPlayer.y + normalizedY * PLAYER_SPEED * deltaTime,
    currentPlayer.height / 2 + 12,
    GAME_HEIGHT - currentPlayer.height / 2 - 12,
  );
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function renderFrame(
  ctx: CanvasRenderingContext2D,
  starField: Star[],
  currentPlayer: Player,
): void {
  drawBackground(ctx);
  drawStars(ctx, starField);
  drawPlayer(ctx, currentPlayer);
  drawStartText(ctx);
  drawPlayerAreaGuide(ctx);
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

function drawStartText(ctx: CanvasRenderingContext2D): void {
  ctx.fillStyle = "#f4f1ff";
  ctx.font = "700 34px system-ui, sans-serif";
  ctx.fillText("Use Arrow Keys / WASD", 430, 245);

  ctx.fillStyle = "#cfc8ef";
  ctx.font = "400 19px system-ui, sans-serif";
  ctx.fillText("Movement is live. Asteroids come next.", 432, 282);
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