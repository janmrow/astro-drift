import { describe, expect, it } from "vitest";

import { BONUS_FEEDBACK_DURATION } from "../../src/game/balance";
import { createInitialPlayer } from "../../src/game/engine";
import {
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
