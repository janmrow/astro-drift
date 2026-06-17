import { describe, expect, it } from "vitest";

import {
  ASTEROID_BASE_SPAWN_INTERVAL,
  ASTEROID_MIN_SPAWN_INTERVAL,
  ASTEROID_PASS_BONUS,
  GAME_HEIGHT,
  PLAYER_AREA_MAX_X,
  applyPassedAsteroidBonuses,
  createInitialPlayer,
  formatScore,
  formatTime,
  getAsteroidSpawnInterval,
  hasAsteroidPassedPlayer,
  hasPlayerCollision,
  updatePlayer,
  updateScore,
} from "../../src/game/engine";
import type { Asteroid, InputState, Player } from "../../src/game/types";

function idleInput(): InputState {
  return {
    up: false,
    down: false,
    left: false,
    right: false,
  };
}

function createAsteroid(overrides: Partial<Asteroid> = {}): Asteroid {
  return {
    id: "asteroid-test",
    x: 500,
    y: 250,
    radius: 30,
    speed: 180,
    rotation: 0,
    rotationSpeed: 0,
    points: [],
    passed: false,
    ...overrides,
  };
}

describe("game engine", () => {
  it("creates the initial player in the player sector", () => {
    const player = createInitialPlayer();

    expect(player.x).toBeGreaterThan(0);
    expect(player.x).toBeLessThan(PLAYER_AREA_MAX_X);
    expect(player.y).toBe(GAME_HEIGHT / 2);
    expect(player.width).toBeGreaterThan(0);
    expect(player.height).toBeGreaterThan(0);
  });

  it("moves the player according to input", () => {
    const player = createInitialPlayer();
    const input: InputState = {
      ...idleInput(),
      right: true,
    };

    const updatedPlayer = updatePlayer(player, input, 0.5);

    expect(updatedPlayer.x).toBeGreaterThan(player.x);
    expect(updatedPlayer.y).toBe(player.y);
  });

  it("keeps the player inside the left gameplay sector", () => {
    const player: Player = {
      ...createInitialPlayer(),
      x: PLAYER_AREA_MAX_X - 2,
    };

    const input: InputState = {
      ...idleInput(),
      right: true,
    };

    const updatedPlayer = updatePlayer(player, input, 10);

    expect(updatedPlayer.x).toBe(PLAYER_AREA_MAX_X);
  });

  it("keeps the player inside the vertical screen bounds", () => {
    const player = createInitialPlayer();

    const input: InputState = {
      ...idleInput(),
      down: true,
    };

    const updatedPlayer = updatePlayer(player, input, 10);

    expect(updatedPlayer.y).toBeLessThan(GAME_HEIGHT);
  });

  it("increases score over time", () => {
    const updatedScore = updateScore(20, 2);

    expect(updatedScore).toBe(40);
  });

  it("reduces asteroid spawn interval as survival time grows", () => {
    const earlyInterval = getAsteroidSpawnInterval(0);
    const laterInterval = getAsteroidSpawnInterval(60);

    expect(earlyInterval).toBe(ASTEROID_BASE_SPAWN_INTERVAL);
    expect(laterInterval).toBeLessThan(earlyInterval);
    expect(laterInterval).toBeGreaterThanOrEqual(ASTEROID_MIN_SPAWN_INTERVAL);
  });

  it("detects collision between player and asteroid", () => {
    const player = createInitialPlayer();
    const asteroid = createAsteroid({
      x: player.x,
      y: player.y,
      radius: 28,
    });

    expect(hasPlayerCollision(player, [asteroid])).toBe(true);
  });

  it("does not detect collision when asteroid is far away", () => {
    const player = createInitialPlayer();
    const asteroid = createAsteroid({
      x: player.x + 300,
      y: player.y + 200,
      radius: 20,
    });

    expect(hasPlayerCollision(player, [asteroid])).toBe(false);
  });

  it("formats score as a five digit value", () => {
    expect(formatScore(7.9)).toBe("00007");
    expect(formatScore(123)).toBe("00123");
  });

  it("formats survival time in seconds", () => {
    expect(formatTime(12.9)).toBe("12s");
  });
  
  it("detects when an asteroid has passed the player", () => {
    const player = createInitialPlayer();
    const asteroid = createAsteroid({
      x: player.x - player.width / 2 - 40,
      radius: 20,
    });

    expect(hasAsteroidPassedPlayer(player, asteroid)).toBe(true);
  });

  it("does not mark an asteroid as passed while it is still in front of the player", () => {
    const player = createInitialPlayer();
    const asteroid = createAsteroid({
      x: player.x + 80,
      radius: 20,
    });

    expect(hasAsteroidPassedPlayer(player, asteroid)).toBe(false);
  });

  it("adds bonus score when an asteroid passes the player", () => {
    const player = createInitialPlayer();
    const asteroid = createAsteroid({
      x: player.x - player.width / 2 - 40,
      radius: 20,
    });

    const updatedScore = applyPassedAsteroidBonuses(100, player, [asteroid]);

    expect(updatedScore).toBe(100 + ASTEROID_PASS_BONUS);
    expect(asteroid.passed).toBe(true);
  });

  it("does not add pass bonus twice for the same asteroid", () => {
    const player = createInitialPlayer();
    const asteroid = createAsteroid({
      x: player.x - player.width / 2 - 40,
      radius: 20,
      passed: true,
    });

    const updatedScore = applyPassedAsteroidBonuses(100, player, [asteroid]);

    expect(updatedScore).toBe(100);
  });
});