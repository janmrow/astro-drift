import { collectPassBonuses, createInitialPlayer, hasPlayerCollision, updatePlayer, updateScore } from "./engine";
import {
  createInitialAsteroidSpawnState,
  updateAsteroidSpawning,
  updateAsteroids,
  type AsteroidSpawnState,
} from "./asteroids";
import type { Asteroid, InputState, Player } from "./types";

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
  const scoreAfterBonus = collectPassBonuses(currentScore, currentPlayer, currentAsteroids);
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

export type RunningGameResult = {
  collided: boolean;
};

export function advanceRunningGame(
  gameState: GameState,
  input: InputState,
  deltaTime: number,
  rng: () => number,
  bonusFeedbackDuration: number,
): RunningGameResult {
  gameState.survivalTime += deltaTime;
  gameState.player = updatePlayer(gameState.player, input, deltaTime);
  gameState.asteroidSpawnState = updateAsteroidSpawning(
    gameState.asteroids,
    gameState.asteroidSpawnState,
    deltaTime,
    gameState.survivalTime,
    rng,
  );

  const bonusResult = applyScoreBonuses(
    gameState.score,
    gameState.player,
    gameState.asteroids,
    gameState.bonusFeedbackText,
    gameState.bonusFeedbackTimeLeft,
    bonusFeedbackDuration,
  );
  gameState.score = bonusResult.score;
  gameState.bonusFeedbackText = bonusResult.bonusFeedbackText;
  gameState.bonusFeedbackTimeLeft = bonusResult.bonusFeedbackTimeLeft;

  updateAsteroids(gameState.asteroids, deltaTime);

  if (hasPlayerCollision(gameState.player, gameState.asteroids)) {
    return { collided: true };
  }

  gameState.score = updateScore(gameState.score, deltaTime);
  const timerResult = updateBonusFeedbackTimer(
    gameState.bonusFeedbackText,
    gameState.bonusFeedbackTimeLeft,
    deltaTime,
  );
  gameState.bonusFeedbackText = timerResult.bonusFeedbackText;
  gameState.bonusFeedbackTimeLeft = timerResult.bonusFeedbackTimeLeft;

  return { collided: false };
}
