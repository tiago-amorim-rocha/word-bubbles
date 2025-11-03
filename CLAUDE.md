# Hello World - Letter Ball Physics Game

## Quick Context
A physics-based game where letter balls (A-Z) drop from above and settle using Matter.js. Ball size and mass correlate with letter frequency in English.

## Architecture (7 modules + 1 main)

```
index.html              - Entry point, loads game.js as ES6 module
├── config.js           - All constants (physics, spawning, sizes)
├── debugConsole.js     - Debug UI with physics controls (self-contained)
├── letterBag.js        - Legacy letter bag (kept for compatibility)
├── wordSpawnSystem.js  - Legacy spawn system (kept for compatibility)
├── bigramSpawnSystem.js - NEW: Intelligent bigram-based spawning with distribution tracking
├── physics.js          - Matter.js engine setup & physics helpers
└── game.js             - Main: canvas, spawning, rendering, coordination
```

## Key Systems

### Bigram Spawn System (NEW)
- **Histogram tracking (H)**: Monitors current letter counts on board
- **Target distribution (T)**: Ideal letter counts (E=12, T=9, A=8, etc.)
- **Bigram weights (W)**: Ranked common bigrams (th, he, in, er, etc.)
- **Intelligent pair selection**: Always spawns 2-letter pairs (bigrams) based on:
  - **Distribution gain**: How much the pair reduces distance between H and T
  - **Bigram goodness**: Base weight from W, plus bonuses for board extensions
  - **Vowel balance**: Maintains ~45% vowels (Y counted as 0.2 vowel)
  - **Safety penalties**: Caps rare letters, prefers 'qu' for Q, penalizes unusual doubles
- **Dynamic adaptation**: Continuously evaluates board state to spawn optimal pairs
- Exposed as `window.bigramSpawnSystem` for debugging

### Physics (Matter.js)
- Gravity: 0.5 (customizable via debug console)
- Bounce: 0.5 (restitution)
- Friction: 0.15 (surface), 0.02 (air)
- Sleep threshold: 60 (balls rest when nearly motionless)
- Mass scales with ball size (density ∝ radius)

### Ball Properties
- Radius: 30-45px (based on bag count: E=12 largest, Q/K/J/X=1 smallest)
- Color: Consistent per letter (HSL based on alphabet position)
- Spawning: Drop from above, collision-checked, 50ms intervals
- Size directly correlates with bag distribution (simpler, single source of truth)

### Debug Console
- Toggle: Click 🐛 button (bottom-right)
- Live physics adjustment (gravity, friction, bounce)
- Console output capture

## Recent Changes
- **🎯 NEW: Bigram spawn system** - Complete redesign: histogram-based pair selection with distribution tracking, vowel balancing, and intelligent scoring
- Always spawns letter pairs (bigrams) instead of single letters or clusters
- Dynamic adaptation to board state using multi-factor scoring
- Legacy spawn systems kept for compatibility
- Added double-tap to delete ball feature (spawns 2 new balls after delete)
- Halved automatic ball spawning rate (10s → 20s intervals)
- Word creation now spawns 2 new balls (keeping ball count dynamic)
- Refactored into modular architecture (7 modules + main)
- Physics: Gravity 1.0, bounce 0.8

## How to Update This File
**Update when:**
- Adding/removing modules
- Changing core architecture or systems
- Major physics/gameplay adjustments
- Adding new features (word formation, scoring, etc.)

**Don't update for:**
- Minor tweaks to constants
- Bug fixes
- Code refactoring within same module
- Small physics adjustments

Keep this file under 100 lines - focus on WHAT and WHY, not HOW.
