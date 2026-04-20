/*
 * Neon Trail Riders
 *
 * A fast‑paced light‑cycle survival game. Guide your bike around a
 * glowing grid, leaving behind a persistent light trail. Crashing
 * into your own trail or the arena walls ends the run. Collect
 * pulsing orbs to clear part of your trail and earn bonus points – a
 * handy way to carve out breathing room when the arena gets tight.
 * Difficulty ramps up as you accelerate over time. Submit your best
 * score to the PIXEL‑NET leaderboard. Controls: move with WASD or
 * arrow keys. Press Enter to restart after a crash.
 */

(function() {
  const canvas = document.getElementById('gameCanvas');
  const ctx = canvas.getContext('2d');
  const WIDTH = 640;
  const HEIGHT = 480;
  canvas.width = WIDTH;
  canvas.height = HEIGHT;

  // Grid settings. A small cell size yields smooth motion but still
  // discrete positions, which simplifies collision checks.
  const CELL = 12;
  const COLS = Math.floor(WIDTH / CELL);
  const ROWS = Math.floor(HEIGHT / CELL);

  // Direction state. nextDir holds the requested direction; dir is
  // applied on each step if it isn't a reverse turn.
  let dir = 'right';
  let nextDir = 'right';

  // Player head position in grid coordinates.
  let player = { x: Math.floor(COLS / 2), y: Math.floor(ROWS / 2) };

  // The trail array stores every previous position of the player
  // (excluding the current head). A Set of linearised indices is
  // maintained for fast collision checks.
  let trail = [];
  let occupied = new Set();

  // Pulsing orb that clears some of the trail when collected.
  let orb = null;

  // Score and pacing.
  let score = 0;
  let stepInterval = 160; // ms between moves; decreases over time

  // Game state flags
  let gameOver = false;
  let submitted = false;

  // Timing helpers
  let lastStep = performance.now();

  // Screen shake amplitude; decays over frames.
  let shake = 0;

  // Particle effects for orb pickups
  let particles = [];

  // Convert (x,y) to a unique key for the occupied Set
  function key(x, y) {
    return x + y * COLS;
  }

  // Spawn a new orb at a random unoccupied cell. Avoid edges so the
  // orb doesn't spawn right on the border where it’s hard to reach.
  function spawnOrb() {
    const free = [];
    for (let y = 1; y < ROWS - 1; y++) {
      for (let x = 1; x < COLS - 1; x++) {
        if (!occupied.has(key(x, y)) && !(x === player.x && y === player.y)) {
          free.push({ x, y });
        }
      }
    }
    if (free.length > 0) {
      orb = free[Math.floor(Math.random() * free.length)];
    } else {
      orb = null;
    }
  }

  // Reset all state to start a fresh run.
  function reset() {
    player = { x: Math.floor(COLS / 2), y: Math.floor(ROWS / 2) };
    dir = 'right';
    nextDir = 'right';
    trail = [];
    occupied = new Set();
    occupied.add(key(player.x, player.y));
    orb = null;
    score = 0;
    stepInterval = 160;
    gameOver = false;
    submitted = false;
    lastStep = performance.now();
    shake = 0;
    particles = [];
    spawnOrb();
  }

  // Handle directional input. Prevent immediate 180° reversals by
  // deferring the change until the next step.
  window.addEventListener('keydown', (e) => {
    const code = e.code;
    if (code === 'ArrowUp' || code === 'KeyW') nextDir = 'up';
    else if (code === 'ArrowDown' || code === 'KeyS') nextDir = 'down';
    else if (code === 'ArrowLeft' || code === 'KeyA') nextDir = 'left';
    else if (code === 'ArrowRight' || code === 'KeyD') nextDir = 'right';
    else if (gameOver && code === 'Enter') {
      reset();
    }
  });

  // Mobile controls: swipe on the canvas to change direction.
  // We only capture touch events on the canvas so the page can still
  // scroll when swiping outside the game.
  let t0 = null;
  canvas.addEventListener('touchstart', (e) => {
    if (e.touches && e.touches[0]) {
      t0 = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }
    if (gameOver) {
      e.preventDefault();
    }
  }, { passive: false });
  canvas.addEventListener('touchmove', (e) => e.preventDefault(), { passive: false });
  canvas.addEventListener('touchend', (e) => {
    if (gameOver) {
      reset();
      return;
    }
    if (!t0) return;
    const t1 = (e.changedTouches && e.changedTouches[0]) ? e.changedTouches[0] : null;
    if (!t1) return;
    const dx = t1.clientX - t0.x;
    const dy = t1.clientY - t0.y;
    const ax = Math.abs(dx), ay = Math.abs(dy);
    if (ax < 18 && ay < 18) return; // ignore tiny swipes
    if (ax > ay) nextDir = dx > 0 ? 'right' : 'left';
    else nextDir = dy > 0 ? 'down' : 'up';
  }, { passive: true });

  // Advance the game state on a fixed time step. Each step moves the
  // player one cell in the current direction, checks for collisions,
  // processes orb collection and trail clearing, and gradually
  // increases the pace.
  function update() {
    const now = performance.now();
    if (!gameOver && now - lastStep >= stepInterval) {
      lastStep = now;
      // Apply the buffered direction if it isn't a direct reversal
      if (
        (nextDir === 'up' && dir !== 'down') ||
        (nextDir === 'down' && dir !== 'up') ||
        (nextDir === 'left' && dir !== 'right') ||
        (nextDir === 'right' && dir !== 'left')
      ) {
        dir = nextDir;
      }
      // Compute the next cell
      let nx = player.x;
      let ny = player.y;
      if (dir === 'up') ny--;
      else if (dir === 'down') ny++;
      else if (dir === 'left') nx--;
      else if (dir === 'right') nx++;

      // Check border and trail collisions
      if (nx < 0 || nx >= COLS || ny < 0 || ny >= ROWS || occupied.has(key(nx, ny))) {
        gameOver = true;
      } else {
        // Append current head position to the trail
        trail.push({ x: player.x, y: player.y });
        occupied.add(key(nx, ny));
        player.x = nx;
        player.y = ny;
        // Increment score for each successful move
        score += 1;
        // Ensure an orb exists
        if (!orb) spawnOrb();
        // Orb collection
        if (orb && orb.x === player.x && orb.y === player.y) {
          score += 50;
          // Remove a chunk of the oldest trail to create space
          const removeCount = Math.min(25, trail.length);
          for (let i = 0; i < removeCount; i++) {
            const seg = trail.shift();
            occupied.delete(key(seg.x, seg.y));
          }
          // Spawn particles for a satisfying pickup effect
          for (let i = 0; i < 20; i++) {
            particles.push({
              x: (orb.x + 0.5) * CELL,
              y: (orb.y + 0.5) * CELL,
              vx: (Math.random() - 0.5) * 2,
              vy: (Math.random() - 0.5) * 2,
              life: 1,
              color: '#f356d6'
            });
          }
          // Trigger a brief screen shake
          shake = 8;
          orb = null;
          spawnOrb();
        }
        // Accelerate the game gradually to ramp up difficulty
        stepInterval = Math.max(80, stepInterval - 0.05);
      }
    }
    // Update particle motion and fade them over time
    particles = particles.filter(p => p.life > 0);
    particles.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;
      p.vx *= 0.98;
      p.vy *= 0.98;
      p.life -= 0.02;
    });
  }

  // Render the current game state. We draw the grid, trail,
  // particles, orb and player with neon colours, applying a small
  // camera shake on pickups. An overlay appears on game over.
  function draw() {
    // Compute shake offsets
    let offsetX = 0;
    let offsetY = 0;
    if (shake > 0) {
      offsetX = (Math.random() * 2 - 1) * shake;
      offsetY = (Math.random() * 2 - 1) * shake;
      shake *= 0.9;
      if (shake < 0.5) shake = 0;
    }

    ctx.save();
    ctx.translate(offsetX, offsetY);
    // Background
    ctx.fillStyle = '#01012b';
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    // Subtle grid to enhance the cyber feel
    ctx.strokeStyle = '#08f7fe11';
    ctx.lineWidth = 1;
    for (let x = 0; x <= WIDTH; x += CELL) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, HEIGHT);
      ctx.stroke();
    }
    for (let y = 0; y <= HEIGHT; y += CELL) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(WIDTH, y);
      ctx.stroke();
    }
    // Draw trail with fading alpha for older segments
    const n = trail.length;
    trail.forEach((seg, i) => {
      const alpha = Math.min(1, i / n + 0.2);
      ctx.fillStyle = `rgba(8, 247, 254, ${alpha})`;
      ctx.fillRect(seg.x * CELL + 1, seg.y * CELL + 1, CELL - 2, CELL - 2);
    });
    // Draw orb
    if (orb) {
      const cx = (orb.x + 0.5) * CELL;
      const cy = (orb.y + 0.5) * CELL;
      const rad = CELL * 0.4;
      const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, rad);
      grad.addColorStop(0, '#fe53bb');
      grad.addColorStop(1, '#fe53bb00');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(cx, cy, rad, 0, Math.PI * 2);
      ctx.fill();
    }
    // Draw player head
    ctx.fillStyle = '#00f7fe';
    ctx.fillRect(player.x * CELL + 1, player.y * CELL + 1, CELL - 2, CELL - 2);
    // Draw particles
    particles.forEach(p => {
      const a = Math.max(0, Math.min(1, p.life));
      ctx.fillStyle = p.color + Math.floor(a * 255).toString(16).padStart(2, '0');
      ctx.fillRect(p.x, p.y, 2, 2);
    });
    // Score display
    ctx.fillStyle = '#ffffff';
    ctx.font = '18px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`Score: ${Math.floor(score)}`, 10, 24);
    // Game over overlay
    if (gameOver) {
      maybeSubmitScore();
      ctx.fillStyle = 'rgba(0,0,0,0.65)';
      ctx.fillRect(0, 0, WIDTH, HEIGHT);
      ctx.fillStyle = '#ffffff';
      ctx.font = '32px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Game Over', WIDTH / 2, HEIGHT / 2 - 20);
      ctx.font = '20px sans-serif';
      ctx.fillText(`Final Score: ${Math.floor(score)}`, WIDTH / 2, HEIGHT / 2 + 10);
      ctx.fillText('Press Enter to Restart', WIDTH / 2, HEIGHT / 2 + 40);
    }
    ctx.restore();
  }

  // Submit the final score to the leaderboard once per run.
  function maybeSubmitScore() {
    if (submitted) return;
    if (!window.PixelNet || !PixelNet.submitScore) return;
    submitted = true;
    PixelNet.submitScore('neon-trail-riders', Math.floor(score));
  }

  // Main loop using requestAnimationFrame
  function loop() {
    update();
    draw();
    requestAnimationFrame(loop);
  }

  // Kick off the first run
  reset();
  loop();
})();