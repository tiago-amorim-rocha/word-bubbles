# Hello World - Letter Ball Physics Game

## Quick Context
A physics-based game where letter balls (A-Z) drop from above and settle using Matter.js. Ball size and mass correlate with letter frequency in English.

## Architecture (6 modules + 1 main)

```
index.html             - Entry point, loads game.js as ES6 module
├── config.js          - All constants (physics, spawning, sizes)
├── debugConsole.js    - Debug UI with physics controls (self-contained)
├── letterBag.js       - Legacy letter bag (kept for compatibility)
├── wordSpawnSystem.js - Advanced spawn system: weighted bags, clusters, positional bias
├── physics.js         - Matter.js engine setup & physics helpers
└── game.js            - Main: canvas, spawning, rendering, coordination
```

## Key Systems

### Word Spawn System
- **Infinite weighted bag** (~130 total weight, 40% vowels, 60% consonants)
- **Cluster spawning** (15% chance): Multi-letter fragments (TH, ING, ER, etc.) spawn close together
- **Positional bias**: Letters biased by screen region (Starters left, Middles center, Enders right)
- **Auto-balancing**: Monitors vowel % every 5 spawns, adjusts next 5 spawns if needed
- **Region-aware clusters**: Prefixes spawn left (UN, RE), suffixes right (ED, LY), middles center (ING, AND)
- Configuration exposed as `window.SPAWN_CONFIG` for live tuning
- Legacy letterBag.js kept for compatibility (still used for return tracking)

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
- **NEW: Word spawn system** - Intelligent letter spawning with clusters, positional bias, and auto-balancing
- Removed freeze ball feature (replaced with delete ball)
- Added double-tap to delete ball feature (spawns 2 new balls after delete)
- Halved automatic ball spawning rate (10s → 20s intervals)
- Word creation now spawns 2 new balls (keeping ball count dynamic)
- Removed tap-to-force explosion mechanic
- Refactored into modular architecture (6 modules + main)
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
