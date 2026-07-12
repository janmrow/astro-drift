import { describe, expect, it } from "vitest";

import {
  ASTEROID_BASE_SPAWN_INTERVAL,
  ASTEROID_MIN_SPAWN_INTERVAL,
  ASTEROID_SPAWN_RAMP,
  ASTEROID_PASS_BONUS,
  FIERY_ASTEROID_PASS_BONUS,
  PLAYER_SPEED,
} from "../../src/game/balance";
import { getAsteroidSpawnInterval, updateAsteroids } from "../../src/game/asteroids";
import {
  GAME_HEIGHT,
  MAX_FRAME_DELTA_SECONDS,
  PLAYER_AREA_MAX_X,
  PLAYER_SCREEN_PADDING,
  collectPassBonuses,
  capFrameDelta,
  createInputState,
  createInitialPlayer,
  getPlayerHitbox,
  hasAsteroidPassedPlayer,
  hasPlayerCollision,
  isPlayerCollidingWithAsteroid,
  updatePlayer,
  updateScore,
} from "../../src/game/engine";
import type { InputState, Player } from "../../src/game/types";
import { createAsteroid } from "./helpers";

function idleInput(): InputState {
  return {
    up: false,
    down: false,
    left: false,
    right: false,
  };
}

describe("game engine", () => {
  describe("player movement", () => {
    it("creates the initial player in the player sector", () => {
      const player = createInitialPlayer();

      expect(player.x).toBeGreaterThan(0);
      expect(player.x).toBeLessThan(PLAYER_AREA_MAX_X);
      expect(player.y).toBe(GAME_HEIGHT / 2);
      expect(player.width).toBeGreaterThan(0);
      expect(player.height).toBeGreaterThan(0);
    });

    it("creates a neutral input state", () => {
      expect(createInputState()).toEqual(idleInput());
    });

    it("keeps the player still when there is no movement input", () => {
      const player = createInitialPlayer();

      const updatedPlayer = updatePlayer(player, idleInput(), 0.5);

      expect(updatedPlayer.x).toBe(player.x);
      expect(updatedPlayer.y).toBe(player.y);
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

    it("normalizes diagonal movement so it is not faster than straight movement", () => {
      const player = createInitialPlayer();
      const deltaTime = 0.5;
      const input: InputState = {
        ...idleInput(),
        right: true,
        up: true,
      };

      const updatedPlayer = updatePlayer(player, input, deltaTime);
      const expectedOffset = (PLAYER_SPEED * deltaTime) / Math.sqrt(2);

      expect(updatedPlayer.x).toBeCloseTo(player.x + expectedOffset);
      expect(updatedPlayer.y).toBeCloseTo(player.y - expectedOffset);
    });

    it("does not move the player when opposite horizontal inputs cancel out", () => {
      const player = createInitialPlayer();
      const input: InputState = {
        ...idleInput(),
        left: true,
        right: true,
      };

      const updatedPlayer = updatePlayer(player, input, 0.5);

      expect(updatedPlayer.x).toBe(player.x);
      expect(updatedPlayer.y).toBe(player.y);
    });

    it("keeps the player inside the right edge of the player sector", () => {
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

    it("keeps the player clamped when starting exactly on the right movement bound", () => {
      const player: Player = {
        ...createInitialPlayer(),
        x: PLAYER_AREA_MAX_X,
      };

      const input: InputState = {
        ...idleInput(),
        right: true,
      };

      const updatedPlayer = updatePlayer(player, input, 0.5);

      expect(updatedPlayer.x).toBe(PLAYER_AREA_MAX_X);
    });

    it("keeps the player inside the left edge of the screen", () => {
      const player: Player = {
        ...createInitialPlayer(),
        x: 14,
      };

      const input: InputState = {
        ...idleInput(),
        left: true,
      };

      const updatedPlayer = updatePlayer(player, input, 10);

      expect(updatedPlayer.x).toBe(player.width / 2 + PLAYER_SCREEN_PADDING);
    });

    it("keeps the player inside the top screen bound", () => {
      const player: Player = {
        ...createInitialPlayer(),
        y: 20,
      };

      const input: InputState = {
        ...idleInput(),
        up: true,
      };

      const updatedPlayer = updatePlayer(player, input, 10);

      expect(updatedPlayer.y).toBe(player.height / 2 + PLAYER_SCREEN_PADDING);
    });

    it("keeps the player inside the bottom screen bound", () => {
      const player: Player = {
        ...createInitialPlayer(),
        y: GAME_HEIGHT - 20,
      };

      const input: InputState = {
        ...idleInput(),
        down: true,
      };

      const updatedPlayer = updatePlayer(player, input, 10);

      expect(updatedPlayer.y).toBe(GAME_HEIGHT - player.height / 2 - PLAYER_SCREEN_PADDING);
    });

    it("keeps the player clamped when starting exactly on the bottom movement bound", () => {
      const player = createInitialPlayer();
      const bottomY = GAME_HEIGHT - player.height / 2 - PLAYER_SCREEN_PADDING;
      const input: InputState = {
        ...idleInput(),
        down: true,
      };

      const updatedPlayer = updatePlayer({ ...player, y: bottomY }, input, 0.5);

      expect(updatedPlayer.y).toBe(bottomY);
    });

    it("corrects an out-of-bounds player when movement is applied", () => {
      const player: Player = {
        ...createInitialPlayer(),
        x: PLAYER_AREA_MAX_X + 100,
        y: GAME_HEIGHT + 100,
      };
      const input: InputState = {
        ...idleInput(),
        right: true,
        down: true,
      };

      const updatedPlayer = updatePlayer(player, input, 0.1);

      expect(updatedPlayer.x).toBe(PLAYER_AREA_MAX_X);
      expect(updatedPlayer.y).toBe(GAME_HEIGHT - player.height / 2 - PLAYER_SCREEN_PADDING);
    });
  });

  describe("scoring and difficulty", () => {
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

    it("does not reduce asteroid spawn interval below the minimum", () => {
      expect(getAsteroidSpawnInterval(1_000)).toBe(ASTEROID_MIN_SPAWN_INTERVAL);
    });

    it("clamps asteroid spawn interval exactly at the minimum threshold", () => {
      const minimumThreshold =
        (ASTEROID_BASE_SPAWN_INTERVAL - ASTEROID_MIN_SPAWN_INTERVAL) / ASTEROID_SPAWN_RAMP;

      expect(getAsteroidSpawnInterval(minimumThreshold - 0.1)).toBeGreaterThan(
        ASTEROID_MIN_SPAWN_INTERVAL,
      );
      expect(getAsteroidSpawnInterval(minimumThreshold)).toBeCloseTo(ASTEROID_MIN_SPAWN_INTERVAL);
      expect(getAsteroidSpawnInterval(minimumThreshold + 0.1)).toBe(ASTEROID_MIN_SPAWN_INTERVAL);
    });
  });

  describe("collision detection", () => {
    it("detects collision between player and asteroid", () => {
      const player = createInitialPlayer();
      const asteroid = createAsteroid({
        x: player.x,
        y: player.y,
        radius: 28,
      });

      expect(hasPlayerCollision(player, [asteroid])).toBe(true);
    });

    it("detects collision when asteroid and player hitbox centers overlap", () => {
      const player = createInitialPlayer();
      const asteroid = createAsteroid({
        x: player.x,
        y: player.y,
        radius: 20,
      });

      expect(isPlayerCollidingWithAsteroid(player, asteroid)).toBe(true);
    });

    it("detects collision at the exact tangential asteroid hit radius", () => {
      const player = createInitialPlayer();
      const hitbox = getPlayerHitbox(player);
      const asteroidRadius = 50;
      const asteroidHitRadius = asteroidRadius * 0.82;
      const asteroid = createAsteroid({
        x: hitbox.right + asteroidHitRadius,
        y: player.y,
        radius: asteroidRadius,
      });

      expect(isPlayerCollidingWithAsteroid(player, asteroid)).toBe(true);
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

    it("does not detect collision when there are no asteroids", () => {
      expect(hasPlayerCollision(createInitialPlayer(), [])).toBe(false);
    });

    it("allows near misses around the drawn ship edges", () => {
      const player = createInitialPlayer();
      const hitbox = getPlayerHitbox(player);
      const asteroid = createAsteroid({
        x: player.x + player.width / 2 + 6,
        y: player.y,
        radius: 10,
      });

      expect(asteroid.x - asteroid.radius).toBeLessThan(player.x + player.width / 2);
      expect(asteroid.x).toBeGreaterThan(hitbox.right);
      expect(isPlayerCollidingWithAsteroid(player, asteroid)).toBe(false);
    });
  });

  describe("passed asteroid bonuses", () => {
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

    it("does not mark an asteroid as passed when its trailing edge is exactly aligned with the player", () => {
      const player = createInitialPlayer();
      const asteroid = createAsteroid({
        x: player.x - player.width / 2 - 20,
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

      const result = collectPassBonuses(100, player, [asteroid]);

      expect(result.score).toBe(100 + ASTEROID_PASS_BONUS);
      expect(result.asteroids[0].hasAwardedPassBonus).toBe(true);
      expect(asteroid.hasAwardedPassBonus).toBe(false);
    });

    it("adds the larger bonus score when a fiery asteroid passes the player", () => {
      const player = createInitialPlayer();
      const asteroid = createAsteroid({
        variant: "fiery",
        x: player.x - player.width / 2 - 40,
        radius: 20,
      });

      const result = collectPassBonuses(100, player, [asteroid]);

      expect(result.score).toBe(100 + FIERY_ASTEROID_PASS_BONUS);
      expect(result.asteroids[0].hasAwardedPassBonus).toBe(true);
      expect(asteroid.hasAwardedPassBonus).toBe(false);
    });

    it("adds bonus score for each newly passed asteroid", () => {
      const player = createInitialPlayer();
      const firstAsteroid = createAsteroid({
        id: "asteroid-first",
        x: player.x - player.width / 2 - 40,
        radius: 20,
      });
      const secondAsteroid = createAsteroid({
        id: "asteroid-second",
        variant: "fiery",
        x: player.x - player.width / 2 - 50,
        radius: 20,
      });

      const result = collectPassBonuses(100, player, [firstAsteroid, secondAsteroid]);

      expect(result.score).toBe(100 + ASTEROID_PASS_BONUS + FIERY_ASTEROID_PASS_BONUS);
      expect(result.asteroids[0].hasAwardedPassBonus).toBe(true);
      expect(result.asteroids[1].hasAwardedPassBonus).toBe(true);
      expect(firstAsteroid.hasAwardedPassBonus).toBe(false);
      expect(secondAsteroid.hasAwardedPassBonus).toBe(false);
    });

    it("does not mark asteroids as passed before they pass the player", () => {
      const player = createInitialPlayer();
      const asteroid = createAsteroid({
        x: player.x + 80,
        radius: 20,
      });

      const result = collectPassBonuses(100, player, [asteroid]);

      expect(result.score).toBe(100);
      expect(asteroid.hasAwardedPassBonus).toBe(false);
    });

    it("does not add pass bonus twice for the same asteroid", () => {
      const player = createInitialPlayer();
      const asteroid = createAsteroid({
        x: player.x - player.width / 2 - 40,
        radius: 20,
        hasAwardedPassBonus: true,
      });

      const result = collectPassBonuses(100, player, [asteroid]);

      expect(result.score).toBe(100);
    });

    it("still credits the bonus when a large frame delta would otherwise remove the asteroid in the same frame", () => {
      const player = createInitialPlayer();
      const playerLeftEdge = player.x - player.width / 2;
      // Just short of "passed" before this frame's movement, but fast/large enough
      // that a single frame's updateAsteroids would move it fully off screen.
      const asteroid = createAsteroid({
        x: playerLeftEdge - 21,
        radius: 20,
        speed: 5000,
      });
      const largeDeltaTime = 1;

      const bonusResult = collectPassBonuses(100, player, [asteroid]);
      const updatedAsteroids = updateAsteroids(bonusResult.asteroids, largeDeltaTime);

      expect(bonusResult.score).toBe(100 + ASTEROID_PASS_BONUS);
      expect(bonusResult.asteroids[0].hasAwardedPassBonus).toBe(true);
      expect(updatedAsteroids).toHaveLength(0);
      expect(asteroid.hasAwardedPassBonus).toBe(false);
    });
  });

  describe("frame delta cap", () => {
    it("passes short deltas through unchanged", () => {
      expect(capFrameDelta(0.016)).toBe(0.016);
    });

    it("caps long deltas at the maximum frame delta", () => {
      expect(capFrameDelta(1)).toBe(MAX_FRAME_DELTA_SECONDS);
    });

    it("does not cap a delta exactly at the maximum", () => {
      expect(capFrameDelta(MAX_FRAME_DELTA_SECONDS)).toBe(MAX_FRAME_DELTA_SECONDS);
    });
  });
});
