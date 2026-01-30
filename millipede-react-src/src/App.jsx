
import React, { useState, useEffect, useRef, useCallback } from "react";
import { initializeApp } from "firebase/app";
import { getAuth, signInAnonymously, onAuthStateChanged } from "firebase/auth";
import { getFirestore, collection, addDoc, onSnapshot, query, orderBy, limit } from "firebase/firestore";
import { Zap } from "lucide-react";

// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCogX_gFJkj9mlS6QYsqX76pzASbLBQYyk",
  authDomain: "millipede-3bef3.firebaseapp.com",
  projectId: "millipede-3bef3",
  storageBucket: "millipede-3bef3.firebasestorage.app",
  messagingSenderId: "762072653664",
  appId: "1:762072653664:web:4e074951b134a955bd8805",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
// This is just a name-space so your scoreboard is separate from other games
const appId = "millipede-arcade-v2";

// ---- Constants ----
const GRID_SIZE = 20;
const ROWS = 32;
const COLS = 20;
const PLAYER_ZONE_START = ROWS - 8;

const PALETTES = [
  { mushroom: "#FFCC00", millipede: "#FF0000", spider: "#FFFFFF", laser: "#FFFFFF", poisoned: "#00FF00", bg: "#000" },
  { mushroom: "#00FFFF", millipede: "#00FF00", spider: "#FFFF00", laser: "#00FFFF", poisoned: "#FF00FF", bg: "#050005" },
  { mushroom: "#FF00FF", millipede: "#FFFFFF", spider: "#00FFFF", laser: "#FF00FF", poisoned: "#FFFF00", bg: "#000505" }
];

export default function App() {
  // UI state
  const [gameState, setGameState] = useState("LEADERBOARD"); // LEADERBOARD | PLAYING | INITIALS
  const [score, setScore] = useState(0);
  const [level, setLevel] = useState(0);
  const [highScores, setHighScores] = useState([]);
  const [user, setUser] = useState(null);
  const [initials, setInitials] = useState("");

  const canvasRef = useRef(null);
  const requestRef = useRef(null);

  // prevent stale closure in RAF loop
  const gameStateRef = useRef(gameState);
  useEffect(() => { gameStateRef.current = gameState; }, [gameState]);

  // core game ref
  const gameRef = useRef({
    player: { x: 10, y: 30 },
    bullets: [],
    mushrooms: [],
    millipedes: [],
    spiders: [],
    bees: [],
    earwigs: [],
    ddtBombs: [],
    explosions: [],
    tick: 0,
    keys: {},
    lastFire: 0,
    isFiring: false,
    palette: PALETTES[0],
    gameOver: false
  });

  // ---- Auth ----
  useEffect(() => {
    const init = async () => {
      try { await signInAnonymously(auth); }
      catch (e) { console.error("Auth failed:", e); }
    };
    init();
    const unsub = onAuthStateChanged(auth, setUser);
    return () => unsub();
  }, []);

  // ---- Leaderboard ----
  useEffect(() => {
    if (!user) return;

    // scores stored at: leaderboards/{appId}/scores
    const scoresRef = collection(db, "leaderboards", appId, "scores");
    const qy = query(scoresRef, orderBy("score", "desc"), limit(10));

    const unsub = onSnapshot(qy, (snap) => {
      setHighScores(snap.docs.map(d => d.data()));
    }, (err) => console.error("Leaderboard sync error:", err));

    return () => unsub();
  }, [user]);

  // ---- Init Game ----
  const initGame = useCallback((nextLevel = 0) => {
    const g = gameRef.current;

    g.gameOver = false;
    g.tick = 0;
    g.bullets = [];
    g.spiders = [];
    g.bees = [];
    g.earwigs = [];
    g.ddtBombs = [];
    g.explosions = [];
    g.player = { x: COLS / 2, y: ROWS - 4 };
    g.palette = PALETTES[nextLevel % PALETTES.length];

    let mush = (nextLevel === 0) ? [] : [...g.mushrooms];

    if (nextLevel === 0) {
      mush = [];
      for (let i = 0; i < 55; i++) {
        mush.push({
          x: Math.floor(Math.random() * COLS),
          y: Math.floor(Math.random() * (ROWS - 10)) + 1,
          health: 4,
          poisoned: false
        });
      }
      setScore(0);
    }
    g.mushrooms = mush;

    // DDT bombs
    for (let i = 0; i < 3; i++) {
      g.ddtBombs.push({
        x: Math.floor(Math.random() * (COLS - 2)) + 1,
        y: Math.floor(Math.random() * 18) + 5,
        active: true
      });
    }

    // millipede (12 seg)
    const segments = [];
    for (let i = 0; i < 12; i++) segments.push({ x: 10 - i, y: 0, dir: 1, diving: false });
    g.millipedes = [segments];

    setLevel(nextLevel);
  }, []);

  // ---- Update ----
  const update = () => {
    const g = gameRef.current;
    if (g.gameOver) return;
    g.tick++;

    // Player move
    const speed = 0.35;
    if (g.keys["ArrowLeft"] && g.player.x > 0) g.player.x -= speed;
    if (g.keys["ArrowRight"] && g.player.x < COLS - 1) g.player.x += speed;
    if (g.keys["ArrowUp"] && g.player.y > PLAYER_ZONE_START) g.player.y -= speed;
    if (g.keys["ArrowDown"] && g.player.y < ROWS - 1) g.player.y += speed;

    // Fire (space or touch fire)
    if (g.keys[" "] || g.keys["Spacebar"] || g.isFiring) {
      const now = Date.now();
      if (now - g.lastFire > 120) {
        g.bullets.push({ x: g.player.x + 0.5, y: g.player.y });
        g.lastFire = now;
      }
    }

    // Bullets
    g.bullets = g.bullets.filter(b => {
      b.y -= 1.0;
      let hit = false;

      // DDT bombs -> gas cloud
      g.ddtBombs.forEach(d => {
        if (d.active && Math.abs(b.x - (d.x + 0.5)) < 0.8 && Math.abs(b.y - (d.y + 0.5)) < 0.8) {
          d.active = false;
          hit = true;
          for (let ox = -2; ox <= 2; ox++) {
            for (let oy = -2; oy <= 2; oy++) {
              g.explosions.push({ x: d.x + ox + 0.5, y: d.y + oy + 0.5, color: "#FFFF00", life: 45, isGas: true });
            }
          }
          setScore(s => s + 800);
        }
      });

      // Mushrooms
      if (!hit) {
        g.mushrooms.forEach(m => {
          if (!hit && Math.floor(b.x) === m.x && Math.floor(b.y) === m.y) {
            m.health--;
            hit = true;
            setScore(s => s + 1);
            g.explosions.push({ x: m.x + 0.5, y: m.y + 0.5, color: m.poisoned ? g.palette.poisoned : g.palette.mushroom, life: 8 });
          }
        });
        g.mushrooms = g.mushrooms.filter(m => m.health > 0);
      }

      // Spider
      if (!hit) {
        g.spiders.forEach((s, idx) => {
          if (Math.abs(b.x - s.x) < 1.0 && Math.abs(b.y - s.y) < 1.0) {
            hit = true;
            setScore(cur => cur + 600);
            g.explosions.push({ x: s.x, y: s.y, color: g.palette.spider, life: 15 });
            g.spiders.splice(idx, 1);
          }
        });

        // Bee
        g.bees.forEach((bee, idx) => {
          if (!hit && Math.abs(b.x - bee.x) < 1.0 && Math.abs(b.y - bee.y) < 1.0) {
            hit = true;
            setScore(cur => cur + 200);
            g.bees.splice(idx, 1);
            g.explosions.push({ x: bee.x, y: bee.y, color: "#FFF", life: 10 });
          }
        });
      }

      // Millipede segments + split
      if (!hit) {
        g.millipedes.forEach((milli) => {
          milli.forEach((seg, sIdx) => {
            if (!hit && Math.abs(b.x - (seg.x + 0.5)) < 0.7 && Math.abs(b.y - (seg.y + 0.5)) < 0.7) {
              hit = true;
              setScore(s => s + (sIdx === 0 ? 100 : 10));
              g.mushrooms.push({ x: Math.floor(seg.x), y: Math.floor(seg.y), health: 4, poisoned: false });

              const tail = milli.splice(sIdx + 1);
              milli.splice(sIdx, 1);
              if (tail.length > 0) g.millipedes.push(tail);
            }
          });
        });
      }

      return !hit && b.y > -1;
    });

    // Millipede move
    const moveFreq = Math.max(1, 4 - level);
    if (g.tick % moveFreq === 0) {
      g.millipedes.forEach((milli) => {
        if (milli.length === 0) return;
        const head = milli[0];
        const oldPos = { x: head.x, y: head.y };

        let nextX = head.x + head.dir;
        let turnDown = false;

        if (head.diving) {
          head.y += 1;
          if (head.y >= ROWS - 1) head.diving = false;
        } else {
          if (nextX < 0 || nextX >= COLS) {
            turnDown = true;
          } else {
            g.mushrooms.forEach(m => {
              if (m.x === nextX && m.y === head.y) {
                turnDown = true;
                if (m.poisoned) head.diving = true;
              }
            });
          }

          if (turnDown) {
            head.y += 1;
            head.dir *= -1;
            if (head.y >= ROWS) head.y = PLAYER_ZONE_START;
          } else {
            head.x = nextX;
          }
        }

        // body follow
        let prevPos = oldPos;
        for (let i = 1; i < milli.length; i++) {
          const currentPos = { x: milli[i].x, y: milli[i].y };
          milli[i].x = prevPos.x;
          milli[i].y = prevPos.y;
          prevPos = currentPos;
        }

        // player collision
        if (Math.abs(head.x - g.player.x) < 0.8 && Math.abs(head.y - g.player.y) < 0.8) {
          g.gameOver = true;
          setGameState("INITIALS");
        }
      });

      g.millipedes = g.millipedes.filter(c => c.length > 0);
      if (g.millipedes.length === 0) initGame(level + 1);
    }

    // Bees
    if (g.tick % 400 === 0 && g.bees.length < 2) g.bees.push({ x: Math.floor(Math.random() * COLS), y: -1 });
    g.bees = g.bees.filter(b => {
      b.y += 0.2;
      if (g.tick % 45 === 0 && b.y < PLAYER_ZONE_START) {
        if (!g.mushrooms.some(m => m.x === b.x && m.y === Math.floor(b.y))) {
          g.mushrooms.push({ x: b.x, y: Math.floor(b.y), health: 4, poisoned: false });
        }
      }
      if (Math.abs(b.x - g.player.x) < 0.8 && Math.abs(b.y - g.player.y) < 0.8) {
        g.gameOver = true;
        setGameState("INITIALS");
      }
      return b.y < ROWS;
    });

    // Earwig
    if (g.tick % 900 === 0 && g.earwigs.length < 1) g.earwigs.push({ x: 0, y: Math.floor(Math.random() * 10) + 10, vx: 0.1 });
    g.earwigs = g.earwigs.filter(e => {
      e.x += e.vx;
      g.mushrooms.forEach(m => {
        if (m.x === Math.floor(e.x) && m.y === Math.floor(e.y)) m.poisoned = true;
      });
      return e.x < COLS;
    });

    // Spider
    if (g.tick % 600 === 0 && g.spiders.length < 1) {
      g.spiders.push({
        x: Math.random() > 0.5 ? 0 : COLS - 1,
        y: PLAYER_ZONE_START + 1,
        vx: Math.random() > 0.5 ? 0.08 : -0.08,
        vy: 0.08,
        timer: 0
      });
    }
    g.spiders = g.spiders.filter(s => {
      s.x += s.vx; s.y += s.vy; s.timer++;
      if (s.x < 0 || s.x > COLS - 1) s.vx *= -1;
      if (s.y < PLAYER_ZONE_START || s.y > ROWS - 1) s.vy *= -1;
      if (s.timer % 50 === 0 && Math.random() > 0.5) s.vy *= -1;

      if (g.tick % 10 === 0) {
        const mIdx = g.mushrooms.findIndex(m => m.x === Math.floor(s.x) && m.y === Math.floor(s.y));
        if (mIdx !== -1) g.mushrooms.splice(mIdx, 1);
      }

      if (Math.abs(s.x - g.player.x) < 0.8 && Math.abs(s.y - g.player.y) < 0.8) {
        g.gameOver = true;
        setGameState("INITIALS");
      }
      return s.x > -2 && s.x < COLS + 2;
    });

    // Gas cloud kills
    g.explosions.forEach(e => {
      if (e.isGas) {
        g.millipedes.forEach(milli => {
          for (let i = milli.length - 1; i >= 0; i--) {
            const seg = milli[i];
            if (Math.abs(seg.x - (e.x - 0.5)) < 1.0 && Math.abs(seg.y - (e.y - 0.5)) < 1.0) {
              milli.splice(i, 1);
              setScore(s => s + 10);
            }
          }
        });

        const hitBee = g.bees.findIndex(b => Math.abs(b.x - e.x) < 1.5 && Math.abs(b.y - e.y) < 1.5);
        if (hitBee !== -1) { g.bees.splice(hitBee, 1); setScore(s => s + 200); }

        const hitSpid = g.spiders.findIndex(s => Math.abs(s.x - e.x) < 1.5 && Math.abs(s.y - e.y) < 1.5);
        if (hitSpid !== -1) { g.spiders.splice(hitSpid, 1); setScore(s => s + 600); }
      }
      e.life--;
    });
    g.explosions = g.explosions.filter(e => e.life > 0);
  };

  // ---- Draw ----
  const draw = (ctx) => {
    const g = gameRef.current;

    ctx.fillStyle = g.palette.bg;
    ctx.fillRect(0, 0, COLS * GRID_SIZE, ROWS * GRID_SIZE);

    // DDT
    g.ddtBombs.forEach(d => {
      if (!d.active) return;
      ctx.fillStyle = "#FFDD00";
      ctx.fillRect(d.x * GRID_SIZE + 2, d.y * GRID_SIZE + 2, 16, 16);
      ctx.fillStyle = "#000";
      ctx.font = "10px monospace";
      ctx.fillText("DDT", d.x * GRID_SIZE + 1, d.y * GRID_SIZE + 13);
    });

    // Mushrooms
    g.mushrooms.forEach(m => {
      const x = m.x * GRID_SIZE;
      const y = m.y * GRID_SIZE;
      ctx.fillStyle = m.poisoned ? g.palette.poisoned : g.palette.mushroom;

      if (m.health >= 4) {
        ctx.fillRect(x + 2, y + 4, 16, 8);
        ctx.fillRect(x + 4, y + 2, 12, 12);
      } else if (m.health === 3) {
        ctx.fillRect(x + 2, y + 6, 12, 6);
        ctx.fillRect(x + 4, y + 2, 10, 10);
      } else if (m.health === 2) {
        ctx.fillRect(x + 6, y + 4, 10, 8);
        ctx.fillRect(x + 8, y + 2, 6, 4);
      } else {
        ctx.fillRect(x + 4, y + 8, 4, 4);
        ctx.fillRect(x + 12, y + 4, 4, 4);
      }
      ctx.fillStyle = "#FFF";
      ctx.fillRect(x + 8, y + 10, 4, 8);
    });

    // Millipedes
    g.millipedes.forEach(milli => {
      milli.forEach((seg, idx) => {
        const x = seg.x * GRID_SIZE;
        const y = seg.y * GRID_SIZE;
        const isHead = idx === 0;

        ctx.fillStyle = isHead ? "#FFF" : g.palette.millipede;
        ctx.beginPath();
        ctx.arc(x + 10, y + 10, 8, 0, Math.PI * 2);
        ctx.fill();

        if (isHead) {
          ctx.fillStyle = "#000";
          ctx.fillRect(x + 5, y + 6, 3, 3);
          ctx.fillRect(x + 12, y + 6, 3, 3);
        }

        ctx.strokeStyle = g.palette.millipede;
        ctx.lineWidth = 2;
        const phase = (g.tick / 4 + idx) % 2 < 1 ? 3 : -3;
        ctx.beginPath();
        ctx.moveTo(x + 2, y + 10 + phase); ctx.lineTo(x - 3, y + 12 + phase);
        ctx.moveTo(x + 18, y + 10 - phase); ctx.lineTo(x + 23, y + 12 - phase);
        ctx.stroke();
      });
    });

    // Bees
    g.bees.forEach(b => {
      const x = b.x * GRID_SIZE; const y = b.y * GRID_SIZE;
      ctx.fillStyle = "#DDD";
      ctx.fillRect(x + 2, y, 16, 6);
      ctx.fillStyle = "#D00";
      ctx.fillRect(x + 6, y + 4, 8, 10);
      ctx.fillStyle = "#FF0";
      ctx.fillRect(x + 6, y + 8, 8, 2);
    });

    // Earwigs
    g.earwigs.forEach(e => {
      ctx.fillStyle = g.palette.poisoned;
      ctx.fillRect(e.x * GRID_SIZE, e.y * GRID_SIZE + 6, 20, 8);
      ctx.fillStyle = "#000";
      ctx.fillRect(e.x * GRID_SIZE + 2, e.y * GRID_SIZE + 14, 2, 4);
      ctx.fillRect(e.x * GRID_SIZE + 16, e.y * GRID_SIZE + 14, 2, 4);
    });

    // Spiders
    g.spiders.forEach(s => {
      const x = s.x * GRID_SIZE; const y = s.y * GRID_SIZE;
      ctx.fillStyle = g.palette.spider;
      ctx.beginPath(); ctx.arc(x + 10, y + 10, 8, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = g.palette.spider;
      for (let i = 0; i < 4; i++) {
        ctx.beginPath(); ctx.moveTo(x + 10, y + 10); ctx.lineTo(x - 4, y + 2 + i * 5); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(x + 10, y + 10); ctx.lineTo(x + 24, y + 2 + i * 5); ctx.stroke();
      }
    });

    // Bullets
    g.bullets.forEach(b => {
      ctx.fillStyle = g.palette.laser;
      ctx.fillRect(b.x * GRID_SIZE - 1, b.y * GRID_SIZE, 3, 10);
    });

    // Player
    const px = g.player.x * GRID_SIZE;
    const py = g.player.y * GRID_SIZE;
    ctx.fillStyle = "#0FF";
    ctx.fillRect(px + 2, py + 12, 16, 6);
    ctx.fillStyle = "#FFF";
    ctx.fillRect(px + 8, py + 2, 4, 12);
    ctx.fillRect(px + 4, py + 10, 12, 4);

    // Explosions/Gas
    g.explosions.forEach(e => {
      ctx.fillStyle = e.color;
      if (e.isGas) {
        ctx.globalAlpha = e.life / 45;
        ctx.beginPath();
        ctx.arc(e.x * GRID_SIZE, e.y * GRID_SIZE, 12, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1.0;
      } else {
        for (let i = 0; i < 4; i++) {
          const ox = (Math.random() - 0.5) * 18;
          const oy = (Math.random() - 0.5) * 18;
          ctx.fillRect(e.x * GRID_SIZE + ox, e.y * GRID_SIZE + oy, 2, 2);
        }
      }
    });
  };

  // ---- Game loop ----
  const loop = () => {
    if (gameStateRef.current === "PLAYING") {
      update();
      const ctx = canvasRef.current?.getContext("2d");
      if (ctx) draw(ctx);
      requestRef.current = requestAnimationFrame(loop);
    }
  };

  useEffect(() => {
    if (gameState === "PLAYING") requestRef.current = requestAnimationFrame(loop);
    else cancelAnimationFrame(requestRef.current);
    return () => cancelAnimationFrame(requestRef.current);
  }, [gameState]);

  // keyboard
  useEffect(() => {
    const down = (e) => {
      gameRef.current.keys[e.key] = true;
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " "].includes(e.key)) e.preventDefault();
    };
    const up = (e) => { gameRef.current.keys[e.key] = false; };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, []);

  // touch
  const handleTouch = (e) => {
    if (gameState !== "PLAYING") return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const touch = e.touches[0];
    const x = (touch.clientX - rect.left) / (rect.width / COLS);
    const y = (touch.clientY - rect.top) / (rect.height / ROWS);
    gameRef.current.player.x = Math.max(0, Math.min(COLS - 1, x - 0.5));
    gameRef.current.player.y = Math.max(PLAYER_ZONE_START, Math.min(ROWS - 1, y - 0.5));
  };

  // submit score
  const submitScore = async () => {
    if (!initials || !user) return;
    try {
      await addDoc(collection(db, "leaderboards", appId, "scores"), {
        initials: initials.toUpperCase().substring(0, 3),
        score,
        timestamp: Date.now()
      });
    } catch (err) {
      console.error(err);
    }
    setGameState("LEADERBOARD");
    setInitials("");
  };

  return (
    <div className="appRoot" style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",minHeight:"100vh",background:"#050505",color:"#fff",fontFamily:"monospace",padding:16,overflow:"hidden"}}>
      {/* HUD */}
      <div style={{width:"100%",maxWidth:400,display:"flex",justifyContent:"space-between",marginBottom:12,padding:"0 6px 10px",borderBottom:"2px solid #222"}}>
        <div>
          <div style={{fontSize:10,color:"#777",fontWeight:800,textTransform:"uppercase"}}>Score</div>
          <div style={{fontSize:24,color:"#ff3b3b",fontWeight:900,lineHeight:1}}>{score.toString().padStart(6,"0")}</div>
        </div>
        <div style={{textAlign:"right"}}>
          <div style={{fontSize:10,color:"#777",fontWeight:800,textTransform:"uppercase"}}>Hi-Score</div>
          <div style={{fontSize:20,color:"#ffd84d",fontWeight:900,lineHeight:1}}>{highScores[0]?.score?.toString().padStart(6,"0") || "000000"}</div>
        </div>
      </div>

      {/* GAME BOX */}
      <div style={{position:"relative",border:"6px solid #222",borderRadius:10,overflow:"hidden",background:"#000",boxShadow:"0 0 30px rgba(255,0,0,.05)"}}>
        <canvas
          ref={canvasRef}
          width={COLS * GRID_SIZE}
          height={ROWS * GRID_SIZE}
          style={{display:"block",imageRendering:"pixelated",maxWidth:"100%",maxHeight:"70vh",height:"auto",aspectRatio:`${COLS}/${ROWS}`}}
          onTouchMove={handleTouch}
          onTouchStart={(e)=>{handleTouch(e); gameRef.current.isFiring = true;}}
          onPointerDown={()=>{ if (gameState==="PLAYING") gameRef.current.isFiring=true; }}
          onPointerUp={()=>{ if (gameState==="PLAYING") gameRef.current.isFiring=false; }}
        />
        {/* scanline overlay */}
        <div style={{
          position:"absolute",inset:0,pointerEvents:"none",
          background:"linear-gradient(rgba(18,16,16,0) 50%, rgba(0,0,0,0.25) 50%), linear-gradient(90deg, rgba(255,0,0,0.06), rgba(0,255,0,0.02), rgba(0,0,255,0.06))",
          backgroundSize:"100% 2px, 3px 100%"
        }}/>

        {gameState === "LEADERBOARD" && (
          <div style={{position:"absolute",inset:0,background:"rgba(0,0,0,.95)",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:24}}>
            <div style={{fontSize:52,fontWeight:900,color:"#ff2f2f",fontStyle:"italic",letterSpacing:-2}}>MILLIPEDE</div>
            <div style={{fontSize:10,color:"#777",fontWeight:900,textTransform:"uppercase",letterSpacing:"0.3em",marginBottom:28}}>Arcade Simulation</div>

            <div style={{width:"100%",maxWidth:260,marginBottom:28}}>
              <div style={{display:"flex",justifyContent:"space-between",borderBottom:"1px solid #222",paddingBottom:8,marginBottom:8,fontSize:10,color:"#777",fontWeight:900,textTransform:"uppercase"}}>
                <span>Rank</span><span>Player</span><span>Score</span>
              </div>
              <div style={{display:"flex",flexDirection:"column",gap:6}}>
                {highScores.map((s, i) => (
                  <div key={i} style={{display:"flex",justifyContent:"space-between",fontSize:14,color:"#aaa"}}>
                    <span>{i+1}</span>
                    <span style={{fontWeight:900,color:"#fff"}}>{s.initials}</span>
                    <span style={{color:"#ff3b3b"}}>{s.score}</span>
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={() => { initGame(0); setGameState("PLAYING"); }}
              style={{background:"#fff",color:"#000",padding:"16px 48px",fontWeight:900,letterSpacing:"0.2em",cursor:"pointer",border:"none"}}
            >
              START GAME
            </button>
          </div>
        )}

        {gameState === "INITIALS" && (
          <div style={{position:"absolute",inset:0,background:"rgba(0,0,0,.95)",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:24,textAlign:"center"}}>
            <div style={{color:"#ff3b3b",fontSize:52,fontWeight:900,fontStyle:"italic"}}>GAME OVER</div>
            <div style={{color:"#fff",fontSize:22,fontWeight:900,marginBottom:30}}>SCORE: {score.toLocaleString()}</div>

            <div style={{fontSize:10,color:"#777",fontWeight:900,textTransform:"uppercase",marginBottom:6}}>Enter Initials</div>
            <input
              autoFocus
              maxLength={3}
              value={initials}
              onChange={(e)=>setInitials(e.target.value.toUpperCase())}
              onKeyDown={(e)=>{ if (e.key==="Enter") submitScore(); }}
              style={{
                background:"transparent",
                border:"none",
                borderBottom:"4px solid #ff3b3b",
                color:"#fff",
                fontSize:60,
                fontWeight:900,
                textAlign:"center",
                width:170,
                outline:"none",
                textTransform:"uppercase",
                marginBottom:24
              }}
            />
            <button
              onClick={submitScore}
              style={{background:"#ff3b3b",color:"#000",padding:"14px 40px",fontWeight:900,letterSpacing:"0.2em",cursor:"pointer",border:"none"}}
            >
              SAVE
            </button>
          </div>
        )}
      </div>

      {/* Controls */}
      <div style={{width:"100%",maxWidth:400,marginTop:16,display:"flex",justifyContent:"space-between",alignItems:"center",background:"rgba(20,20,20,.5)",padding:14,borderRadius:14,border:"1px solid #222"}}>
        <div style={{display:"flex",flexDirection:"column",gap:6}}>
          <div style={{display:"flex",gap:6,fontSize:10,fontWeight:900,color:"#666"}}>
            <div style={{width:26,height:26,border:"2px solid #333",display:"grid",placeItems:"center",borderRadius:6}}>←</div>
            <div style={{width:26,height:26,border:"2px solid #333",display:"grid",placeItems:"center",borderRadius:6}}>↓</div>
            <div style={{width:26,height:26,border:"2px solid #333",display:"grid",placeItems:"center",borderRadius:6}}>→</div>
          </div>
          <div style={{fontSize:9,color:"#777",fontWeight:900,letterSpacing:"0.2em",textTransform:"uppercase"}}>Move</div>
        </div>

        <button
          onPointerDown={() => { if (gameState === "PLAYING") gameRef.current.isFiring = true; }}
          onPointerUp={() => { if (gameState === "PLAYING") gameRef.current.isFiring = false; }}
          style={{width:64,height:64,borderRadius:"50%",background:"#5a0000",border:"4px solid #7a0000",cursor:"pointer",display:"grid",placeItems:"center"}}
          aria-label="Fire"
        >
          <Zap color="#fff" size={24} />
        </button>
      </div>

      <div style={{marginTop:10,display:"flex",gap:20,fontSize:9,color:"#666",fontWeight:900,letterSpacing:"0.2em",textTransform:"uppercase"}}>
        <span style={{display:"flex",alignItems:"center",gap:8}}><span style={{width:8,height:8,background:"#ffd84d",borderRadius:"50%"}}></span>DDT Bomb</span>
        <span style={{display:"flex",alignItems:"center",gap:8}}><span style={{width:8,height:8,background:"#38ff38",borderRadius:"50%"}}></span>Poison</span>
      </div>
    </div>
  );
}
