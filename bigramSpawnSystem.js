// bigramSpawnSystem.js - Intelligent bigram-based letter spawning with distribution tracking

// ========== Target Distribution ==========
// Ideal letter percentages based on English letter frequency
// These represent what % of the board each letter should occupy
export const TARGET_DISTRIBUTION_PCT = {
  'E': 12.7, 'T': 9.1, 'A': 8.2, 'O': 7.5, 'I': 7.0, 'N': 6.7, 'S': 6.3, 'H': 6.1, 'R': 6.0,
  'D': 4.3, 'L': 4.0, 'C': 2.8, 'U': 2.8, 'M': 2.4, 'W': 2.4, 'F': 2.2, 'G': 2.0, 'Y': 2.0,
  'P': 1.9, 'B': 1.5, 'V': 1.0, 'K': 0.8, 'X': 0.15, 'J': 0.15, 'Q': 0.10, 'Z': 0.07
};

// Legacy export for compatibility
export const TARGET_DISTRIBUTION = TARGET_DISTRIBUTION_PCT;

// ========== Vowel Configuration ==========
const VOWELS = new Set(['A', 'E', 'I', 'O', 'U']);
const VOWEL_TARGET = 0.45; // Aim for 45% vowels
const Y_VOWEL_WEIGHT = 0.2; // Treat Y as 0.2 vowel

// ========== Bigram Weights ==========
// Ranked list of common bigrams with base weights
export const BIGRAM_WEIGHTS = {
  // Top tier (weight: 10)
  'th': 10, 'he': 10, 'in': 10, 'er': 10, 'an': 10,
  're': 10, 'on': 10, 'at': 10, 'en': 10, 'nd': 10,

  // High tier (weight: 8)
  'ti': 8, 'es': 8, 'or': 8, 'te': 8, 'of': 8,
  'ed': 8, 'is': 8, 'it': 8, 'al': 8, 'ar': 8,

  // Mid-high tier (weight: 6)
  'st': 6, 'to': 6, 'nt': 6, 'ng': 6, 'se': 6,
  'ha': 6, 'as': 6, 'ou': 6, 'io': 6, 'le': 6,

  // Mid tier (weight: 4)
  've': 4, 'co': 4, 'me': 4, 'de': 4, 'hi': 4,
  'ri': 4, 'ro': 4, 'li': 4, 'ni': 4, 'di': 4,
  'ne': 4, 'ra': 4, 'ce': 4, 'si': 4, 'ch': 4,

  // Common word starters (weight: 5)
  'pr': 5, 'tr': 5, 'br': 5, 'cr': 5, 'fr': 5,
  'gr': 5, 'sh': 5, 'wh': 5, 'th': 5,

  // Common endings (weight: 5)
  'ly': 5, 'er': 5, 'ed': 5, 'ing': 5, 'ion': 5,

  // Less common but useful (weight: 3)
  'ad': 3, 'ag': 3, 'am': 3, 'ap': 3, 'ay': 3,
  'ea': 3, 'ee': 3, 'el': 3, 'ic': 3, 'id': 3,
  'if': 3, 'ig': 3, 'il': 3, 'im': 3, 'om': 3,
  'op': 3, 'ow': 3, 'oy': 3, 'pe': 3, 'po': 3,
  'rs': 3, 'rt': 3, 'ss': 3, 'ta': 3, 'ts': 3,
  'ur': 3, 'us': 3, 'ut': 3, 'wa': 3, 'we': 3
};

// Common double letters (for safety penalty reduction)
const COMMON_DOUBLES = new Set(['ee', 'll', 'ss', 'oo', 'tt', 'ff', 'mm', 'nn']);

// ========== Histogram Tracking ==========

/**
 * Calculate histogram of current letters on board
 */
export function calculateHistogram(balls) {
  const histogram = {};

  // Initialize all letters to 0
  for (const letter in TARGET_DISTRIBUTION) {
    histogram[letter] = 0;
  }

  // Count current letters
  balls.forEach(ball => {
    if (histogram[ball.letter] !== undefined) {
      histogram[ball.letter]++;
    }
  });

  return histogram;
}

/**
 * Calculate vowel ratio on board (treating Y as 0.2 vowel)
 */
export function calculateVowelRatio(balls) {
  if (balls.length === 0) return 0;

  let vowelCount = 0;
  balls.forEach(ball => {
    if (VOWELS.has(ball.letter)) {
      vowelCount += 1;
    } else if (ball.letter === 'Y') {
      vowelCount += Y_VOWEL_WEIGHT;
    }
  });

  return vowelCount / balls.length;
}

// ========== Distribution Gain Calculation ==========

/**
 * Calculate how much a pair reduces the distance between current % and target %
 * Compares board composition percentages to ideal English frequency
 */
function calculateDistributionGain(histogram, targetsPct, letter1, letter2, currentBoardSize) {
  if (currentBoardSize === 0) return 2; // Empty board, any pair is fine

  // Calculate current percentage distance
  let currentDistance = 0;
  for (const letter in targetsPct) {
    const currentPct = ((histogram[letter] || 0) / currentBoardSize) * 100;
    const targetPct = targetsPct[letter];
    currentDistance += Math.abs(currentPct - targetPct);
  }

  // Calculate distance after adding the pair (board size increases by 2)
  const newBoardSize = currentBoardSize + 2;
  const newHistogram = { ...histogram };
  newHistogram[letter1] = (newHistogram[letter1] || 0) + 1;
  newHistogram[letter2] = (newHistogram[letter2] || 0) + 1;

  let newDistance = 0;
  for (const letter in targetsPct) {
    const newPct = ((newHistogram[letter] || 0) / newBoardSize) * 100;
    const targetPct = targetsPct[letter];
    newDistance += Math.abs(newPct - targetPct);
  }

  // Gain is the reduction in distance (positive is good)
  return currentDistance - newDistance;
}

// ========== Bigram Goodness Calculation ==========

/**
 * Calculate base bigram weight plus bonuses for board extensions
 */
function calculateBigramGoodness(bigram, balls) {
  const baseWeight = BIGRAM_WEIGHTS[bigram.toLowerCase()] || 0;

  // Bonus for potential board extensions
  let extensionBonus = 0;

  // Simple heuristic: if many letters on board match common extension patterns
  // For example, if 'te' is spawned and there's an 'S' on board, it could make 'tes', 'test', etc.
  const letter1 = bigram[0];
  const letter2 = bigram[1];

  // Check if board has letters that commonly follow or precede this bigram
  const boardLetters = new Set(balls.map(b => b.letter));

  // Common extensions for popular bigrams
  const extensions = {
    'th': ['e', 'a', 'i', 'o'],  // the, that, this, tho
    'er': ['s', 'a', 'e'],        // ers, era, ere
    'in': ['g', 'e', 's', 't'],   // ing, ine, ins, int
    'an': ['d', 't', 's', 'g'],   // and, ant, ans, ang
    're': ['s', 'd', 'a', 'e']    // res, red, rea, ree
  };

  const potentialExtensions = extensions[bigram.toLowerCase()] || [];
  potentialExtensions.forEach(ext => {
    if (boardLetters.has(ext.toUpperCase())) {
      extensionBonus += 0.5;
    }
  });

  return baseWeight + extensionBonus;
}

// ========== Vowel Balance Calculation ==========

/**
 * Calculate bonus/penalty based on vowel balance needs
 */
function calculateVowelBalance(letter1, letter2, currentRatio) {
  const isVowel1 = VOWELS.has(letter1);
  const isVowel2 = VOWELS.has(letter2);
  const isY1 = letter1 === 'Y';
  const isY2 = letter2 === 'Y';

  let vowelChange = 0;
  if (isVowel1) vowelChange += 1;
  else if (isY1) vowelChange += Y_VOWEL_WEIGHT;

  if (isVowel2) vowelChange += 1;
  else if (isY2) vowelChange += Y_VOWEL_WEIGHT;

  // Calculate how this pair affects vowel ratio
  // Positive score if we need vowels and this adds them, or vice versa
  const deficit = VOWEL_TARGET - currentRatio;

  // If we're below target and this adds vowels, that's good
  // If we're above target and this adds consonants, that's good
  if (deficit > 0.05) {
    // Need more vowels
    return vowelChange * 5; // Bonus for adding vowels
  } else if (deficit < -0.05) {
    // Need more consonants
    return (2 - vowelChange) * 5; // Bonus for adding consonants
  }

  return 0; // Balanced, no bonus
}

// ========== Overrepresentation Penalty ==========

/**
 * Calculate penalty based on how over-represented letters are on the board
 * Compares current board % to ideal % for each letter
 */
function calculateOverrepresentationPenalty(letter1, letter2, histogram, boardSize) {
  if (boardSize === 0) return 0;

  let penalty = 0;

  const letter1TargetPct = TARGET_DISTRIBUTION_PCT[letter1] || 1.0;
  const letter2TargetPct = TARGET_DISTRIBUTION_PCT[letter2] || 1.0;
  const letter1Current = histogram[letter1] || 0;
  const letter2Current = histogram[letter2] || 0;

  // Calculate current percentage on board
  const letter1CurrentPct = (letter1Current / boardSize) * 100;
  const letter2CurrentPct = (letter2Current / boardSize) * 100;

  // Calculate deviation from target (percentage points)
  const letter1Deviation = letter1CurrentPct - letter1TargetPct;
  const letter2Deviation = letter2CurrentPct - letter2TargetPct;

  // Progressive penalty based on how far over the target percentage
  // For each percentage point over target, apply penalty
  // Examples with E (target 12.7%):
  // - Board: 30 balls, 4 E's (13.3%) = +0.6pp over = 1.2 penalty
  // - Board: 30 balls, 6 E's (20.0%) = +7.3pp over = 14.6 penalty
  // - Board: 30 balls, 3 E's (10.0%) = -2.7pp under = 0 penalty (want more E!)
  if (letter1Deviation > 0) {
    penalty += letter1Deviation * 2.0;
  }
  if (letter2Deviation > 0) {
    penalty += letter2Deviation * 2.0;
  }

  // Additional penalty for rare letters (unless we really need them)
  const rareLetters = new Set(['Q', 'X', 'Z', 'J']);
  if (rareLetters.has(letter1) && letter1Deviation >= 0) {
    penalty += 10;
  }
  if (rareLetters.has(letter2) && letter2Deviation >= 0) {
    penalty += 10;
  }

  // Special handling for Q - strongly prefer 'qu'
  const bigram = (letter1 + letter2).toLowerCase();
  if (letter1 === 'Q' && letter2 !== 'U') {
    penalty += 20; // Heavy penalty
  }
  if (letter2 === 'Q' && letter1 !== 'U') {
    penalty += 20;
  }
  if (bigram === 'qu') {
    penalty -= 10; // Bonus for qu
  }

  // Light penalty for unusual double letters
  if (letter1 === letter2 && !COMMON_DOUBLES.has(bigram)) {
    penalty += 3;
  }

  return penalty;
}

// ========== Pair Selection ==========

/**
 * Generate candidate bigrams from the weighted list
 */
function generateCandidateBigrams(count = 10) {
  const bigrams = Object.keys(BIGRAM_WEIGHTS);

  // Weighted random selection
  const candidates = [];
  const used = new Set();

  while (candidates.length < Math.min(count, bigrams.length) && candidates.length < 20) {
    // Weighted random selection
    const totalWeight = Object.values(BIGRAM_WEIGHTS).reduce((a, b) => a + b, 0);
    let random = Math.random() * totalWeight;

    for (const bigram of bigrams) {
      if (used.has(bigram)) continue;
      random -= BIGRAM_WEIGHTS[bigram];
      if (random <= 0) {
        candidates.push(bigram.toUpperCase());
        used.add(bigram);
        break;
      }
    }
  }

  return candidates;
}

/**
 * Score a bigram candidate
 */
function scoreBigram(bigram, histogram, targets, balls, currentVowelRatio) {
  const letter1 = bigram[0];
  const letter2 = bigram[1];
  const boardSize = balls.length;

  // Calculate all components
  const distributionGain = calculateDistributionGain(histogram, targets, letter1, letter2, boardSize);
  const bigramGoodness = calculateBigramGoodness(bigram, balls);
  const vowelBalance = calculateVowelBalance(letter1, letter2, currentVowelRatio);
  const overrepPenalty = calculateOverrepresentationPenalty(letter1, letter2, histogram, boardSize);

  // Combine scores (weighted)
  const score =
    distributionGain * 2.0 +      // Distribution is important
    bigramGoodness * 1.5 +        // Bigram quality is important
    vowelBalance * 1.0 -          // Vowel balance matters
    overrepPenalty * 1.0;         // Penalize over-represented letters

  return {
    bigram,
    score,
    components: {
      distributionGain,
      bigramGoodness,
      vowelBalance,
      overrepPenalty
    }
  };
}

/**
 * Select the best bigram pair to spawn
 */
export function selectBigramPair(balls) {
  const histogram = calculateHistogram(balls);
  const currentVowelRatio = calculateVowelRatio(balls);

  // Generate candidates
  const candidates = generateCandidateBigrams(15);

  // Score each candidate
  const scoredCandidates = candidates.map(bigram =>
    scoreBigram(bigram, histogram, TARGET_DISTRIBUTION, balls, currentVowelRatio)
  );

  // Sort by score (descending)
  scoredCandidates.sort((a, b) => b.score - a.score);

  // Select the best one
  const best = scoredCandidates[0];

  return {
    letter1: best.bigram[0],
    letter2: best.bigram[1],
    score: best.score
  };
}

/**
 * Get current spawn statistics for debugging
 */
export function getSpawnStats(balls) {
  const histogram = calculateHistogram(balls);
  const vowelRatio = calculateVowelRatio(balls);

  return {
    histogram,
    vowelRatio,
    totalBalls: balls.length
  };
}

// Expose to window for debugging
if (typeof window !== 'undefined') {
  window.bigramSpawnSystem = {
    calculateHistogram,
    calculateVowelRatio,
    selectBigramPair,
    getSpawnStats,
    TARGET_DISTRIBUTION,
    BIGRAM_WEIGHTS
  };
}
