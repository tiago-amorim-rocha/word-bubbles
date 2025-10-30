// letterBag.js - Letter distribution and bag management system

const v = window.__BUILD || Date.now();
const { LETTER_BAG_DISTRIBUTION } = await import(`./config.js?v=${v}`);

// Letter bag with Scrabble-like distribution
// TOTAL: 100 letters that can be drawn and returned
export const letterBag = {
  available: [], // Letters currently in bag
  inPlay: [],    // Letters currently on board

  // Initialize bag with all letters
  init() {
    this.available = [];
    this.inPlay = [];

    // Build the bag from distribution
    for (const [letter, count] of Object.entries(LETTER_BAG_DISTRIBUTION)) {
      for (let i = 0; i < count; i++) {
        this.available.push(letter);
      }
    }

    // Shuffle the bag
    for (let i = this.available.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.available[i], this.available[j]] = [this.available[j], this.available[i]];
    }

    console.log(`Letter bag initialized with ${this.available.length} letters`);
  },

  // Draw a letter from the bag
  draw() {
    if (this.available.length === 0) {
      console.warn('Letter bag is empty!');
      return null;
    }

    const letter = this.available.pop();
    this.inPlay.push(letter);
    return letter;
  },

  // Return a letter to the bag
  return(letter) {
    const index = this.inPlay.indexOf(letter);
    if (index > -1) {
      this.inPlay.splice(index, 1);
      this.available.push(letter);

      // Re-shuffle to maintain randomness
      const randomIndex = Math.floor(Math.random() * this.available.length);
      [this.available[this.available.length - 1], this.available[randomIndex]] =
        [this.available[randomIndex], this.available[this.available.length - 1]];
    } else {
      console.warn(`Letter ${letter} not found in play!`);
    }
  },

  // Get current state
  getState() {
    return {
      available: this.available.length,
      inPlay: this.inPlay.length,
      total: this.available.length + this.inPlay.length
    };
  }
};

// Initialize the bag
letterBag.init();

// Expose globally for future use
window.letterBag = letterBag;
