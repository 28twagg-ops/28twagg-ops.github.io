/*
 * Cyber Python
 *
 * Classic snake game with a cyberpunk twist. Navigate the neon grid
 * collecting food to grow longer. Avoid colliding with the walls or
 * yourself. Each piece of food eaten increases your score. The game
 * runs on a fixed grid and updates at a consistent rate for a crisp
 * retro feel.
 */

(function() {
  const canvas = document.getElementById('gameCanvas');
  const ctx = canvas.getContext('2d');
  const COLS = 20;
  const ROWS = 20;
  const CELL_SIZE = 20;
  const WIDTH = COLS * CELL_SIZE;
  const HEIGHT = ROWS * CELL_SIZE;
  canvas.width = WIDTH;
  canvas.height = HEIGHT;

  let snake;
  let dir;
  let food;
  let score;
  let gameOver;

  // Flag to ensure a score is submitted only once per game.
  let submitted = false;

  let lastMoveTime = 0;
  const moveInterval = 150;

  function init() {
    snake = [ { x: Math.floor(COLS / 2), y: Math.floor(ROWS / 2) } ];
    dir = { x: 1, y: 0 };
    placeFood();
    score = 0;
    gameOver = false;

    // Reset submission flag so that the next run can upload a new score.
    submitted = false;
  }

  function placeFood() {
    while (true) {
      const x = Math.floor(Math.random() * COLS);
      const y = Math.floor(Math.random() * ROWS);
      let onSnake = false;
      for (const s of snake) {
        if (s.x === x && s.y === y) {
          onSnake = true;
          break;
        }
      }
      if (!onSnake) {
        food = { x, y };
        return;
      }
    }
  }

  window.addEventListener('keydown', e => {
    const code = e.code;
    if (code === 'ArrowUp' || code === 'KeyW') {
      if (dir.y === 0) dir = { x: 0, y: -1 };
    } else if (code === 'ArrowDown' || code === 'KeyS') {
      if (dir.y === 0) dir = { x: 0, y: 1 };
    } else if (code === 'ArrowLeft' || code === 'KeyA') {
      if (dir.x === 0) dir = { x: -1, y: 0 };
    } else if (code === 'ArrowRight' || code === 'KeyD') {
      if (dir.x === 0) dir = { x: 1, y: 0 };
    } else if (gameOver && code === 'Enter') {
      init();
    }
  });

  // Mobile: swipe on the canvas to change direction.
  // Touch events are bound to the canvas only so the page can still scroll
  // when the user swipes outside the game.
  let t0 = null;
  canvas.addEventListener('touchstart', (e) => {
    if (e.touches && e.touches[0]) {
      t0 = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }
  }, { passive: true });
  canvas.addEventListener('touchmove', (e) => e.preventDefault(), { passive: false });
  canvas.addEventListener('touchend', (e) => {
    if (!t0) return;
    const t1 = (e.changedTouches && e.changedTouches[0]) ? e.changedTouches[0] : null;
    if (!t1) return;
    const dx = t1.clientX - t0.x;
    const dy = t1.clientY - t0.y;
    const ax = Math.abs(dx), ay = Math.abs(dy);
    if (ax < 18 && ay < 18) {
      if (gameOver) init();
      return;
    }
    if (ax > ay) {
      if (dx < 0 && dir.x === 0) dir = { x: -1, y: 0 };
      else if (dx > 0 && dir.x === 0) dir = { x: 1, y: 0 };
    } else {
      if (dy < 0 && dir.y === 0) dir = { x: 0, y: -1 };
      else if (dy > 0 && dir.y === 0) dir = { x: 0, y: 1 };
    }
  }, { passive: true });

  function maybeSubmitScore() {
    if (submitted) return;
    if (!window.PixelNet || !PixelNet.submitScore) return;
    submitted = true;
    PixelNet.submitScore('cyber-python', score);
  }

  function update(time) {
    if (gameOver) {
      maybeSubmitScore();
      draw();
      requestAnimationFrame(update);
      return;
    }

    if (time - lastMoveTime > moveInterval) {
      lastMoveTime = time;

      const head = { x: snake[0].x + dir.x, y: snake[0].y + dir.y };

      if (head.x < 0 || head.x >= COLS || head.y < 0 || head.y >= ROWS) {
        gameOver = true;
      }

      for (const s of snake) {
        if (s.x === head.x && s.y === head.y) {
          gameOver = true;
          break;
        }
      }

      if (!gameOver) {
        snake.unshift(head);

        if (head.x === food.x && head.y === food.y) {
          score++;
          placeFood();
        } else {
          snake.pop();
        }
      }
    }

    draw();
    requestAnimationFrame(update);
  }

  function draw() {
    ctx.fillStyle = '#010a0f';
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    ctx.strokeStyle = '#0d233f';
    ctx.lineWidth = 1;
    for (let i = 1; i < COLS; i++) {
      ctx.beginPath();
      ctx.moveTo(i * CELL_SIZE, 0);
      ctx.lineTo(i * CELL_SIZE, HEIGHT);
      ctx.stroke();
    }
    for (let i = 1; i < ROWS; i++) {
      ctx.beginPath();
      ctx.moveTo(0, i * CELL_SIZE);
      ctx.lineTo(WIDTH, i * CELL_SIZE);
      ctx.stroke();
    }

    ctx.fillStyle = '#ffcc00';
    ctx.fillRect(food.x * CELL_SIZE + 2, food.y * CELL_SIZE + 2, CELL_SIZE - 4, CELL_SIZE - 4);

    ctx.fillStyle = '#00e676';
    snake.forEach((s) => {
      ctx.fillRect(s.x * CELL_SIZE + 1, s.y * CELL_SIZE + 1, CELL_SIZE - 2, CELL_SIZE - 2);
    });

    ctx.fillStyle = '#ffffff';
    ctx.font = '18px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`Score: ${score}`, 10, 24);

    if (gameOver) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
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

  init();
  requestAnimationFrame(update);
})();
