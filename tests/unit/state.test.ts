import { describe, expect, it } from "vitest";

import {
  ASTEROID_INITIAL_SPAWN_TIMER,
  BONUS_FEEDBACK_DURATION,
  PLAYER_SPEED,
} from "../../src/game/balance";
import { createInitialPlayer, createInputState } from "../../src/game/engine";
import {
  advanceRunningGame,
  applyScoreBonuses,
  createInitialGameState,
  updateBonusFeedbackTimer,
} from "../../src/game/state";
import { createAsteroid } from "./helpers";

const MAX_RANDOM_SAMPLE = 1 - Number.EPSILON;

describe("createInitialGameState", () => {
  it("returns a clean, freshly-created state", () => {
    const state = createInitialGameState();

    expect(state).toEqual({
      player: createInitialPlayer(),
      asteroids: [],
      asteroidSpawnState: { timer: ASTEROID_INITIAL_SPAWN_TIMER, nextId: 1 },
      score: 0,
      survivalTime: 0,
      bonusFeedback: null,
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

    const feedback = { text: "+25", timeLeft: 0.2 };
    const result = applyScoreBonuses(100, player, asteroids, feedback);

    expect(result).toEqual({
      score: 100,
      asteroids,
      bonusFeedback: feedback,
    });
  });

  it("adds the bonus to the score and starts fresh feedback when an asteroid just passed", () => {
    const player = createInitialPlayer();
    const playerLeftEdge = player.x - player.width / 2;
    const asteroids = [createAsteroid({ x: playerLeftEdge - 31, hasAwardedPassBonus: false })];

    const result = applyScoreBonuses(100, player, asteroids, null);

    expect(result.score).toBe(125);
    expect(result.bonusFeedback).toEqual({
      text: "+25",
      timeLeft: BONUS_FEEDBACK_DURATION,
    });
    expect(result.asteroids[0].hasAwardedPassBonus).toBe(true);
    expect(asteroids[0].hasAwardedPassBonus).toBe(false);
  });

  it("shows the last newly awarded asteroid's individual reward in array order", () => {
    const player = createInitialPlayer();
    const playerLeftEdge = player.x - player.width / 2;
    const asteroids = [
      createAsteroid({
        id: "standard-first",
        x: playerLeftEdge - 31,
        hasAwardedPassBonus: false,
      }),
      createAsteroid({
        id: "fiery-last",
        variant: "fiery",
        x: playerLeftEdge - 31,
        hasAwardedPassBonus: false,
      }),
    ];

    const result = applyScoreBonuses(0, player, asteroids, null);

    expect(result.score).toBe(125);
    expect(result.bonusFeedback).toEqual({
      text: "+100",
      timeLeft: BONUS_FEEDBACK_DURATION,
    });
  });
});

describe("updateBonusFeedbackTimer", () => {
  it("does nothing once the timer has already run out", () => {
    const result = updateBonusFeedbackTimer(null, 0.5);

    expect(result).toBeNull();
  });

  it("counts the timer down while keeping the feedback text", () => {
    const feedback = { text: "+25", timeLeft: 0.5 };
    const result = updateBonusFeedbackTimer(feedback, 0.2);

    expect(result).toEqual({ text: "+25", timeLeft: 0.3 });
    expect(feedback).toEqual({ text: "+25", timeLeft: 0.5 });
  });

  it("clamps the timer at zero and clears the feedback text once it elapses", () => {
    const result = updateBonusFeedbackTimer({ text: "+25", timeLeft: 0.2 }, 0.5);

    expect(result).toBeNull();
  });
});

describe("advanceRunningGame", () => {
  it("increases survival time without increasing score when nothing passes", () => {
    const gameState = createInitialGameState();
    const deltaTime = 0.1;

    const result = advanceRunningGame(
      gameState,
      createInputState(),
      deltaTime,
      () => MAX_RANDOM_SAMPLE,
    );

    expect(result.collided).toBe(false);
    expect(result.gameState.survivalTime).toBeCloseTo(deltaTime);
    expect(result.gameState.score).toBe(0);
    expect(gameState).toEqual(createInitialGameState());
  });

  it("scales gameplay time and world movement with boost without mutating the input", () => {
    const gameState = createInitialGameState();
    const asteroid = createAsteroid({ x: 900, y: 100, speed: 240 });
    gameState.asteroids.push(asteroid);
    const input = { ...createInputState(), up: true, boost: true };
    const originalInput = { ...input };
    const deltaTime = 0.1;
    const scaledDeltaTime = deltaTime * 2;

    const result = advanceRunningGame(gameState, input, deltaTime, () => MAX_RANDOM_SAMPLE);

    expect(result.collided).toBe(false);
    expect(result.gameState.survivalTime).toBeCloseTo(scaledDeltaTime);
    expect(result.gameState.asteroidSpawnState.timer).toBeCloseTo(
      ASTEROID_INITIAL_SPAWN_TIMER + scaledDeltaTime,
    );
    expect(result.gameState.player.y).toBeCloseTo(gameState.player.y - PLAYER_SPEED * scaledDeltaTime);
    expect(result.gameState.asteroids[0].x).toBeCloseTo(
      asteroid.x - asteroid.speed * scaledDeltaTime,
    );
    expect(input).toEqual(originalInput);
    expect(gameState.asteroids[0]).toEqual(asteroid);
  });

  it("keeps bonus feedback timing on real time while gameplay is boosted", () => {
    const gameState = createInitialGameState();
    gameState.bonusFeedback = { text: "+25", timeLeft: 0.5 };
    const input = { ...createInputState(), boost: true };

    const result = advanceRunningGame(gameState, input, 0.1, () => MAX_RANDOM_SAMPLE);

    expect(result.collided).toBe(false);
    expect(result.gameState.survivalTime).toBeCloseTo(0.2);
    expect(result.gameState.bonusFeedback).toEqual({ text: "+25", timeLeft: 0.4 });
    expect(gameState.bonusFeedback).toEqual({ text: "+25", timeLeft: 0.5 });
  });

  it("awards a pass bonus and reflects it in the bonus feedback text", () => {
    const gameState = createInitialGameState();
    const playerLeftEdge = gameState.player.x - gameState.player.width / 2;
    const passedAsteroid = createAsteroid({ x: playerLeftEdge - 31, hasAwardedPassBonus: false });
    gameState.asteroids.push(passedAsteroid);

    const result = advanceRunningGame(
      gameState,
      createInputState(),
      0.1,
      () => MAX_RANDOM_SAMPLE,
    );

    expect(result.collided).toBe(false);
    expect(result.gameState.bonusFeedback).toEqual({
      text: "+25",
      timeLeft: BONUS_FEEDBACK_DURATION - 0.1,
    });
    expect(result.gameState.asteroids[0].hasAwardedPassBonus).toBe(true);
    expect(passedAsteroid.hasAwardedPassBonus).toBe(false);
  });

  it("reports a collision and skips the feedback timer update for that call", () => {
    const gameState = createInitialGameState();
    gameState.bonusFeedback = { text: "+25", timeLeft: 0.2 };
    const collidingAsteroid = createAsteroid({
      x: gameState.player.x,
      y: gameState.player.y,
      radius: 30,
      hasAwardedPassBonus: false,
    });
    gameState.asteroids.push(collidingAsteroid);

    const result = advanceRunningGame(
      gameState,
      createInputState(),
      0.1,
      () => MAX_RANDOM_SAMPLE,
    );

    expect(result.collided).toBe(true);
    expect(result.gameState.score).toBe(0);
    expect(result.gameState.bonusFeedback).toEqual({ text: "+25", timeLeft: 0.2 });
    expect(gameState.score).toBe(0);
    expect(gameState.bonusFeedback).toEqual({ text: "+25", timeLeft: 0.2 });
  });

  it("spawns asteroids once enough delta time has accumulated for a seeded rng", () => {
    const gameState = createInitialGameState();

    const result = advanceRunningGame(gameState, createInputState(), 1.5, () => 0.5);

    expect(result.collided).toBe(false);
    expect(result.gameState.asteroids.length).toBeGreaterThan(0);
    expect(result.gameState.asteroidSpawnState.nextId).toBeGreaterThan(1);
    expect(gameState.asteroids).toHaveLength(0);
  });
});
