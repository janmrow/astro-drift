import { describe, expect, it } from "vitest";

import { BONUS_FEEDBACK_DURATION, SCORE_PER_SECOND } from "../../src/game/balance";
import { createInitialPlayer, createInputState } from "../../src/game/engine";
import {
  advanceRunningGame,
  applyScoreBonuses,
  createInitialGameState,
  updateBonusFeedbackTimer,
} from "../../src/game/state";
import { createAsteroid } from "./helpers";

describe("createInitialGameState", () => {
  it("returns a clean, freshly-created state", () => {
    const state = createInitialGameState();

    expect(state).toEqual({
      player: createInitialPlayer(),
      asteroids: [],
      asteroidSpawnState: { timer: 0, nextId: 1 },
      score: 0,
      survivalTime: 0,
      bonusFeedbackText: null,
      bonusFeedbackTimeLeft: 0,
    });
  });

  it("returns independent asteroid arrays across calls", () => {
    const first = createInitialGameState();
    const second = createInitialGameState();

    first.asteroids.push(createAsteroid());

    expect(second.asteroids).toHaveLength(0);
  });
});

describe("applyScoreBonuses", () => {
  it("leaves score and feedback untouched when no asteroid has just passed", () => {
    const player = createInitialPlayer();
    const asteroids = [createAsteroid({ x: player.x + 500, hasAwardedPassBonus: false })];

    const result = applyScoreBonuses(100, player, asteroids, "+25", 0.2, BONUS_FEEDBACK_DURATION);

    expect(result).toEqual({
      score: 100,
      bonusFeedbackText: "+25",
      bonusFeedbackTimeLeft: 0.2,
    });
  });

  it("adds the bonus to the score and starts fresh feedback when an asteroid just passed", () => {
    const player = createInitialPlayer();
    const playerLeftEdge = player.x - player.width / 2;
    const asteroids = [createAsteroid({ x: playerLeftEdge - 31, hasAwardedPassBonus: false })];

    const result = applyScoreBonuses(100, player, asteroids, null, 0, BONUS_FEEDBACK_DURATION);

    expect(result.score).toBe(125);
    expect(result.bonusFeedbackText).toBe("+25");
    expect(result.bonusFeedbackTimeLeft).toBe(BONUS_FEEDBACK_DURATION);
    expect(asteroids[0].hasAwardedPassBonus).toBe(true);
  });
});

describe("updateBonusFeedbackTimer", () => {
  it("does nothing once the timer has already run out", () => {
    const result = updateBonusFeedbackTimer(null, 0, 0.5);

    expect(result).toEqual({ bonusFeedbackText: null, bonusFeedbackTimeLeft: 0 });
  });

  it("counts the timer down while keeping the feedback text", () => {
    const result = updateBonusFeedbackTimer("+25", 0.5, 0.2);

    expect(result).toEqual({ bonusFeedbackText: "+25", bonusFeedbackTimeLeft: 0.3 });
  });

  it("clamps the timer at zero and clears the feedback text once it elapses", () => {
    const result = updateBonusFeedbackTimer("+25", 0.2, 0.5);

    expect(result).toEqual({ bonusFeedbackText: null, bonusFeedbackTimeLeft: 0 });
  });
});

describe("advanceRunningGame", () => {
  it("increases survival time and score when nothing collides", () => {
    const gameState = createInitialGameState();
    const deltaTime = 0.1;

    const result = advanceRunningGame(gameState, createInputState(), deltaTime, () => 1, BONUS_FEEDBACK_DURATION);

    expect(result).toEqual({ collided: false });
    expect(gameState.survivalTime).toBeCloseTo(deltaTime);
    expect(gameState.score).toBeCloseTo(SCORE_PER_SECOND * deltaTime);
  });

  it("awards a pass bonus and reflects it in the bonus feedback text", () => {
    const gameState = createInitialGameState();
    const playerLeftEdge = gameState.player.x - gameState.player.width / 2;
    const passedAsteroid = createAsteroid({ x: playerLeftEdge - 31, hasAwardedPassBonus: false });
    gameState.asteroids.push(passedAsteroid);

    const result = advanceRunningGame(gameState, createInputState(), 0.1, () => 1, BONUS_FEEDBACK_DURATION);

    expect(result).toEqual({ collided: false });
    expect(gameState.bonusFeedbackText).toBe("+25");
    expect(gameState.bonusFeedbackTimeLeft).toBeCloseTo(BONUS_FEEDBACK_DURATION - 0.1);
    expect(passedAsteroid.hasAwardedPassBonus).toBe(true);
  });

  it("reports a collision and skips the time-based score/timer updates for that call", () => {
    const gameState = createInitialGameState();
    gameState.bonusFeedbackText = "+25";
    gameState.bonusFeedbackTimeLeft = 0.2;
    const collidingAsteroid = createAsteroid({
      x: gameState.player.x,
      y: gameState.player.y,
      radius: 30,
      hasAwardedPassBonus: false,
    });
    gameState.asteroids.push(collidingAsteroid);

    const result = advanceRunningGame(gameState, createInputState(), 0.1, () => 1, BONUS_FEEDBACK_DURATION);

    expect(result).toEqual({ collided: true });
    expect(gameState.score).toBe(0);
    expect(gameState.bonusFeedbackText).toBe("+25");
    expect(gameState.bonusFeedbackTimeLeft).toBe(0.2);
  });

  it("spawns asteroids once enough delta time has accumulated for a seeded rng", () => {
    const gameState = createInitialGameState();

    const result = advanceRunningGame(gameState, createInputState(), 1.5, () => 0.5, BONUS_FEEDBACK_DURATION);

    expect(result).toEqual({ collided: false });
    expect(gameState.asteroids.length).toBeGreaterThan(0);
    expect(gameState.asteroidSpawnState.nextId).toBeGreaterThan(1);
  });
});
