import { applyPassedAsteroidBonuses, createInitialPlayer } from "./engine";
import { createInitialAsteroidSpawnState, type AsteroidSpawnState } from "./asteroids";
import type { Asteroid, Player } from "./types";

export type GameState = {
  player: Player;
  asteroids: Asteroid[];
  asteroidSpawnState: AsteroidSpawnState;
  score: number;
  survivalTime: number;
  bonusFeedbackText: string | null;
  bonusFeedbackTimeLeft: number;
};

export function createInitialGameState(): GameState {
  return {
    player: createInitialPlayer(),
    asteroids: [],
    asteroidSpawnState: createInitialAsteroidSpawnState(),
    score: 0,
    survivalTime: 0,
    bonusFeedbackText: null,
    bonusFeedbackTimeLeft: 0,
  };
}

export type ScoreBonusResult = {
  score: number;
  bonusFeedbackText: string | null;
  bonusFeedbackTimeLeft: number;
};

export function applyScoreBonuses(
  currentScore: number,
  currentPlayer: Player,
  currentAsteroids: Asteroid[],
  currentBonusFeedbackText: string | null,
  currentBonusFeedbackTimeLeft: number,
  bonusFeedbackDuration: number,
): ScoreBonusResult {
  const scoreAfterBonus = applyPassedAsteroidBonuses(currentScore, currentPlayer, currentAsteroids);
  const bonusPoints = Math.floor(scoreAfterBonus - currentScore);

  if (bonusPoints <= 0) {
    return {
      score: scoreAfterBonus,
      bonusFeedbackText: currentBonusFeedbackText,
      bonusFeedbackTimeLeft: currentBonusFeedbackTimeLeft,
    };
  }

  return {
    score: scoreAfterBonus,
    bonusFeedbackText: `+${bonusPoints}`,
    bonusFeedbackTimeLeft: bonusFeedbackDuration,
  };
}

export type BonusFeedbackTimerResult = {
  bonusFeedbackText: string | null;
  bonusFeedbackTimeLeft: number;
};

export function updateBonusFeedbackTimer(
  currentBonusFeedbackText: string | null,
  currentBonusFeedbackTimeLeft: number,
  deltaTime: number,
): BonusFeedbackTimerResult {
  if (currentBonusFeedbackTimeLeft <= 0) {
    return {
      bonusFeedbackText: currentBonusFeedbackText,
      bonusFeedbackTimeLeft: currentBonusFeedbackTimeLeft,
    };
  }

  const nextBonusFeedbackTimeLeft = Math.max(0, currentBonusFeedbackTimeLeft - deltaTime);

  return {
    bonusFeedbackText: nextBonusFeedbackTimeLeft === 0 ? null : currentBonusFeedbackText,
    bonusFeedbackTimeLeft: nextBonusFeedbackTimeLeft,
  };
}
