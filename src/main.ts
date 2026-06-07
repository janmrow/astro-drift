import "./style.css";

const GAME_WIDTH = 960;
const GAME_HEIGHT = 540;
const PLAYER_SPEED = 280;
const PLAYER_AREA_MAX_X = GAME_WIDTH * 0.4;

const ASTEROID_SPAWN_INTERVAL = 1.15;
const ASTEROID_MIN_RADIUS = 18;
const ASTEROID_MAX_RADIUS = 42;
const ASTEROID_MIN_SPEED = 150;
const ASTEROID_MAX_SPEED = 230;
const ASTEROID_REMOVE_PADDING = 80;

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

type AsteroidPoint = {
  angle: number;
  distanceMultiplier: number;
};

type Asteroid = {
  id: string;
  x: number;
  y: number;
  radius: number;
  speed: number;
  rotation: number;
  rotationSpeed: number;
  points: AsteroidPoint[];
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

const asteroids: Asteroid[] = [];

let previousFrameTime = performance.now();
let asteroidSpawnTimer = 0;
let nextAsteroidId = 1;

setupKeyboardControls(input);
requestAnimationFrame(runGameLoop);

function runGameLoop(currentFrameTime: number): void {
  const deltaTime = Math.min((currentFrameTime - previousFrameTime) / 1000, 0.033);

  previousFrameTime = currentFrameTime;

  updatePlayer(player, input, deltaTime);
  asteroidSpawnTimer = updateAsteroidSpawning(asteroids, asteroidSpawnTimer, deltaTime);
  updateAsteroids(asteroids, deltaTime);

  renderFrame(context, stars, player, asteroids);

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

function updateAsteroidSpawning(
  currentAsteroids: Asteroid[],
  currentTimer: number,
  deltaTime: number,
): number {
  let nextTimer = currentTimer + deltaTime;

  while (nextTimer >= ASTEROID_SPAWN_INTERVAL) {
    currentAsteroids.push(createAsteroid());
    nextTimer -= ASTEROID_SPAWN_INTERVAL;
  }

  return nextTimer;
}

function createAsteroid(): Asteroid {
  const radius = randomBetween(ASTEROID_MIN_RADIUS, ASTEROID_MAX_RADIUS);

  return {
    id: `asteroid-${nextAsteroidId++}`,
    x: GAME_WIDTH + radius,
    y: randomBetween(radius + 16, GAME_HEIGHT - radius - 16),
    radius,
    speed: randomBetween(ASTEROID_MIN_SPEED, ASTEROID_MAX_SPEED),
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

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function randomBetween(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

function renderFrame(
  ctx: CanvasRenderingContext2D,
  starField: Star[],
  currentPlayer: Player,
  currentAsteroids: Asteroid[],
): void {
  drawBackground(ctx);
  drawStars(ctx, starField);
  drawPlayerAreaGuide(ctx);
  drawAsteroids(ctx, currentAsteroids);
  drawPlayer(ctx, currentPlayer);
  drawStatusText(ctx, currentAsteroids.length);
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

function drawStatusText(ctx: CanvasRenderingContext2D, asteroidCount: number): void {
  ctx.fillStyle = "#f4f1ff";
  ctx.font = "700 28px system-ui, sans-serif";
  ctx.fillText("Avoid the asteroids", 430, 64);

  ctx.fillStyle = "#cfc8ef";
  ctx.font = "400 17px system-ui, sans-serif";
  ctx.fillText(`Asteroids on screen: ${asteroidCount}`, 432, 96);
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