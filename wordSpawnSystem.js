// wordSpawnSystem.js - Advanced word-forming letter spawn system with positional bias

// ========== Configuration ==========
export const SPAWN_CONFIG = {
  // Base letter distribution (infinite weighted bag, ~130 total weight)
  LETTER_WEIGHTS: {
    'E': 16, 'A': 11, 'R': 10, 'N': 10, 'T': 9, 'S': 9, 'L': 8, 'I': 8, 'O': 7,
    'D': 5, 'C': 4, 'U': 4, 'M': 4, 'P': 4, 'G': 3, 'H': 3,
    'B': 2, 'Y': 2, 'F': 2, 'V': 2,
    'K': 1, 'W': 1, 'X': 1, 'Q': 1, 'Z': 1
  },

  // Cluster pool with weights
  CLUSTER_WEIGHTS: {
    'TH': 3, 'SH': 3, 'CH': 3, 'ING': 3, 'ER': 3,
    'ED': 2, 'EST': 2, 'RE': 2, 'UN': 2, 'LY': 2, 'AND': 2, 'ENT': 2,
    'ION': 1, 'STR': 1
  },

  // Cluster spawn chance (15% = 0.15)
  CLUSTER_CHANCE: 0.15,

  // Region boundaries (normalized x position [0, 1])
  REGION_THRESHOLDS: {
    LEFT_END: 0.33,
    RIGHT_START: 0.66
  },

  // Region bias multipliers
  REGION_MULTIPLIERS: {
    LEFT: { STARTERS: 1.5, MIDDLES: 1.0, ENDERS: 0.5 },
    MIDDLE: { STARTERS: 1.0, MIDDLES: 1.5, ENDERS: 1.0 },
    RIGHT: { STARTERS: 0.5, MIDDLES: 1.0, ENDERS: 1.5 }
  },

  // Letter role sets
  LETTER_ROLES: {
    STARTERS: new Set(['T', 'S', 'C', 'P', 'B', 'D', 'M', 'F', 'W']),
    MIDDLES: new Set(['A', 'E', 'I', 'O', 'N', 'R', 'L', 'T']),
    ENDERS: new Set(['E', 'D', 'S', 'R', 'N', 'T', 'Y'])
  },

  // Cluster region preferences
  CLUSTER_REGIONS: {
    LEFT: ['UN', 'RE'],
    MIDDLE: ['ING', 'AND', 'ENT', 'EST', 'CH', 'SH', 'TH', 'STR'],
    RIGHT: ['ED', 'ER', 'LY', 'ION']
  },

  // Cluster placement radius (letters spawn close together)
  CLUSTER_RADIUS: 50, // pixels - letters almost touching

  // Vowel balancing
  VOWEL_CHECK_INTERVAL: 5, // Check every N spawns
  VOWEL_CORRECTION_COUNT: 5, // Apply correction to next K draws
  VOWEL_TARGET_MIN: 0.30, // 30%
  VOWEL_TARGET_MAX: 0.45, // 45%
  VOWEL_ADJUSTMENT: 0.10 // 10% weight adjustment
};

// Vowels for balancing
const VOWELS = new Set(['A', 'E', 'I', 'O', 'U']);

// ========== State Tracking ==========
let spawnCount = 0;
let vowelCorrectionRemaining = 0;
let vowelCorrectionMultiplier = 1.0;

/**
 * Weighted random selection from a distribution object
 */
function weightedRandom(weights) {
  const entries = Object.entries(weights);
  const totalWeight = entries.reduce((sum, [, weight]) => sum + weight, 0);

  let random = Math.random() * totalWeight;

  for (const [item, weight] of entries) {
    random -= weight;
    if (random <= 0) {
      return item;
    }
  }

  // Fallback (should never happen)
  return entries[0][0];
}

/**
 * Determine which region an x position falls into
 */
export function determineRegion(x, boardWidth) {
  const normalized = x / boardWidth;

  if (normalized < SPAWN_CONFIG.REGION_THRESHOLDS.LEFT_END) {
    return 'LEFT';
  } else if (normalized < SPAWN_CONFIG.REGION_THRESHOLDS.RIGHT_START) {
    return 'MIDDLE';
  } else {
    return 'RIGHT';
  }
}

/**
 * Get region multipliers for a given region
 */
export function getRegionMultipliers(region) {
  return SPAWN_CONFIG.REGION_MULTIPLIERS[region] || SPAWN_CONFIG.REGION_MULTIPLIERS.MIDDLE;
}

/**
 * Get preferred region for a cluster
 */
export function getClusterRegionBias(cluster) {
  for (const [region, clusters] of Object.entries(SPAWN_CONFIG.CLUSTER_REGIONS)) {
    if (clusters.includes(cluster)) {
      return region;
    }
  }
  return 'MIDDLE'; // Default to middle if not found
}

/**
 * Apply region bias to letter weights
 */
function applyRegionBias(baseWeights, region) {
  const multipliers = getRegionMultipliers(region);
  const biasedWeights = {};

  for (const [letter, baseWeight] of Object.entries(baseWeights)) {
    let multiplier = 1.0;

    // Apply role-based multiplier
    if (SPAWN_CONFIG.LETTER_ROLES.STARTERS.has(letter)) {
      multiplier = multipliers.STARTERS;
    } else if (SPAWN_CONFIG.LETTER_ROLES.MIDDLES.has(letter)) {
      multiplier = multipliers.MIDDLES;
    } else if (SPAWN_CONFIG.LETTER_ROLES.ENDERS.has(letter)) {
      multiplier = multipliers.ENDERS;
    }

    // Apply vowel correction if active
    if (vowelCorrectionRemaining > 0 && VOWELS.has(letter)) {
      multiplier *= vowelCorrectionMultiplier;
    }

    biasedWeights[letter] = baseWeight * multiplier;
  }

  return biasedWeights;
}

/**
 * Draw a single letter from the infinite weighted bag
 */
export function drawLetterFromBag(region = 'MIDDLE') {
  const biasedWeights = applyRegionBias(SPAWN_CONFIG.LETTER_WEIGHTS, region);
  const letter = weightedRandom(biasedWeights);

  // Decrement vowel correction counter
  if (vowelCorrectionRemaining > 0) {
    vowelCorrectionRemaining--;
    if (vowelCorrectionRemaining === 0) {
      vowelCorrectionMultiplier = 1.0;
    }
  }

  return letter;
}

/**
 * Draw a cluster from the cluster pool
 */
export function drawClusterFromPool() {
  const cluster = weightedRandom(SPAWN_CONFIG.CLUSTER_WEIGHTS);
  return cluster.split(''); // Return as array of characters
}

/**
 * Check if we should spawn a cluster (15% chance)
 */
export function shouldSpawnCluster() {
  return Math.random() < SPAWN_CONFIG.CLUSTER_CHANCE;
}

/**
 * Calculate vowel percentage on the board
 */
export function calculateVowelPercentage(balls) {
  if (balls.length === 0) return 0.5; // Default if no balls

  const vowelCount = balls.filter(ball => VOWELS.has(ball.letter)).length;
  return vowelCount / balls.length;
}

/**
 * Check and adjust vowel balance
 */
export function checkVowelBalance(balls) {
  spawnCount++;

  // Check every N spawns
  if (spawnCount % SPAWN_CONFIG.VOWEL_CHECK_INTERVAL !== 0) {
    return;
  }

  const vowelPercentage = calculateVowelPercentage(balls);

  if (vowelPercentage < SPAWN_CONFIG.VOWEL_TARGET_MIN) {
    // Too few vowels - increase vowel weight
    vowelCorrectionRemaining = SPAWN_CONFIG.VOWEL_CORRECTION_COUNT;
    vowelCorrectionMultiplier = 1.0 + SPAWN_CONFIG.VOWEL_ADJUSTMENT;
    console.log(`[SPAWN] ⚖️  Vowel balance: ${(vowelPercentage * 100).toFixed(1)}% - INCREASING vowel spawn rate for next ${vowelCorrectionRemaining} spawns`);
  } else if (vowelPercentage > SPAWN_CONFIG.VOWEL_TARGET_MAX) {
    // Too many vowels - decrease vowel weight
    vowelCorrectionRemaining = SPAWN_CONFIG.VOWEL_CORRECTION_COUNT;
    vowelCorrectionMultiplier = 1.0 - SPAWN_CONFIG.VOWEL_ADJUSTMENT;
    console.log(`[SPAWN] ⚖️  Vowel balance: ${(vowelPercentage * 100).toFixed(1)}% - DECREASING vowel spawn rate for next ${vowelCorrectionRemaining} spawns`);
  } else {
    console.log(`[SPAWN] ✓ Vowel balance: ${(vowelPercentage * 100).toFixed(1)}% - OK`);
  }
}

/**
 * Get spawn position for a region with some randomness
 */
export function getSpawnPositionForRegion(region, boardWidth, radius) {
  const thresholds = SPAWN_CONFIG.REGION_THRESHOLDS;
  let minX, maxX;

  if (region === 'LEFT') {
    minX = radius;
    maxX = boardWidth * thresholds.LEFT_END;
  } else if (region === 'MIDDLE') {
    minX = boardWidth * thresholds.LEFT_END;
    maxX = boardWidth * thresholds.RIGHT_START;
  } else { // RIGHT
    minX = boardWidth * thresholds.RIGHT_START;
    maxX = boardWidth - radius;
  }

  return minX + Math.random() * (maxX - minX);
}

/**
 * Reset spawn system state (for game restart)
 */
export function resetSpawnSystem() {
  spawnCount = 0;
  vowelCorrectionRemaining = 0;
  vowelCorrectionMultiplier = 1.0;
  console.log('[SPAWN] 🔄 Spawn system reset');
}

/**
 * Get current spawn system state (for debugging)
 */
export function getSpawnState() {
  return {
    spawnCount,
    vowelCorrectionRemaining,
    vowelCorrectionMultiplier
  };
}

// Expose configuration to window for debugging/tuning
if (typeof window !== 'undefined') {
  window.SPAWN_CONFIG = SPAWN_CONFIG;
  window.getSpawnState = getSpawnState;
}
