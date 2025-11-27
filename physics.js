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

// Gyroscope integration for dynamic gravity
let gyroscopeEnabled = false;
let gyroscopePermissionGranted = false;

// Initialize gyroscope (request permission for iOS 13+)
export async function initGyroscope() {
  // Check if DeviceOrientation API is available
  if (!window.DeviceOrientationEvent) {
    console.warn('DeviceOrientation API not supported');
    return false;
  }

  // iOS 13+ requires permission request
  if (typeof DeviceOrientationEvent.requestPermission === 'function') {
    try {
      const permission = await DeviceOrientationEvent.requestPermission();
      if (permission === 'granted') {
        gyroscopePermissionGranted = true;
        enableGyroscope();
        return true;
      } else {
        console.warn('Gyroscope permission denied');
        return false;
      }
    } catch (error) {
      console.error('Error requesting gyroscope permission:', error);
      return false;
    }
  } else {
    // Non-iOS or older iOS - no permission needed
    gyroscopePermissionGranted = true;
    enableGyroscope();
    return true;
  }
}

// Enable gyroscope tracking
function enableGyroscope() {
  if (gyroscopeEnabled) return;

  window.addEventListener('deviceorientation', handleOrientation);
  gyroscopeEnabled = true;
  console.log('✓ Gyroscope enabled - gravity will follow device tilt');
}

// Disable gyroscope tracking
export function disableGyroscope() {
  if (!gyroscopeEnabled) return;

  window.removeEventListener('deviceorientation', handleOrientation);
  gyroscopeEnabled = false;

  // Reset gravity to default downward
  engine.gravity.x = 0;
  engine.gravity.y = PHYSICS.GRAVITY;
  console.log('✓ Gyroscope disabled - gravity reset to default');
}

// Handle device orientation changes
function handleOrientation(event) {
  if (!gyroscopeEnabled) return;

  // beta: front-to-back tilt (-180 to 180, positive = forward)
  // gamma: left-to-right tilt (-90 to 90, positive = right)
  const beta = event.beta;
  const gamma = event.gamma;

  if (beta === null || gamma === null) return;

  // Convert tilt angles to gravity components
  // We want the gravity to "pull" in the direction the device is tilted
  // gamma controls x-axis (left/right tilt)
  // beta controls y-axis (forward/back tilt)

  // Normalize gamma to -1 to 1 range (clamp at ±90 degrees)
  const maxTilt = 90; // degrees
  const normalizedGamma = Math.max(-1, Math.min(1, gamma / maxTilt));

  // For beta, we need to handle the phone orientation
  // When phone is upright (beta ≈ 90), gravity should be downward
  // When tilted forward (beta > 90), gravity should increase downward
  // When tilted backward (beta < 90), gravity should reverse upward

  // Adjust beta relative to upright position (90 degrees)
  const betaFromUpright = beta - 90;
  const normalizedBeta = Math.max(-1, Math.min(1, betaFromUpright / maxTilt));

  // Calculate gravity components
  // X component: based on left/right tilt
  const gravityX = normalizedGamma * PHYSICS.GRAVITY;

  // Y component: based on forward/back tilt
  // When upright (normalizedBeta = 0), gravity is normal (positive Y)
  // When tilted forward (normalizedBeta > 0), gravity increases
  // When tilted backward (normalizedBeta < 0), gravity decreases or reverses
  const gravityY = PHYSICS.GRAVITY * (1 + normalizedBeta);

  // Update engine gravity
  engine.gravity.x = gravityX;
  engine.gravity.y = gravityY;
}

// Get gyroscope status
export function getGyroscopeStatus() {
  return {
    available: typeof window.DeviceOrientationEvent !== 'undefined',
    enabled: gyroscopeEnabled,
    permissionGranted: gyroscopePermissionGranted
  };
}

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
