/**
 * MILLIPEDE CHAOS - ARCADE ENGINE
 */
(function() {
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');
    
    let score = 0;
    let gameOver = false;
    const gs = 20; // Grid Size
    
    const player = { x: 10, y: 28, speed: 0.4 };
    const bullets = [];
    const mushrooms = [];
    const millipedes = [];
    const spiders = [];
    const keys = {};

    // Generate Mushrooms
    for(let i=0; i<40; i++) {
        mushrooms.push({
            x: Math.floor(Math.random() * 20),
            y: Math.floor(Math.random() * 25) + 2,
            hp: 4
        });
    }

    // Create Millipede
    function spawnMillipede(length, y = 0) {
        let segments = [];
        for(let i=0; i<length; i++) {
            segments.push({ x: 10-i, y: y, dir: 1, type: i === 0 ? 'head' : 'body' });
        }
        millipedes.push(segments);
    }
    spawnMillipede(12);

    window.addEventListener('keydown', e => {
        keys[e.key] = true;
        // Fix for "Enter" not working: ensure it doesn't propagate if we are in game
        if(e.key === "Enter" && gameOver) window.location.reload();
    });
    window.addEventListener('keyup', e => keys[e.key] = false);

    function update() {
        if(gameOver) return;

        // Player Move
        if(keys['ArrowLeft'] && player.x > 0) player.x -= player.speed;
        if(keys['ArrowRight'] && player.x < 19) player.x += player.speed;
        if(keys['ArrowUp'] && player.y > 20) player.y -= player.speed;
        if(keys['ArrowDown'] && player.y < 31) player.y += player.speed;

        // Shooting
        if(keys[' '] && bullets.length < 3) {
            bullets.push({ x: player.x + 0.5, y: player.y });
        }

        // Bullet Logic
        bullets.forEach((b, bi) => {
            b.y -= 1;
            mushrooms.forEach((m, mi) => {
                if(Math.floor(b.x) === m.x && Math.floor(b.y) === m.y) {
                    m.hp--;
                    bullets.splice(bi, 1);
                    if(m.hp <= 0) mushrooms.splice(mi, 1);
                    score += 10;
                }
            });
        });

        // Millipede Logic
        millipedes.forEach((milli, mi) => {
            milli.forEach((seg, si) => {
                if(Math.floor(seg.x) === Math.floor(player.x) && Math.floor(seg.y) === Math.floor(player.y)) {
                    gameOver = true;
                }
                
                // Movement on grid
                if(frameCount % 5 === 0) {
                    let nextX = seg.x + seg.dir;
                    let blocked = mushrooms.some(m => m.x === nextX && m.y === seg.y);
                    
                    if(nextX < 0 || nextX > 19 || blocked) {
                        seg.y++;
                        seg.dir *= -1;
                    } else {
                        seg.x += seg.dir;
                    }
                }
            });
        });
    }

    let frameCount = 0;
    function draw() {
        ctx.fillStyle = '#000';
        ctx.fillRect(0,0,400,640);

        // Draw Player
        ctx.fillStyle = '#0ff';
        ctx.fillRect(player.x * gs, player.y * gs, gs, gs);

        // Draw Mushrooms
        mushrooms.forEach(m => {
            ctx.fillStyle = `rgb(${m.hp*60}, 255, 0)`;
            ctx.fillRect(m.x * gs + 2, m.y * gs + 2, gs - 4, gs - 4);
        });

        // Draw Millipede
        millipedes.forEach(milli => {
            milli.forEach(seg => {
                ctx.fillStyle = seg.type === 'head' ? '#fff' : '#f00';
                ctx.beginPath();
                ctx.arc(seg.x * gs + 10, seg.y * gs + 10, 8, 0, Math.PI*2);
                ctx.fill();
            });
        });

        // Bullets
        ctx.fillStyle = '#fff';
        bullets.forEach(b => ctx.fillRect(b.x * gs, b.y * gs, 2, 10));

        if(gameOver) {
            ctx.fillStyle = 'rgba(0,0,0,0.8)';
            ctx.fillRect(0,0,400,640);
            ctx.fillStyle = 'red';
            ctx.font = '30px Courier';
            ctx.fillText("GAME OVER", 120, 300);
            ctx.font = '15px Courier';
            ctx.fillText("PRESS ENTER TO RESTART", 100, 340);
        }

        frameCount++;
        update();
        requestAnimationFrame(draw);
    }

    draw();
})();
