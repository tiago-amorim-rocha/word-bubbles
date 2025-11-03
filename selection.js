// selection.js - Multi-ball selection with line-of-sight validation

const v = window.__BUILD || Date.now();
const { SELECTION } = await import(`./config.js?v=${v}`);

// Selection state
let selectedBalls = [];
let isDragging = false;
let currentTouchPos = null;

// Get all balls (will be set by game.js)
let allBalls = [];
let invisibleBubble = null;

// Initialize selection system
export function initSelection(balls, invBubble = null) {
  allBalls = balls;
  invisibleBubble = invBubble;
}

// Get current selection
export function getSelection() {
  return selectedBalls;
}

// Clear selection
export function clearSelection() {
  selectedBalls = [];
  isDragging = false;
  currentTouchPos = null;
}

// Get current touch position (for rendering preview)
export function getTouchPosition() {
  return currentTouchPos;
}

// Check if currently dragging
export function isSelectionActive() {
  return isDragging;
}

// Find ball at given position
function findBallAtPosition(x, y) {
  for (const ball of allBalls) {
    const dx = x - ball.x;
    const dy = y - ball.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    if (distance <= ball.radius) {
      return ball;
    }
  }
  return null;
}

// Calculate distance between two points
function getDistance(x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  return Math.sqrt(dx * dx + dy * dy);
}

// Check if a line segment from (x1,y1) to (x2,y2) intersects with a circle at (cx,cy) with radius r
function lineIntersectsCircle(x1, y1, x2, y2, cx, cy, r) {
  // Vector from line start to circle center
  const dx = cx - x1;
  const dy = cy - y1;

  // Line direction vector
  const lx = x2 - x1;
  const ly = y2 - y1;

  // Line length squared
  const lineLengthSq = lx * lx + ly * ly;

  // Project circle center onto line (clamped to segment)
  let t = (dx * lx + dy * ly) / lineLengthSq;
  t = Math.max(0, Math.min(1, t));

  // Closest point on line segment to circle center
  const closestX = x1 + t * lx;
  const closestY = y1 + t * ly;

  // Distance from circle center to closest point
  const distX = cx - closestX;
  const distY = cy - closestY;
  const distSq = distX * distX + distY * distY;

  // Check if distance is less than radius
  return distSq < r * r;
}

// Check if there's a clear line of sight between two balls (no other balls blocking)
function hasLineOfSight(ball1, ball2) {
  const x1 = ball1.x;
  const y1 = ball1.y;
  const x2 = ball2.x;
  const y2 = ball2.y;

  // Check if any other ball intersects the line
  for (const ball of allBalls) {
    // Skip the two balls we're checking between
    if (ball === ball1 || ball === ball2) continue;

    // Check if line from ball1 to ball2 intersects this ball
    if (lineIntersectsCircle(x1, y1, x2, y2, ball.x, ball.y, ball.radius)) {
      return false;
    }
  }

  return true;
}

// Check if distance is within valid range
function isWithinRange(ball1, ball2) {
  const dist = getDistance(ball1.x, ball1.y, ball2.x, ball2.y);
  return dist <= SELECTION.MAX_DISTANCE;
}

// Handle touch start
export function handleTouchStart(x, y) {
  const ball = findBallAtPosition(x, y);

  if (ball) {
    selectedBalls = [ball];
    isDragging = true;
    currentTouchPos = { x, y };
    return true;
  }

  return false;
}

// Handle touch move
export function handleTouchMove(x, y) {
  if (!isDragging) return false;

  currentTouchPos = { x, y };

  const ball = findBallAtPosition(x, y);

  if (!ball) return false;

  // Check if this ball is already in the selection
  const existingIndex = selectedBalls.indexOf(ball);

  if (existingIndex !== -1) {
    // Ball is already selected - check if we should deselect (remove balls after this one)
    if (existingIndex < selectedBalls.length - 1) {
      // Remove all balls after this one
      selectedBalls = selectedBalls.slice(0, existingIndex + 1);
    }
    return true;
  }

  // New ball - check if we can add it
  if (selectedBalls.length === 0) {
    selectedBalls = [ball];
    return true;
  }

  const lastBall = selectedBalls[selectedBalls.length - 1];

  // Check distance and line of sight
  if (isWithinRange(lastBall, ball) && hasLineOfSight(lastBall, ball)) {
    selectedBalls.push(ball);
    return true;
  }

  return false;
}

// Handle touch end - returns selected balls and word for processing
export function handleTouchEnd() {
  const result = {
    balls: [...selectedBalls],
    word: getSelectedWord()
  };

  clearSelection();

  return result;
}

// Get selected word (for future word validation)
export function getSelectedWord() {
  return selectedBalls.map(ball => ball.letter).join('');
}
