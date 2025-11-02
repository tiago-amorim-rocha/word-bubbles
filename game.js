// game.js - Main game logic, canvas, spawning, and rendering

// Version-aware imports for cache busting
const v = window.__BUILD || Date.now();
const debugConsoleModule = await import(`./debugConsole.js?v=${v}`);
const letterBagModule = await import(`./letterBag.js?v=${v}`);
const configModule = await import(`./config.js?v=${v}`);
const physicsModule = await import(`./physics.js?v=${v}`);
const selectionModule = await import(`./selection.js?v=${v}`);
const wordValidatorModule = await import(`./wordValidator.js?v=${v}`);
const scoringModule = await import(`./scoring.js?v=${v}`);

const { initDebugConsole } = debugConsoleModule;
const { letterBag } = letterBagModule;
const { PHYSICS, BALL, SPAWN, SELECTION, SCORE, DANGER, FREEZE, getColorForLetter, getRadiusForLetter } = configModule;
const { engine, createWalls, createBallBody, createPhysicsInterface, updatePhysics, addToWorld, removeFromWorld } = physicsModule;
const { initSelection, handleTouchStart, handleTouchMove, handleTouchEnd, getSelection, getTouchPosition, isSelectionActive, getSelectedWord } = selectionModule;
const { wordValidator } = wordValidatorModule;
const { scoring } = scoringModule;

// Initialize debug console first
initDebugConsole();

// Game logic (protected by try/catch)
try {
  // Setup canvas
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');

  // Logical dimensions (fixed at startup - portrait only game)
  const logicalWidth = Math.round(window.visualViewport?.width || window.innerWidth);
  const logicalHeight = Math.round(window.visualViewport?.height || window.innerHeight);

  // Detect safe area insets (for iOS notch/Dynamic Island)
  function getSafeAreaTop() {
    // Try to get CSS env variable for safe-area-inset-top
    const testDiv = document.createElement('div');
    testDiv.style.cssText = 'position:fixed;top:env(safe-area-inset-top);pointer-events:none;';
    document.body.appendChild(testDiv);
    const inset = parseInt(getComputedStyle(testDiv).top) || 0;
    document.body.removeChild(testDiv);

    // If no inset detected, check if this looks like an iPhone with notch
    // (safe area needed but env() not supported/working)
    if (inset === 0 && /iPhone/.test(navigator.userAgent)) {
      // Default safe offset for iPhones with notches (44-59px typical)
      return 60;
    }

    return inset;
  }

  const safeAreaTop = getSafeAreaTop();
  console.log(`Safe area top inset: ${safeAreaTop}px`);

  // Resize canvas (visual only - game world dimensions never change)
  function resize() {
    try {
      const dpr = Math.max(1, window.devicePixelRatio || 1);
      const vw = Math.round(window.visualViewport?.width || window.innerWidth);
      const vh = Math.round(window.visualViewport?.height || window.innerHeight);

      // Ensure valid dimensions
      if (!vw || !vh || vw <= 0 || vh <= 0) {
        console.warn('Invalid viewport dimensions:', vw, vh);
        return;
      }

      canvas.style.width = vw + 'px';
      canvas.style.height = vh + 'px';
      const physicalWidth = Math.floor(vw * dpr);
      const physicalHeight = Math.floor(vh * dpr);
      canvas.width = physicalWidth;
      canvas.height = physicalHeight;

      // Check if context is valid before transform
      if (!ctx) {
        console.error('Canvas context is null or undefined');
        return;
      }

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      // Never reposition balls - game world is fixed
    } catch (err) {
      console.error('Resize error:', err?.message || String(err));
      if (err?.stack) console.error(err.stack);
    }
  }
  window.addEventListener('resize', resize);

  // Listen to visualViewport for iOS Safari
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', resize);
    window.visualViewport.addEventListener('scroll', resize);
  }

  // Initialize canvas dimensions first (without calling resize to avoid TDZ issues)
  const initialDpr = Math.max(1, window.devicePixelRatio || 1);
  const initialVw = Math.round(window.visualViewport?.width || window.innerWidth);
  const initialVh = Math.round(window.visualViewport?.height || window.innerHeight);

  canvas.style.width = initialVw + 'px';
  canvas.style.height = initialVh + 'px';
  canvas.width = Math.floor(initialVw * initialDpr);
  canvas.height = Math.floor(initialVh * initialDpr);
  ctx.setTransform(initialDpr, 0, 0, initialDpr, 0, 0);

  // Create physics walls
  const balls = [];
  const walls = createWalls(logicalWidth, logicalHeight);

  // Game state
  let isGameOver = false;

  // Danger zone tracking
  const dangerZoneY = safeAreaTop + SCORE.PADDING + SCORE.FONT_SIZE + SCORE.FONT_SIZE_HIGH + DANGER.LINE_Y_OFFSET;
  let dangerStartTime = null; // When first ball entered danger zone
  let ballsInDanger = new Set(); // Track which balls are currently in danger

  // Freeze feature tracking
  let lastTapTime = 0;
  let lastTappedBall = null;
  const frozenBalls = new Map(); // Map of ball -> { freezeTime, originalStatic }

  // Expose physics interface to debug console
  createPhysicsInterface(balls, walls);

  // Freeze/unfreeze functions
  function freezeBall(ball) {
    if (!ball || !ball.body) return;

    // Store original state and freeze time
    frozenBalls.set(ball, {
      freezeTime: Date.now(),
      originalStatic: ball.body.isStatic,
      originalVelocity: { x: ball.body.velocity.x, y: ball.body.velocity.y }
    });

    // Make ball static (frozen in place)
    Matter.Body.setStatic(ball.body, true);

    console.log(`Froze ball: ${ball.letter}`);
  }

  function unfreezeBall(ball) {
    if (!ball || !ball.body) return;

    const frozenData = frozenBalls.get(ball);
    if (!frozenData) return;

    // Restore original static state
    Matter.Body.setStatic(ball.body, frozenData.originalStatic);

    // Set velocity to zero to prevent sudden movements
    Matter.Body.setVelocity(ball.body, { x: 0, y: 0 });

    frozenBalls.delete(ball);

    console.log(`Unfroze ball: ${ball.letter}`);
  }

  // Update frozen balls and check for expiration
  function updateFrozenBalls() {
    const now = Date.now();
    const ballsToUnfreeze = [];

    frozenBalls.forEach((frozenData, ball) => {
      const elapsedTime = now - frozenData.freezeTime;

      if (elapsedTime >= FREEZE.DURATION) {
        ballsToUnfreeze.push(ball);
      }
    });

    // Unfreeze expired balls
    ballsToUnfreeze.forEach(ball => unfreezeBall(ball));
  }

  // Prepare all ball data to spawn
  const ballsToSpawn = [];
  for (let i = 0; i < BALL.NUM_BALLS; i++) {
    const letter = letterBag.draw();
    if (!letter) {
      console.error('Ran out of letters in bag!');
      break;
    }

    const radius = getRadiusForLetter(letter);

    ballsToSpawn.push({
      letter: letter,
      radius: radius,
      color: getColorForLetter(letter)
    });
  }

  console.log(`Prepared ${ballsToSpawn.length} balls to spawn`);

  // Ball spawning system - spawn balls one at a time from above
  let spawnIndex = 0;
  let lastSpawnTime = 0;
  let isRetrying = false;
  let continuousSpawnInterval = null; // Timer for continuous spawning

  // Check if a position would collide with existing balls
  function wouldCollide(x, y, radius) {
    for (const ball of balls) {
      const dx = x - ball.x;
      const dy = y - ball.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      if (distance < radius + ball.radius) {
        return true;
      }
    }
    return false;
  }

  // Spawn a single ball (used for continuous spawning)
  function spawnSingleBall() {
    const letter = letterBag.draw();
    if (!letter) {
      console.warn('Bag is empty, cannot spawn ball');
      return false;
    }

    const radius = getRadiusForLetter(letter);
    const color = getColorForLetter(letter);

    // Try to find non-colliding position
    const maxAttempts = 10;
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const spawnX = radius + Math.random() * (logicalWidth - 2 * radius);
      const spawnY = -SPAWN.ZONE_HEIGHT + Math.random() * SPAWN.ZONE_HEIGHT;

      if (!wouldCollide(spawnX, spawnY, radius)) {
        const newBall = {
          x: spawnX,
          y: spawnY,
          vx: 0,
          vy: SPAWN.INITIAL_VELOCITY,
          radius: radius,
          color: color,
          letter: letter,
        };

        newBall.body = createBallBody(newBall.x, newBall.y, newBall.radius);
        Matter.Body.setVelocity(newBall.body, { x: 0, y: SPAWN.INITIAL_VELOCITY });
        newBall.body.ballData = newBall;
        addToWorld(newBall.body);
        balls.push(newBall);

        return true;
      }
    }

    // Failed to find valid position - return letter
    letterBag.return(letter);
    console.warn('Could not find valid spawn position');
    return false;
  }

  // Spawn the next ball
  function spawnNextBall() {
    if (spawnIndex >= ballsToSpawn.length) {
      // All balls spawned - log final state and start continuous spawning
      if (spawnIndex === ballsToSpawn.length) {
        const bagState = letterBag.getState();
        console.log(`All ${balls.length} balls spawned! | Bag: ${bagState.available} available, ${bagState.inPlay} in play, ${bagState.total} total`);

        // Log letter distribution
        const letterCounts = {};
        balls.forEach(ball => {
          letterCounts[ball.letter] = (letterCounts[ball.letter] || 0) + 1;
        });
        const vowelCount = balls.filter(b => 'AEIOU'.includes(b.letter)).length;
        console.log('Letter distribution:', Object.entries(letterCounts).sort().map(([l, c]) => `${l}:${c}`).join(' '));
        console.log(`Vowels: ${vowelCount}/${balls.length} (${Math.round(vowelCount/balls.length*100)}%)`);

        // Start continuous spawning (batch of balls every interval)
        console.log(`Starting continuous spawn: ${SPAWN.BATCH_SIZE} balls every ${SPAWN.INTERVAL}ms`);
        continuousSpawnInterval = setInterval(() => {
          if (!isGameOver) {
            for (let i = 0; i < SPAWN.BATCH_SIZE; i++) {
              spawnSingleBall();
            }
          }
        }, SPAWN.INTERVAL);

        spawnIndex++; // Prevent logging multiple times
      }
      return;
    }

    const data = ballsToSpawn[spawnIndex];

    // Spawn position: random x, above screen
    const spawnX = data.radius + Math.random() * (logicalWidth - 2 * data.radius);
    const spawnY = -SPAWN.ZONE_HEIGHT + Math.random() * SPAWN.ZONE_HEIGHT;

    // Check for collision
    if (wouldCollide(spawnX, spawnY, data.radius)) {
      // Collision detected - retry after short delay
      if (!isRetrying) {
        isRetrying = true;
      }
      setTimeout(() => {
        isRetrying = false;
        spawnNextBall();
      }, SPAWN.RETRY_DELAY);
      return;
    }

    // No collision - create and add ball
    const newBall = {
      x: spawnX,
      y: spawnY,
      vx: 0,
      vy: SPAWN.INITIAL_VELOCITY,
      radius: data.radius,
      color: data.color,
      letter: data.letter,
    };

    // Create Matter.js body
    newBall.body = createBallBody(newBall.x, newBall.y, newBall.radius);

    // Set initial downward velocity
    Matter.Body.setVelocity(newBall.body, { x: 0, y: SPAWN.INITIAL_VELOCITY });

    newBall.body.ballData = newBall;
    addToWorld(newBall.body);

    balls.push(newBall);
    spawnIndex++;

    // Schedule next spawn
    setTimeout(spawnNextBall, SPAWN.DELAY);
  }

  // Start spawning after a short delay
  setTimeout(spawnNextBall, 500);

  // Process valid word - remove balls and return letters to bag
  function processValidWord(selectedBalls, word) {
    console.log(`Valid word: "${word}" - removing ${selectedBalls.length} balls`);

    // Calculate score and add points
    const points = scoring.calculateScore(word);

    // Calculate center position of selected balls for animation
    const centerX = selectedBalls.reduce((sum, ball) => sum + ball.x, 0) / selectedBalls.length;
    const centerY = selectedBalls.reduce((sum, ball) => sum + ball.y, 0) / selectedBalls.length;

    scoring.addScore(points, centerX, centerY);
    scoring.addWord(word, points);
    console.log(`+${points} points! Score: ${scoring.getScore()}`);

    // Remove balls from physics world and from balls array
    selectedBalls.forEach(ball => {
      // Remove from frozen balls if frozen
      if (frozenBalls.has(ball)) {
        frozenBalls.delete(ball);
      }

      // Remove from Matter.js world
      if (ball.body) {
        removeFromWorld(ball.body);
      }

      // Return letter to bag
      letterBag.return(ball.letter);

      // Remove from balls array
      const index = balls.indexOf(ball);
      if (index > -1) {
        balls.splice(index, 1);
      }
    });

    console.log(`Removed ${selectedBalls.length} balls | ${balls.length} balls remaining | Bag: ${letterBag.getState().available} available`);
  }

  // Update danger zone tracking
  function updateDangerZone() {
    if (isGameOver) return;

    // Clear previous danger set
    ballsInDanger.clear();

    // Check which balls are in danger (top edge touching danger line)
    // Only count slow-moving balls (not freshly spawned balls falling down)
    balls.forEach(ball => {
      const ballTopEdge = ball.y - ball.radius;
      const speed = Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy);

      // Only trigger danger for balls that are moving slowly (settled or near-settled)
      if (ballTopEdge <= dangerZoneY && speed < DANGER.VELOCITY_THRESHOLD) {
        ballsInDanger.add(ball);
      }
    });

    // Update danger timer
    if (ballsInDanger.size > 0) {
      if (dangerStartTime === null) {
        dangerStartTime = Date.now();
        console.log('⚠️ Ball entered danger zone!');
      }

      const timeInDanger = Date.now() - dangerStartTime;
      if (timeInDanger >= DANGER.THRESHOLD_TIME) {
        // Game over!
        triggerGameOver();
      }
    } else {
      // No balls in danger - reset timer
      if (dangerStartTime !== null) {
        console.log('✓ Danger cleared');
      }
      dangerStartTime = null;
    }
  }

  // Trigger game over
  function triggerGameOver() {
    if (isGameOver) return;

    isGameOver = true;
    console.log('💀 GAME OVER - Screen full!');

    // Stop continuous spawning
    if (continuousSpawnInterval) {
      clearInterval(continuousSpawnInterval);
      continuousSpawnInterval = null;
    }

    // Log final stats
    const finalScore = scoring.getScore();
    const words = scoring.getWords();
    console.log(`Final Score: ${finalScore}`);
    console.log(`Words formed: ${words.length}`);
  }

  // Restart game
  function restartGame() {
    console.log('🔄 Restarting game...');

    // Reset game state
    isGameOver = false;
    dangerStartTime = null;
    ballsInDanger.clear();

    // Clear frozen balls tracking
    frozenBalls.clear();
    lastTapTime = 0;
    lastTappedBall = null;

    // Clear continuous spawning if active
    if (continuousSpawnInterval) {
      clearInterval(continuousSpawnInterval);
      continuousSpawnInterval = null;
    }

    // Remove all balls from physics world
    balls.forEach(ball => {
      if (ball.body) {
        removeFromWorld(ball.body);
      }
      letterBag.return(ball.letter);
    });
    balls.length = 0; // Clear array

    // Reset scoring
    scoring.resetScore();

    // Reset spawning
    spawnIndex = 0;
    isRetrying = false;

    // Prepare new balls to spawn
    ballsToSpawn.length = 0;
    for (let i = 0; i < BALL.NUM_BALLS; i++) {
      const letter = letterBag.draw();
      if (!letter) {
        console.error('Ran out of letters in bag!');
        break;
      }

      const radius = getRadiusForLetter(letter);
      ballsToSpawn.push({
        letter: letter,
        radius: radius,
        color: getColorForLetter(letter)
      });
    }

    // Start spawning again
    setTimeout(spawnNextBall, 500);

    console.log('✓ Game restarted');
  }

  // Initialize selection system
  initSelection(balls);

  // Touch event handlers
  canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    const touch = e.touches[0];
    const rect = canvas.getBoundingClientRect();
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;

    // Check for restart button click when game over
    if (isGameOver && window.restartButtonBounds) {
      const btn = window.restartButtonBounds;
      if (x >= btn.x && x <= btn.x + btn.width && y >= btn.y && y <= btn.y + btn.height) {
        restartGame();
        return;
      }
    }

    // Normal touch handling (only if game not over)
    if (isGameOver) return;

    // Check for double-tap on a ball to freeze it
    const now = Date.now();
    const tappedBall = balls.find(ball => {
      const dx = x - ball.x;
      const dy = y - ball.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      return distance <= ball.radius;
    });

    if (tappedBall) {
      // Check if this is a double-tap
      if (lastTappedBall === tappedBall && (now - lastTapTime) <= FREEZE.DOUBLE_TAP_DELAY) {
        // Double-tap detected!
        if (frozenBalls.has(tappedBall)) {
          // Ball is already frozen - unfreeze it
          unfreezeBall(tappedBall);
        } else {
          // Freeze the ball
          freezeBall(tappedBall);
        }

        // Reset double-tap tracking
        lastTapTime = 0;
        lastTappedBall = null;
        return; // Don't start selection when double-tapping
      } else {
        // First tap - track it
        lastTapTime = now;
        lastTappedBall = tappedBall;
      }
    } else {
      // Tapped empty space - reset tracking
      lastTapTime = 0;
      lastTappedBall = null;
    }

    handleTouchStart(x, y);
  }, { passive: false });

  canvas.addEventListener('touchmove', (e) => {
    if (isGameOver) return;
    e.preventDefault();
    const touch = e.touches[0];
    const rect = canvas.getBoundingClientRect();
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;

    handleTouchMove(x, y);
  }, { passive: false });

  canvas.addEventListener('touchend', (e) => {
    if (isGameOver) return;
    e.preventDefault();
    const result = handleTouchEnd();

    // Validate word and process if valid
    if (result && result.word && result.balls.length >= 2) {
      const isValid = wordValidator.isValid(result.word);

      if (isValid) {
        processValidWord(result.balls, result.word);
      } else {
        console.log(`Invalid word: "${result.word}"`);
      }
    }
  }, { passive: false });

  // Main draw loop
  function draw() {
    ctx.clearRect(0, 0, logicalWidth, logicalHeight);

    // Update Matter.js physics (only if game is not over)
    if (!isGameOver) {
      updatePhysics();
      updateFrozenBalls(); // Update freeze timers
    }

    // Update danger zone
    updateDangerZone();

    // Sync ball positions from Matter.js bodies
    balls.forEach(ball => {
      ball.x = ball.body.position.x;
      ball.y = ball.body.position.y;
      ball.vx = ball.body.velocity.x;
      ball.vy = ball.body.velocity.y;

      // Determine ball color (frozen or normal)
      let ballColor = ball.color;
      const frozenData = frozenBalls.get(ball);

      if (frozenData) {
        // Ball is frozen
        const now = Date.now();
        const elapsedTime = now - frozenData.freezeTime;
        const timeRemaining = FREEZE.DURATION - elapsedTime;

        // Pulse between white and gray in the last 3 seconds
        if (timeRemaining <= FREEZE.WARNING_TIME) {
          const pulsePhase = Math.floor(now / FREEZE.PULSE_SPEED) % 2;
          ballColor = pulsePhase === 0 ? FREEZE.FROZEN_COLOR : FREEZE.PULSE_COLOR;
        } else {
          // Solid white when frozen (not pulsing yet)
          ballColor = FREEZE.FROZEN_COLOR;
        }
      }

      // Draw ball circle
      ctx.fillStyle = ballColor;
      ctx.beginPath();
      ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
      ctx.fill();

      // Draw letter on ball (font size scales with radius)
      ctx.fillStyle = '#000';
      const fontSize = Math.round(ball.radius * 0.65); // Font size proportional to ball size
      ctx.font = `bold ${fontSize}px system-ui, -apple-system, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(ball.letter, ball.x, ball.y);
    });

    // Draw selection overlay
    const selectedBalls = getSelection();
    if (selectedBalls.length > 0) {
      // Draw connecting lines
      if (selectedBalls.length > 1) {
        ctx.strokeStyle = SELECTION.LINE_COLOR;
        ctx.lineWidth = SELECTION.LINE_WIDTH;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        ctx.beginPath();
        ctx.moveTo(selectedBalls[0].x, selectedBalls[0].y);
        for (let i = 1; i < selectedBalls.length; i++) {
          ctx.lineTo(selectedBalls[i].x, selectedBalls[i].y);
        }
        ctx.stroke();
      }

      // Draw preview line from last selected ball to current touch position
      if (isSelectionActive()) {
        const touchPos = getTouchPosition();
        if (touchPos) {
          ctx.strokeStyle = SELECTION.LINE_COLOR;
          ctx.lineWidth = SELECTION.LINE_WIDTH;
          ctx.globalAlpha = 0.5;
          ctx.lineCap = 'round';

          ctx.beginPath();
          const lastBall = selectedBalls[selectedBalls.length - 1];
          ctx.moveTo(lastBall.x, lastBall.y);
          ctx.lineTo(touchPos.x, touchPos.y);
          ctx.stroke();

          ctx.globalAlpha = 1.0;
        }
      }

      // Highlight selected balls
      selectedBalls.forEach(ball => {
        ctx.strokeStyle = SELECTION.HIGHLIGHT_COLOR;
        ctx.lineWidth = SELECTION.STROKE_WIDTH;
        ctx.beginPath();
        ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
        ctx.stroke();
      });

      // Display selected word (neutral, no validation during selection)
      const word = getSelectedWord();
      if (word) {
        ctx.font = 'bold 24px system-ui, -apple-system, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';

        const textWidth = ctx.measureText(word).width;
        const padding = 12;
        const boxWidth = textWidth + padding * 2;
        const boxHeight = 40;
        const boxX = logicalWidth / 2 - boxWidth / 2;
        const boxY = safeAreaTop + 10; // Safe area top + 10px padding

        // Background box (neutral white)
        ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
        ctx.fillRect(boxX, boxY, boxWidth, boxHeight);

        // Border (neutral)
        ctx.strokeStyle = SELECTION.HIGHLIGHT_COLOR;
        ctx.lineWidth = 2;
        ctx.strokeRect(boxX, boxY, boxWidth, boxHeight);

        // Text
        ctx.fillStyle = '#000';
        ctx.fillText(word, logicalWidth / 2, boxY + 8);
      }
    }

    // Draw danger line
    const isDanger = ballsInDanger.size > 0;
    const timeInDanger = isDanger ? Date.now() - dangerStartTime : 0;
    const timeRemaining = Math.max(0, DANGER.THRESHOLD_TIME - timeInDanger);

    // Line color - flash red when in danger
    let lineColor = DANGER.LINE_COLOR;
    if (isDanger) {
      const flashPhase = Math.floor(Date.now() / DANGER.WARNING_FLASH_SPEED) % 2;
      lineColor = flashPhase === 0 ? DANGER.LINE_COLOR_DANGER : DANGER.LINE_COLOR;
    }

    ctx.save();
    ctx.strokeStyle = lineColor;
    ctx.lineWidth = DANGER.LINE_WIDTH;
    ctx.setLineDash(DANGER.LINE_DASH);
    ctx.beginPath();
    ctx.moveTo(0, dangerZoneY);
    ctx.lineTo(logicalWidth, dangerZoneY);
    ctx.stroke();
    ctx.setLineDash([]); // Reset dash
    ctx.restore();

    // Draw danger timer if balls in danger
    if (isDanger && !isGameOver) {
      const secondsRemaining = Math.ceil(timeRemaining / 1000);
      ctx.font = 'bold 16px system-ui, -apple-system, sans-serif';
      ctx.fillStyle = DANGER.WARNING_COLOR;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillText(`⚠️ ${secondsRemaining}s`, logicalWidth / 2, dangerZoneY - 5);
    }

    // Update and render score animations
    scoring.updateAnimations();
    const animations = scoring.getAnimations();
    animations.forEach(anim => {
      ctx.save();
      ctx.globalAlpha = anim.opacity;
      ctx.font = `${SCORE.ANIMATION_FONT_WEIGHT} ${SCORE.ANIMATION_FONT_SIZE}px system-ui, -apple-system, sans-serif`;
      ctx.fillStyle = SCORE.ANIMATION_COLOR;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`+${anim.points}`, anim.x, anim.y);
      ctx.restore();
    });

    // Render score display (top-right corner)
    const currentScore = scoring.getScore();
    const highScore = scoring.getHighScore();

    ctx.textAlign = 'right';
    ctx.textBaseline = 'top';

    // Current score
    ctx.font = `bold ${SCORE.FONT_SIZE}px system-ui, -apple-system, sans-serif`;
    ctx.fillStyle = SCORE.COLOR;
    ctx.fillText(`Score: ${currentScore}`, logicalWidth - SCORE.PADDING, safeAreaTop + SCORE.PADDING);

    // High score (below current score)
    ctx.font = `${SCORE.FONT_SIZE_HIGH}px system-ui, -apple-system, sans-serif`;
    ctx.fillStyle = SCORE.HIGH_SCORE_COLOR;
    ctx.fillText(`Best: ${highScore}`, logicalWidth - SCORE.PADDING, safeAreaTop + SCORE.PADDING + SCORE.FONT_SIZE + 4);

    // Draw game over UI
    if (isGameOver) {
      // Semi-transparent overlay
      ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
      ctx.fillRect(0, 0, logicalWidth, logicalHeight);

      // Final score
      ctx.fillStyle = '#FFF';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.font = 'bold 48px system-ui, -apple-system, sans-serif';
      ctx.fillText(currentScore.toString(), logicalWidth / 2, logicalHeight * 0.15);

      // "Final Score" label
      ctx.font = '20px system-ui, -apple-system, sans-serif';
      ctx.fillStyle = '#AAA';
      ctx.fillText('Final Score', logicalWidth / 2, logicalHeight * 0.15 + 55);

      // Words list
      const words = scoring.getWords();
      ctx.font = '16px system-ui, -apple-system, sans-serif';
      ctx.fillStyle = '#FFF';

      const wordsStartY = logicalHeight * 0.32;
      const maxWordsToShow = 10;
      const wordsToShow = words.slice(-maxWordsToShow); // Show last 10 words

      if (words.length > 0) {
        ctx.fillStyle = '#AAA';
        ctx.fillText(`Words Formed (${words.length})`, logicalWidth / 2, wordsStartY - 30);

        wordsToShow.forEach((wordData, index) => {
          ctx.fillStyle = '#FFF';
          const y = wordsStartY + (index * 28);
          ctx.fillText(`${wordData.word.toUpperCase()} — ${wordData.points}`, logicalWidth / 2, y);
        });

        if (words.length > maxWordsToShow) {
          ctx.fillStyle = '#888';
          ctx.fillText(`...and ${words.length - maxWordsToShow} more`, logicalWidth / 2, wordsStartY + (maxWordsToShow * 28));
        }
      } else {
        ctx.fillStyle = '#888';
        ctx.fillText('No words formed', logicalWidth / 2, wordsStartY);
      }

      // Restart button
      const buttonY = logicalHeight - 120;
      const buttonWidth = 200;
      const buttonHeight = 50;
      const buttonX = (logicalWidth - buttonWidth) / 2;

      // Button background
      ctx.fillStyle = '#4CAF50';
      ctx.fillRect(buttonX, buttonY, buttonWidth, buttonHeight);

      // Button text
      ctx.fillStyle = '#FFF';
      ctx.font = 'bold 20px system-ui, -apple-system, sans-serif';
      ctx.textBaseline = 'middle';
      ctx.fillText('Restart', logicalWidth / 2, buttonY + buttonHeight / 2);

      // Store button bounds for click detection
      window.restartButtonBounds = { x: buttonX, y: buttonY, width: buttonWidth, height: buttonHeight };
    }

    requestAnimationFrame(draw);
  }
  draw();

  console.log(`Matter.js physics engine initialized. Spawning ${ballsToSpawn.length} balls...`);
  console.log('Game initialized successfully!');
} catch (e) {
  console.error('Game initialization error:', e?.message || String(e));
  if (e?.stack) console.error(e.stack);
}
