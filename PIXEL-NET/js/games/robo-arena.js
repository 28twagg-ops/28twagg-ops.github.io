/*
 * Robo-Arena
 *
 * A simple top-down shooter where you control a robot in an arena filled
 * with hostile enemies. Use the arrow keys to move and the spacebar to
 * fire bolts. Survive as long as you can and rack up points by
 * eliminating enemies. If an enemy touches you the game ends. This
 * implementation is intentionally compact and self contained so it can be
 * loaded via the PIXEL-NET game loader. It does not rely on any
 * external libraries beyond the native browser Canvas API.
 */

(function() {
  const canvas = document.getElementById('gameCanvas');
  const ctx = canvas.getContext('2d');

  const WIDTH = 640;
  const HEIGHT = 480;
  canvas.width = WIDTH;
  canvas.height = HEIGHT;

  const player = {
    x: WIDTH / 2,
    y: HEIGHT / 2,
    size: 20,
    speed: 3,
    color: '#2b8fe1',
    dx: 0,
    dy: 0
  };

  const bullets = [];
  const enemies = [];

  let score = 0;
  let gameOver = false;
  let lastEnemySpawn = 0;

  // Flag to ensure we only submit once per run.
  let submitted = false;

  // Key state tracking
  const keys = {};
  window.addEventListener('keydown', e => {
    keys[e.code] = true;
    if (e.code === 'Space') {
      fireBullet();
    }
  });
  window.addEventListener('keyup', e => {
    keys[e.code] = false;
  });

  function fireBullet() {
    const bulletSpeed = 5;

    let dx = 0;
    let dy = -1;
    if (player.dx !== 0 || player.dy !== 0) {
      const mag = Math.hypot(player.dx, player.dy);
      dx = player.dx / mag;
      dy = player.dy / mag;
    }

    bullets.push({
      x: player.x,
      y: player.y,
      dx: dx * bulletSpeed,
      dy: dy * bulletSpeed,
      size: 4,
      color: '#ffd93d'
    });
  }

  function spawnEnemy() {
    const size = 20;
    let x, y;

    const side = Math.floor(Math.random() * 4);
    switch (side) {
      case 0:
        x = Math.random() * WIDTH;
        y = -size;
        break;
      case 1:
        x = Math.random() * WIDTH;
        y = HEIGHT + size;
        break;
      case 2:
        x = -size;
        y = Math.random() * HEIGHT;
        break;
      default:
        x = WIDTH + size;
        y = Math.random() * HEIGHT;
        break;
    }

    enemies.push({ x, y, size, speed: 1.5, color: '#e14b3c' });
  }

  function updatePlayer() {
    player.dx = 0;
    player.dy = 0;
    if (keys['ArrowLeft'] || keys['KeyA']) player.dx = -player.speed;
    if (keys['ArrowRight'] || keys['KeyD']) player.dx = player.speed;
    if (keys['ArrowUp'] || keys['KeyW']) player.dy = -player.speed;
    if (keys['ArrowDown'] || keys['KeyS']) player.dy = player.speed;

    player.x += player.dx;
    player.y += player.dy;

    player.x = Math.max(player.size / 2, Math.min(WIDTH - player.size / 2, player.x));
    player.y = Math.max(player.size / 2, Math.min(HEIGHT - player.size / 2, player.y));
  }

  function updateBullets() {
    for (let i = bullets.length - 1; i >= 0; i--) {
      const b = bullets[i];
      b.x += b.dx;
      b.y += b.dy;

      if (b.x < -10 || b.x > WIDTH + 10 || b.y < -10 || b.y > HEIGHT + 10) {
        bullets.splice(i, 1);
      }
    }
  }

  function updateEnemies() {
    for (let i = enemies.length - 1; i >= 0; i--) {
      const e = enemies[i];

      const angle = Math.atan2(player.y - e.y, player.x - e.x);
      e.x += Math.cos(angle) * e.speed;
      e.y += Math.sin(angle) * e.speed;

      if (Math.hypot(e.x - player.x, e.y - player.y) < (e.size + player.size) / 2) {
        gameOver = true;
      }

      for (let j = bullets.length - 1; j >= 0; j--) {
        const b = bullets[j];
        if (Math.hypot(e.x - b.x, e.y - b.y) < (e.size + b.size) / 2) {
          enemies.splice(i, 1);
          bullets.splice(j, 1);
          score += 10;
          break;
        }
      }
    }
  }

  function maybeSubmitScore() {
    if (submitted) return;
    if (!window.PixelNet || !PixelNet.submitScore) return;
    submitted = true;
    PixelNet.submitScore('robo-arena', score);
  }

  function draw() {
    ctx.clearRect(0, 0, WIDTH, HEIGHT);

    ctx.fillStyle = '#101820';
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    ctx.fillStyle = player.color;
    ctx.beginPath();
    ctx.arc(player.x, player.y, player.size / 2, 0, Math.PI * 2);
    ctx.fill();

    for (const b of bullets) {
      ctx.fillStyle = b.color;
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.size / 2, 0, Math.PI * 2);
      ctx.fill();
    }

    for (const e of enemies) {
      ctx.fillStyle = e.color;
      ctx.beginPath();
      ctx.arc(e.x, e.y, e.size / 2, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.fillStyle = '#ffffff';
    ctx.font = '18px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`Score: ${score}`, 10, 24);

    if (gameOver) {
      maybeSubmitScore();

      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.fillRect(0, 0, WIDTH, HEIGHT);
      ctx.fillStyle = '#ffffff';
      ctx.font = '32px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Game Over', WIDTH / 2, HEIGHT / 2 - 20);
      ctx.font = '20px sans-serif';
      ctx.fillText(`Final Score: ${score}`, WIDTH / 2, HEIGHT / 2 + 10);
      ctx.fillText('Press Enter to Restart', WIDTH / 2, HEIGHT / 2 + 40);
    }
  }

  function loop(timestamp) {
    if (!gameOver) {
      updatePlayer();
      updateBullets();
      updateEnemies();

      if (timestamp - lastEnemySpawn > 1000) {
        spawnEnemy();
        lastEnemySpawn = timestamp;
      }
    }

    draw();
    requestAnimationFrame(loop);
  }

  window.addEventListener('keydown', e => {
    if (gameOver && e.code === 'Enter') {
      bullets.length = 0;
      enemies.length = 0;
      player.x = WIDTH / 2;
      player.y = HEIGHT / 2;
      score = 0;
      gameOver = false;
      lastEnemySpawn = 0;

      // Reset submission flag so subsequent runs can submit again.
      submitted = false;
    }
  });

  requestAnimationFrame(loop);
})();
