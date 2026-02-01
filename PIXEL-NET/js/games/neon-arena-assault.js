/*
 * Neon Arena Assault
 *
 * A twin‑stick style arena shooter built exclusively for the PIXEL‑NET
 * arcade. Move with WASD and fire with the arrow keys to fend off
 * waves of neon foes. Each kill awards points, and chaining kills
 * quickly increases your combo multiplier for even higher scores.
 * Enemies home in on the player and spawn more rapidly over time.
 * When one touches you the run is over. Your score is submitted
 * automatically to the leaderboard. Press Enter to play again.
 */

(function() {
  const canvas = document.getElementById('gameCanvas');
  const ctx = canvas.getContext('2d');
  const WIDTH = 640;
  const HEIGHT = 480;
  canvas.width = WIDTH;
  canvas.height = HEIGHT;

  // Player state
  const player = {
    x: WIDTH / 2,
    y: HEIGHT / 2,
    radius: 14,
    speed: 3
  };

  // Inputs
  const moveKeys = { w: false, a: false, s: false, d: false };
  const shootKeys = { ArrowUp: false, ArrowDown: false, ArrowLeft: false, ArrowRight: false };
  const shootTimers = { ArrowUp: 0, ArrowDown: 0, ArrowLeft: 0, ArrowRight: 0 };
  const shootCooldown = 220; // ms between shots per direction

  // Entities
  let bullets = [];
  let enemies = [];
  let particles = [];

  // Difficulty and scoring
  let spawnInterval = 1500;
  let lastSpawn = performance.now();
  let baseEnemySpeed = 0.6;
  const minSpawnInterval = 450;
  const maxEnemySpeed = 2.5;
  let score = 0;
  let multiplier = 1;
  let lastKillTime = 0;

  // Game state flags
  let gameOver = false;
  let submitted = false;

  // Timing
  let lastTime = performance.now();

  // Colour lookup for bullets based on direction
  const BULLET_COLOURS = {
    ArrowUp: '#f5d300',     // yellow
    ArrowDown: '#ff9a00',   // orange
    ArrowLeft: '#08f7fe',   // cyan
    ArrowRight: '#fe53bb'   // pink
  };

  // Event listeners
  window.addEventListener('keydown', (e) => {
    const code = e.code;
    if (code === 'KeyW') moveKeys.w = true;
    else if (code === 'KeyA') moveKeys.a = true;
    else if (code === 'KeyS') moveKeys.s = true;
    else if (code === 'KeyD') moveKeys.d = true;
    else if (code in shootKeys) shootKeys[code] = true;
    else if (gameOver && code === 'Enter') {
      reset();
    }
  });
  window.addEventListener('keyup', (e) => {
    const code = e.code;
    if (code === 'KeyW') moveKeys.w = false;
    else if (code === 'KeyA') moveKeys.a = false;
    else if (code === 'KeyS') moveKeys.s = false;
    else if (code === 'KeyD') moveKeys.d = false;
    else if (code in shootKeys) shootKeys[code] = false;
  });

  function reset() {
    player.x = WIDTH / 2;
    player.y = HEIGHT / 2;
    bullets = [];
    enemies = [];
    particles = [];
    spawnInterval = 1500;
    lastSpawn = performance.now();
    baseEnemySpeed = 0.6;
    score = 0;
    multiplier = 1;
    lastKillTime = 0;
    gameOver = false;
    submitted = false;
    // reset shoot timers
    for (const k in shootTimers) shootTimers[k] = 0;
    lastTime = performance.now();
  }

  function spawnEnemy() {
    // Spawn from a random edge with random position along that edge
    const side = Math.floor(Math.random() * 4);
    let x, y;
    if (side === 0) { // top
      x = Math.random() * WIDTH;
      y = -20;
    } else if (side === 1) { // right
      x = WIDTH + 20;
      y = Math.random() * HEIGHT;
    } else if (side === 2) { // bottom
      x = Math.random() * WIDTH;
      y = HEIGHT + 20;
    } else { // left
      x = -20;
      y = Math.random() * HEIGHT;
    }
    const enemy = {
      x,
      y,
      vx: 0,
      vy: 0,
      radius: 14,
      base: baseEnemySpeed + Math.random() * 0.3
    };
    enemies.push(enemy);
  }

  function fireBullet(dir) {
    const now = performance.now();
    if (now - shootTimers[dir] < shootCooldown) return;
    shootTimers[dir] = now;
    let vx = 0;
    let vy = 0;
    if (dir === 'ArrowUp') vy = -6;
    else if (dir === 'ArrowDown') vy = 6;
    else if (dir === 'ArrowLeft') vx = -6;
    else if (dir === 'ArrowRight') vx = 6;
    // Allow diagonal shots by combining multiple keys: spawn one per pressed key
    bullets.push({
      x: player.x,
      y: player.y,
      vx,
      vy,
      radius: 3,
      life: 2000,
      color: BULLET_COLOURS[dir] || '#ffffff'
    });
  }

  function maybeSubmitScore() {
    if (submitted) return;
    if (!window.PixelNet || !PixelNet.submitScore) return;
    submitted = true;
    PixelNet.submitScore('neon-arena-assault', Math.floor(score));
  }

  function update(dt) {
    const now = performance.now();
    // Spawn new enemies at decreasing intervals
    if (!gameOver && now - lastSpawn >= spawnInterval) {
      spawnEnemy();
      lastSpawn = now;
      // Decrease spawn interval and increase enemy speed gradually
      spawnInterval = Math.max(minSpawnInterval, spawnInterval - 5);
      baseEnemySpeed = Math.min(maxEnemySpeed, baseEnemySpeed + 0.02);
    }
    if (!gameOver) {
      // Movement
      let dx = 0;
      let dy = 0;
      if (moveKeys.w) dy -= 1;
      if (moveKeys.s) dy += 1;
      if (moveKeys.a) dx -= 1;
      if (moveKeys.d) dx += 1;
      if (dx !== 0 || dy !== 0) {
        const len = Math.hypot(dx, dy);
        dx = (dx / len) * player.speed;
        dy = (dy / len) * player.speed;
        player.x += dx;
        player.y += dy;
        // Keep the player in bounds
        player.x = Math.max(player.radius, Math.min(WIDTH - player.radius, player.x));
        player.y = Math.max(player.radius, Math.min(HEIGHT - player.radius, player.y));
      }
      // Shooting
      for (const dir in shootKeys) {
        if (shootKeys[dir]) fireBullet(dir);
      }
      // Update bullets
      bullets = bullets.filter(b => b.life > 0 && b.x >= -10 && b.x <= WIDTH + 10 && b.y >= -10 && b.y <= HEIGHT + 10);
      bullets.forEach(b => {
        b.x += b.vx;
        b.y += b.vy;
        b.life -= dt;
      });
      // Update enemies
      enemies.forEach(e => {
        // Home towards the player each frame
        const dxE = player.x - e.x;
        const dyE = player.y - e.y;
        const len = Math.hypot(dxE, dyE) || 1;
        e.vx = (dxE / len) * e.base;
        e.vy = (dyE / len) * e.base;
        e.x += e.vx;
        e.y += e.vy;
      });
      // Bullet–enemy collisions
      outerLoop:
      for (let i = bullets.length - 1; i >= 0; i--) {
        const b = bullets[i];
        for (let j = enemies.length - 1; j >= 0; j--) {
          const e = enemies[j];
          const dist = Math.hypot(b.x - e.x, b.y - e.y);
          if (dist < b.radius + e.radius) {
            // Remove bullet and enemy
            bullets.splice(i, 1);
            enemies.splice(j, 1);
            // Particle explosion
            for (let p = 0; p < 16; p++) {
              const angle = Math.random() * Math.PI * 2;
              const speed = Math.random() * 2 + 1;
              particles.push({
                x: e.x,
                y: e.y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: 1,
                color: '#fe53bb'
              });
            }
            // Update score and combo
            const t = now;
            if (t - lastKillTime < 2000) {
              multiplier = Math.min(multiplier + 1, 10);
            } else {
              multiplier = 1;
            }
            lastKillTime = t;
            score += 10 * multiplier;
            continue outerLoop;
          }
        }
      }
      // Player–enemy collisions
      for (const e of enemies) {
        const dist = Math.hypot(player.x - e.x, player.y - e.y);
        if (dist < player.radius + e.radius) {
          gameOver = true;
          break;
        }
      }
    }
    // Update particles
    particles = particles.filter(p => p.life > 0);
    particles.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;
      p.vx *= 0.99;
      p.vy *= 0.99;
      p.life -= 0.02;
    });
  }

  function draw() {
    // Background
    ctx.fillStyle = '#01012b';
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    // Draw bullets
    bullets.forEach(b => {
      ctx.fillStyle = b.color;
      ctx.fillRect(b.x - b.radius, b.y - b.radius, b.radius * 2, b.radius * 2);
    });
    // Draw enemies
    enemies.forEach(e => {
      const grd = ctx.createRadialGradient(e.x, e.y, 0, e.x, e.y, e.radius);
      grd.addColorStop(0, '#fe53bb');
      grd.addColorStop(1, '#fe53bb00');
      ctx.fillStyle = grd;
      ctx.beginPath();
      ctx.arc(e.x, e.y, e.radius, 0, Math.PI * 2);
      ctx.fill();
    });
    // Draw player (glowing circle)
    {
      const grd = ctx.createRadialGradient(player.x, player.y, 0, player.x, player.y, player.radius);
      grd.addColorStop(0, '#08f7fe');
      grd.addColorStop(1, '#08f7fe00');
      ctx.fillStyle = grd;
      ctx.beginPath();
      ctx.arc(player.x, player.y, player.radius, 0, Math.PI * 2);
      ctx.fill();
    }
    // Draw particles
    particles.forEach(p => {
      const a = Math.max(0, Math.min(1, p.life));
      ctx.fillStyle = p.color + Math.floor(a * 255).toString(16).padStart(2, '0');
      ctx.fillRect(p.x, p.y, 2, 2);
    });
    // Score & combo
    ctx.fillStyle = '#ffffff';
    ctx.font = '18px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`Score: ${Math.floor(score)}`, 10, 24);
    if (multiplier > 1) {
      ctx.fillStyle = '#f5d300';
      ctx.fillText(`Combo x${multiplier}`, 10, 46);
    }
    // Game over overlay
    if (gameOver) {
      maybeSubmitScore();
      ctx.fillStyle = 'rgba(0,0,0,0.65)';
      ctx.fillRect(0, 0, WIDTH, HEIGHT);
      ctx.fillStyle = '#ffffff';
      ctx.font = '32px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Defeated', WIDTH / 2, HEIGHT / 2 - 20);
      ctx.font = '20px sans-serif';
      ctx.fillText(`Final Score: ${Math.floor(score)}`, WIDTH / 2, HEIGHT / 2 + 10);
      ctx.fillText('Press Enter to Restart', WIDTH / 2, HEIGHT / 2 + 40);
    }
  }

  function loop() {
    const now = performance.now();
    const dt = now - lastTime;
    lastTime = now;
    update(dt);
    draw();
    requestAnimationFrame(loop);
  }

  // Kick off first round
  reset();
  loop();
})();