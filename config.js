// config.js - All game configuration constants

// ========== Physics Constants ==========
export const PHYSICS = {
  GRAVITY: 1.0,
  FRICTION: 0.15,
  BOUNCE: 0.8,          // Restitution
  AIR_FRICTION: 0.02,   // Air resistance
  BASE_DENSITY: 0.001,  // Base density for mass calculation
  SLOP: 0.05,           // Collision tolerance (reduces jitter)
  SLEEP_THRESHOLD: 60   // Speed threshold for sleeping
};

// ========== Ball Properties ==========
export const BALL = {
  MIN_RADIUS: 30,
  MAX_RADIUS: 45,
  BASE_RADIUS: 37.5,  // Midpoint for density scaling
  NUM_BALLS: 20       // Initial balls (reduced for survival mode)
};

// ========== Spawning ==========
export const SPAWN = {
  DELAY: 50,              // ms between spawn attempts
  RETRY_DELAY: 17,        // ms to wait if collision detected
  ZONE_HEIGHT: 100,       // Height above screen to spawn
  INITIAL_VELOCITY: 3,    // Initial downward velocity
  INTERVAL: 20000,        // ms between automatic spawns (survival mode) - halved rate
  BATCH_SIZE: 5           // Number of balls to spawn per interval
};

// ========== Selection ==========
export const SELECTION = {
  MAX_DISTANCE: 187.5,    // Max distance between balls (2.5 × avg diameter)
  HIGHLIGHT_COLOR: '#FFD700', // Gold color for selected balls
  LINE_COLOR: '#FFD700',  // Color for connecting lines
  LINE_WIDTH: 3,          // Width of connecting lines
  STROKE_WIDTH: 4         // Width of highlight stroke
};

// ========== Score Display ==========
export const SCORE = {
  FONT_SIZE: 20,
  FONT_SIZE_HIGH: 14,     // High score font size (smaller)
  COLOR: '#333',
  HIGH_SCORE_COLOR: '#666',
  PADDING: 16,            // Padding from screen edge
  ANIMATION_FONT_SIZE: 32,
  ANIMATION_COLOR: '#4CAF50', // Green for points animation
  ANIMATION_FONT_WEIGHT: 'bold'
};

// ========== Danger Zone ==========
export const DANGER = {
  LINE_Y_OFFSET: 60,      // Pixels below score UI
  LINE_COLOR: '#FF9800',  // Orange when safe
  LINE_COLOR_DANGER: '#F44336', // Red when ball in danger
  LINE_WIDTH: 3,
  LINE_DASH: [10, 5],     // Dashed line pattern
  THRESHOLD_TIME: 5000,   // 5 seconds before game over
  WARNING_COLOR: '#F44336',
  WARNING_FLASH_SPEED: 500, // ms for warning pulse
  VELOCITY_THRESHOLD: 2   // Ignore balls moving faster than this (just spawned)
};

// ========== Double Tap Delete Feature ==========
export const DOUBLE_TAP = {
  DELAY: 300   // ms between taps to detect double-tap
};

// ========== Letter Bag Distribution (Optimized for word formation, 100 total) ==========
export const LETTER_BAG_DISTRIBUTION = {
  // Vowels - 32 total (32%) - reduced from Scrabble's 42% for better word variety
  'A': 7, 'E': 9, 'I': 7, 'O': 6, 'U': 3,
  // Common consonants - 44 total (increased for better word formation)
  'N': 7, 'R': 7, 'T': 7, 'L': 5, 'S': 5, 'D': 5, 'G': 4, 'H': 2, 'Y': 2,
  // Moderate consonants - 21 total
  'B': 3, 'C': 3, 'M': 3, 'P': 3, 'F': 2, 'W': 2, 'V': 2, 'K': 1, 'J': 1, 'X': 1,
  // Rare consonants - 3 total
  'Q': 1, 'Z': 2
};

// ========== Utilities ==========

// Get consistent color for a letter
export function getColorForLetter(letter) {
  return '#888888'; // Gray for all balls
}

// Calculate ball radius based on letter bag count (more in bag = bigger ball)
export function getRadiusForLetter(letter) {
  const bagCount = LETTER_BAG_DISTRIBUTION[letter];
  const minCount = 1;  // Minimum bag count (Q, K, J, X)
  const maxCount = 12; // Maximum bag count (E)
  const normalizedCount = (bagCount - minCount) / (maxCount - minCount);
  return BALL.MIN_RADIUS + (normalizedCount * (BALL.MAX_RADIUS - BALL.MIN_RADIUS));
}
