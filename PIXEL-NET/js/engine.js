/**
 * PIXEL-NET ENGINE
 * Connects the Frontend (GitHub) to the Backend (Render)
 */

const PixelNet = {
  config: {
    BACKEND_URL: "https://pixel-net-backend.onrender.com"
  },

  player: {
    initials: "???",
    token: null
  },

  init: function () {
    // Preferred: sessionStorage (set during play flow)
    let initials = sessionStorage.getItem("playerInitials");

    // Fallback: localStorage (set on homepage badge modal)
    if (!initials) {
      initials = localStorage.getItem("px_player_initials");
      if (initials) {
        sessionStorage.setItem("playerInitials", initials);
      }
    }

    if (initials) {
      this.player.initials = initials.toString().trim().toUpperCase();
      console.log("Pixel-Net Linked. Player:", this.player.initials);
    } else {
      console.warn("Pixel-Net: No initials found (session/local). Using ???");
    }
  },

  // --- SUBMIT SCORE TO RENDER ---
  submitScore: async function (gameSlug, score) {
    console.log(`Sending Score... Game: ${gameSlug}, Score: ${score}, Initials: ${this.player.initials}`);

    try {
      const response = await fetch(`${this.config.BACKEND_URL}/api/score`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          game_slug: gameSlug,
          initials: this.player.initials,
          score: score
        })
      });

      // Always read body (backend may return 200 with ok:false)
      let data = null;
      try {
        data = await response.json();
      } catch (_) {
        // non-json response
      }

      if (!response.ok) {
        console.warn("Upload failed (HTTP).", response.status, data);
        alert(`UPLOAD FAILED (HTTP ${response.status})\nCheck DevTools → Network → /api/score`);
        return;
      }

      // Prefer backend truth if provided
      if (data && data.ok === false) {
        console.warn("Upload rejected by backend:", data);
        alert(`UPLOAD REJECTED\n${data.error || "Backend returned ok:false"}\nCheck DevTools → Network → /api/score`);
        return;
      }

      // Success
      alert(`SCORE UPLOADED!\n${gameSlug.toUpperCase()}: ${score}`);
    } catch (err) {
      console.error("Network Error:", err);
      alert("UPLOAD FAILED (NETWORK)\nCheck DevTools Console");
    }
  },

  // --- GET LEADERBOARD FROM RENDER ---
  getLeaderboard: async function (gameSlug) {
    try {
      const response = await fetch(`${this.config.BACKEND_URL}/api/leaderboard/${gameSlug}`);
      const data = await response.json();

      // Your backend returns { ok:true, game_slug, top10:[] }
      if (data && Array.isArray(data.top10)) return data.top10;

      // Back-compat if backend returns array directly
      if (Array.isArray(data)) return data;

      return [];
    } catch (err) {
      console.error("Could not fetch leaderboard", err);
      return [];
    }
  },

  // --- INPUT HANDLER (Standard Controls) ---
  Input: {
    keys: { up: false, down: false, left: false, right: false, action: false },

    startListening: function () {
      window.addEventListener("keydown", (e) => this.handleKey(e, true));
      window.addEventListener("keyup", (e) => this.handleKey(e, false));
    },

    handleKey: function (e, isPressed) {
      if (e.code === "ArrowUp" || e.code === "KeyW") this.keys.up = isPressed;
      if (e.code === "ArrowDown" || e.code === "KeyS") this.keys.down = isPressed;
      if (e.code === "ArrowLeft" || e.code === "KeyA") this.keys.left = isPressed;
      if (e.code === "ArrowRight" || e.code === "KeyD") this.keys.right = isPressed;
      if (e.code === "Space" || e.code === "Enter") this.keys.action = isPressed;
    }
  }
};

// Start engine
PixelNet.init();
PixelNet.Input.startListening();
window.PixelNet = PixelNet;
