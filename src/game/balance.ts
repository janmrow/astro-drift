export const PLAYER_SPEED = 400;

export const SCORE_PER_SECOND = 10;
export const ASTEROID_PASS_BONUS = 25;
export const FIERY_ASTEROID_PASS_BONUS = 100;

export const ASTEROID_BASE_SPAWN_INTERVAL = 1.2;
export const ASTEROID_MIN_SPAWN_INTERVAL = 0.62;
export const ASTEROID_SPAWN_RAMP = 0.006;

export const ASTEROID_MIN_RADIUS = 18;
export const ASTEROID_MAX_RADIUS = 42;
export const ASTEROID_BASE_MIN_SPEED = 165;
export const ASTEROID_BASE_MAX_SPEED = 245;
export const ASTEROID_SPEED_RAMP = 1.5;
export const ASTEROID_SPEED_HARD_CAP = 580;

export const ASTEROID_MIN_ROTATION_SPEED = 0.35;
export const ASTEROID_MAX_ROTATION_SPEED = 1.1;

export const STANDARD_ASTEROID_DIAGONAL_CHANCE = 0.35;
export const STANDARD_ASTEROID_MIN_VERTICAL_SPEED = 18;
export const STANDARD_ASTEROID_MAX_VERTICAL_SPEED = 44;

export const FIERY_ASTEROID_CHANCE = 0.12;
// Fiery asteroid speed intentionally exceeds ASTEROID_SPEED_HARD_CAP once this
// multiplier is applied — that is expected, not a bug to "fix" with a post-multiplier clamp.
export const FIERY_ASTEROID_SPEED_MULTIPLIER = 1.7;
export const FIERY_ASTEROID_ROTATION_MULTIPLIER = 1.7;
export const FIERY_ASTEROID_MIN_RADIUS_MULTIPLIER = 1.2;
export const FIERY_ASTEROID_MAX_RADIUS_MULTIPLIER = 1.3;
export const FIERY_ASTEROID_MIN_VERTICAL_SPEED = 6;
export const FIERY_ASTEROID_MAX_VERTICAL_SPEED = 14;

export const BONUS_FEEDBACK_DURATION = 0.65;
