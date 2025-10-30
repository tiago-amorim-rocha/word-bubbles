// scoring.js - Score tracking and calculation

const STORAGE_KEY = 'letterball_highscore';

class ScoringSystem {
  constructor() {
    this.currentScore = 0;
    this.highScore = this.loadHighScore();
    this.animations = []; // For floating +points animations
    this.words = []; // Track all words formed this game
  }

  // Calculate score based on word length (exponential growth)
  calculateScore(word) {
    if (!word || word.length < 2) return 0;

    const length = word.length;

    // Base scoring: 100 points for 2 letters, doubles each additional letter
    // 2=100, 3=200, 4=400, 5=800, 6=1600, 7=3200, etc.
    return 100 * Math.pow(2, length - 2);
  }

  // Add points to current score
  addScore(points, x, y) {
    this.currentScore += points;

    // Update high score if beaten
    if (this.currentScore > this.highScore) {
      this.highScore = this.currentScore;
      this.saveHighScore();
    }

    // Create floating animation
    if (x !== undefined && y !== undefined) {
      this.animations.push({
        points,
        x,
        y,
        opacity: 1.0,
        startTime: Date.now(),
        duration: 1000 // 1 second
      });
    }
  }

  // Add a word to the list
  addWord(word, points) {
    this.words.push({ word, points });
  }

  // Get all words formed
  getWords() {
    return this.words;
  }

  // Get current score
  getScore() {
    return this.currentScore;
  }

  // Get high score
  getHighScore() {
    return this.highScore;
  }

  // Reset current score (for new game)
  resetScore() {
    this.currentScore = 0;
    this.animations = [];
    this.words = [];
  }

  // Update animations (call in draw loop)
  updateAnimations() {
    const now = Date.now();
    this.animations = this.animations.filter(anim => {
      const elapsed = now - anim.startTime;
      if (elapsed >= anim.duration) return false;

      // Update position and opacity
      const progress = elapsed / anim.duration;
      anim.y -= 1; // Float upward
      anim.opacity = 1.0 - progress; // Fade out

      return true;
    });
  }

  // Get current animations for rendering
  getAnimations() {
    return this.animations;
  }

  // Load high score from localStorage
  loadHighScore() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? parseInt(saved, 10) : 0;
    } catch (e) {
      console.warn('Failed to load high score:', e);
      return 0;
    }
  }

  // Save high score to localStorage
  saveHighScore() {
    try {
      localStorage.setItem(STORAGE_KEY, this.highScore.toString());
    } catch (e) {
      console.warn('Failed to save high score:', e);
    }
  }
}

// Create singleton instance
export const scoring = new ScoringSystem();
