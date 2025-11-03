# Hello World - Letter Ball Physics Game

## Quick Context
A physics-based game where letter balls (A-Z) drop from above and settle using Matter.js. Ball size and mass correlate with letter frequency in English.

## Architecture (5 modules + 1 main)

```
index.html          - Entry point, loads game.js as ES6 module
├── config.js       - All constants (physics, spawning, sizes)
├── debugConsole.js - Debug UI with physics controls (self-contained)
├── letterBag.js    - Letter distribution & bag management (Scrabble-like)
├── physics.js      - Matter.js engine setup & physics helpers
└── game.js         - Main: canvas, spawning, rendering, coordination
```

## Key Systems

### Letter Bag System
- 100-letter pool optimized for word formation (32% vowels, 68% consonants)
- Reduced vowel ratio vs Scrabble (32% vs 42%) for better variety with 40 balls on screen
- Letters can be drawn and returned (for future word removal feature)
- Exposed as `window.letterBag`

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
- Removed freeze ball feature (replaced with delete ball)
- Added double-tap to delete ball feature (spawns 2 new balls after delete)
- Halved automatic ball spawning rate (10s → 20s intervals)
- Word creation now spawns 2 new balls (keeping ball count dynamic)
- Removed tap-to-force explosion mechanic
- Refactored into modular architecture (5 modules + main)
- Physics stability improvements (reduced jitter, better settling)
- Gravity at 1.0, bounce at 0.8

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
