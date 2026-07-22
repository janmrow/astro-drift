export type GameStatus = "idle" | "running" | "gameOver";

export function assertNever(value: never): never {
  throw new Error(`Unhandled case: ${JSON.stringify(value)}`);
}

export type Player = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type PlayerHitbox = {
  left: number;
  right: number;
  top: number;
  bottom: number;
};

export type AsteroidPoint = {
  angle: number;
  distanceMultiplier: number;
};

export type AsteroidVariant = "standard" | "fiery";

export type Asteroid = {
  id: string;
  variant: AsteroidVariant;
  x: number;
  y: number;
  radius: number;
  speed: number;
  rotation: number;
  rotationSpeed: number;
  points: AsteroidPoint[];
  hasAwardedPassBonus: boolean;
};

export type InputState = {
  up: boolean;
  down: boolean;
  boost: boolean;
  brake: boolean;
};
