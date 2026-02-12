/**
 * Golden Leaderboard Module (logic-only)
 * - No CSS injection
 * - Wrapper stays in full control of theme/layout
 *
 * Endpoints (Render):
 *   POST /api/score { game_slug, initials, score }
 *   GET  /api/leaderboard/:slug
 */
(function(){
  const GoldenLB = {
    config: {
      BACKEND_URL: "https://pixel-net-backend.onrender.com"
    },

    _normalizeLeaderboard: function (data) {
      if (Array.isArray(data)) return data;
      if (!data) return [];
      if (Array.isArray(data.top10)) return data.top10;
      if (Array.isArray(data.scores)) return data.scores;
      if (Array.isArray(data.leaderboard)) return data.leaderboard;
      return [];
    },

    getLeaderboard: async function (gameSlug) {
      try {
        const res = await fetch(`${this.config.BACKEND_URL}/api/leaderboard/${encodeURIComponent(gameSlug)}`, { cache: "no-store" });
        const data = await res.json();
        return this._normalizeLeaderboard(data);
      } catch (err) {
        console.error("[GoldenLB] Could not fetch leaderboard", err);
        return [];
      }
    },

    submitScore: async function (gameSlug, initials, score) {
      const safeInitials = (initials || "???").toString().toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0,3) || "???";
      const safeScore = Number.isFinite(score) ? Math.floor(score) : 0;

      try {
        const res = await fetch(`${this.config.BACKEND_URL}/api/score`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ game_slug: gameSlug, initials: safeInitials, score: safeScore })
        });
        if (!res.ok) {
          let t = "";
          try { t = await res.text(); } catch(_) {}
          console.warn("[GoldenLB] submitScore non-200", res.status, t);
          return false;
        }
        return true;
      } catch (err) {
        console.error("[GoldenLB] submitScore failed", err);
        return false;
      }
    }
  };

  window.GoldenLB = GoldenLB;
})();
