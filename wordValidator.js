// wordValidator.js - SOWPODS Scrabble word list validation

class WordValidator {
  constructor() {
    this.validWords = new Set();
    this.isLoaded = false;
    this.isLoading = false;
    this.loadPromise = null;
  }

  async load() {
    if (this.isLoaded) return;
    if (this.isLoading) return this.loadPromise;

    this.isLoading = true;
    this.loadPromise = (async () => {
      try {
        console.log('Loading SOWPODS word list...');
        const response = await fetch('./sowpods.txt');

        if (!response.ok) {
          throw new Error(`Failed to load word list: ${response.status}`);
        }

        const text = await response.text();
        const words = text.split('\n').map(word => word.trim()).filter(word => word.length > 0);

        // Store all words in uppercase in a Set for O(1) lookup
        words.forEach(word => this.validWords.add(word.toUpperCase()));

        this.isLoaded = true;
        console.log(`Loaded ${this.validWords.size} words from SOWPODS dictionary`);
      } catch (error) {
        console.error('Failed to load word list:', error);
        this.isLoading = false;
        throw error;
      }
    })();

    await this.loadPromise;
    return this.loadPromise;
  }

  isValid(word) {
    if (!this.isLoaded) {
      console.warn('Word validator not loaded yet');
      return null; // null = unknown (not loaded)
    }

    if (!word || typeof word !== 'string') {
      return false;
    }

    // Convert to uppercase and check
    return this.validWords.has(word.toUpperCase());
  }

  // Check if a word meets minimum length requirement (optional)
  isValidWord(word, minLength = 2) {
    if (!word || word.length < minLength) {
      return false;
    }
    return this.isValid(word);
  }
}

// Create singleton instance
export const wordValidator = new WordValidator();

// Auto-load on module import (async, non-blocking)
wordValidator.load().catch(err => {
  console.error('Failed to initialize word validator:', err);
});
