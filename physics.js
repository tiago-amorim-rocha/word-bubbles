// physics.js - Matter.js physics engine setup and management

const v = window.__BUILD || Date.now();
const { PHYSICS, BALL } = await import(`./config.js?v=${v}`);

// Matter.js module aliases
const Engine = Matter.Engine;
const World = Matter.World;
const Bodies = Matter.Bodies;
const Body = Matter.Body;

// Create Matter.js engine
export const engine = Engine.create({
  gravity: { x: 0, y: PHYSICS.GRAVITY }
});

// Create walls (NO TOP WALL - balls spawn from above)
export function createWalls(logicalWidth, logicalHeight) {
  const wallOptions = {
    isStatic: true,
    restitution: PHYSICS.BOUNCE,
    friction: 0
  };

  const walls = [
    Bodies.rectangle(logicalWidth / 2, logicalHeight + 25, logicalWidth, 50, wallOptions), // Bottom
    Bodies.rectangle(-25, logicalHeight / 2, 50, logicalHeight, wallOptions), // Left
    Bodies.rectangle(logicalWidth + 25, logicalHeight / 2, 50, logicalHeight, wallOptions) // Right
  ];

  World.add(engine.world, walls);
  return walls;
}

// Create a ball body
export function createBallBody(x, y, radius, physics = PHYSICS) {
  // Density scales with radius to simulate 3D mass (bigger balls are proportionally heavier)
  const scaledDensity = physics.BASE_DENSITY * (radius / BALL.BASE_RADIUS);

  return Bodies.circle(x, y, radius, {
    restitution: physics.BOUNCE,
    friction: physics.FRICTION,
    density: scaledDensity,
    frictionAir: physics.AIR_FRICTION,
    slop: physics.SLOP,
    sleepThreshold: physics.SLEEP_THRESHOLD
  });
}

// Expose physics management interface to debug console
export function createPhysicsInterface(balls, walls) {
  let currentPhysics = { ...PHYSICS };

  window.gamePhysics = {
    get gravity() { return currentPhysics.GRAVITY; },
    set gravity(val) {
      currentPhysics.GRAVITY = val;
      engine.gravity.y = val;
    },
    get friction() { return currentPhysics.FRICTION; },
    set friction(val) {
      currentPhysics.FRICTION = val;
      balls.forEach(ball => {
        if (ball.body) ball.body.friction = val;
      });
    },
    get bounce() { return currentPhysics.BOUNCE; },
    set bounce(val) {
      currentPhysics.BOUNCE = val;
      balls.forEach(ball => {
        if (ball.body) ball.body.restitution = val;
      });
      walls.forEach(wall => {
        wall.restitution = val;
      });
    },
  };
}

// Update physics engine
export function updatePhysics(delta = 1000 / 60) {
  Engine.update(engine, delta);
}

// Add body to world
export function addToWorld(body) {
  World.add(engine.world, body);
}

// Remove body from world
export function removeFromWorld(body) {
  World.remove(engine.world, body);
}

// Create an invisible static bubble (acts as physical obstacle but allows word connections through)
export function createInvisibleBubble(x, y, radius) {
  const bubble = Bodies.circle(x, y, radius, {
    isStatic: true,          // Fixed position
    restitution: PHYSICS.BOUNCE,
    friction: PHYSICS.FRICTION,
    // Mark as invisible for special handling
    isInvisible: true
  });

  return bubble;
}

// Create a finger-tracking collider (draggable invisible obstacle)
export function createFingerCollider(x, y, radius) {
  const collider = Bodies.circle(x, y, radius, {
    isStatic: true,          // Static but we'll move it manually
    restitution: PHYSICS.BOUNCE,
    friction: PHYSICS.FRICTION,
    // Mark as finger collider for special handling
    isFingerCollider: true
  });

  return collider;
}

// Update finger collider position (smooth movement for physics engine)
export function updateFingerColliderPosition(collider, x, y) {
  if (!collider) return;
  Body.setPosition(collider, { x, y });
}
