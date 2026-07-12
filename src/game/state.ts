import { collectPassBonuses, createInitialPlayer, hasPlayerCollision, updatePlayer, updateScore } from "./engine";
import { BONUS_FEEDBACK_DURATION } from "./balance";
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
  bonusFeedback: BonusFeedback;
};

export type BonusFeedback = {
  text: string;
  timeLeft: number;
} | null;

export function createInitialGameState(): GameState {
  return {
    player: createInitialPlayer(),
    asteroids: [],
    asteroidSpawnState: createInitialAsteroidSpawnState(),
    score: 0,
    survivalTime: 0,
    bonusFeedback: null,
  };
}

export function applyScoreBonuses(
  currentScore: number,
  currentPlayer: Player,
  currentAsteroids: Asteroid[],
  currentBonusFeedback: BonusFeedback,
): { score: number; asteroids: Asteroid[]; bonusFeedback: BonusFeedback } {
  const bonusResult = collectPassBonuses(currentScore, currentPlayer, currentAsteroids);
  const bonusPoints = Math.floor(bonusResult.score - currentScore);

  if (bonusPoints <= 0) {
    return {
      ...bonusResult,
      bonusFeedback: currentBonusFeedback,
    };
  }

  return {
    ...bonusResult,
    bonusFeedback: {
      text: `+${bonusPoints}`,
      timeLeft: BONUS_FEEDBACK_DURATION,
    },
  };
}

export function updateBonusFeedbackTimer(
  currentBonusFeedback: BonusFeedback,
  deltaTime: number,
): BonusFeedback {
  if (!currentBonusFeedback) {
    return null;
  }

  const nextTimeLeft = Math.max(0, currentBonusFeedback.timeLeft - deltaTime);

  return nextTimeLeft === 0 ? null : { ...currentBonusFeedback, timeLeft: nextTimeLeft };
}

export type RunningGameResult = {
  gameState: GameState;
  collided: boolean;
};

export function advanceRunningGame(
  gameState: GameState,
  input: InputState,
  deltaTime: number,
  rng: () => number,
): RunningGameResult {
  const survivalTime = gameState.survivalTime + deltaTime;
  const player = updatePlayer(gameState.player, input, deltaTime);
  const spawningResult = updateAsteroidSpawning(
    gameState.asteroids,
    gameState.asteroidSpawnState,
    deltaTime,
    survivalTime,
    rng,
  );
  const bonusResult = applyScoreBonuses(
    gameState.score,
    player,
    spawningResult.asteroids,
    gameState.bonusFeedback,
  );
  const asteroids = updateAsteroids(bonusResult.asteroids, deltaTime);
  const nextGameState = {
    player,
    asteroids,
    asteroidSpawnState: spawningResult.spawnState,
    score: bonusResult.score,
    survivalTime,
    bonusFeedback: bonusResult.bonusFeedback,
  };

  if (hasPlayerCollision(player, asteroids)) {
    return { gameState: nextGameState, collided: true };
  }

  return {
    gameState: {
      ...nextGameState,
      score: updateScore(nextGameState.score, deltaTime),
      bonusFeedback: updateBonusFeedbackTimer(nextGameState.bonusFeedback, deltaTime),
    },
    collided: false,
  };
}
