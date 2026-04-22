(() => {
  "use strict";

  const startOv = document.getElementById("startOv");
  const hintEl = document.getElementById("hint");
  const submitBtn = document.getElementById("submit");

  function focusGame() {
    try { document.body.focus(); } catch (_) {}
    const canvas = document.querySelector("#game canvas");
    if (canvas && canvas.focus) canvas.focus();
    const iframe = document.querySelector("#game iframe");
    if (iframe && iframe.contentWindow && iframe.contentWindow.focus) {
      try { iframe.contentWindow.focus(); } catch (_) {}
    }
  }

  if (startOv) {
    startOv.addEventListener("click", () => {
      startOv.classList.add("hidden");
      focusGame();
    });
  }

  document.addEventListener("click", focusGame);
  document.addEventListener("touchstart", focusGame, { passive: true });
  window.addEventListener("focus", focusGame);
  setTimeout(focusGame, 1500);
  setTimeout(focusGame, 3500);

  if (hintEl) {
    setTimeout(() => hintEl.classList.add("dim"), 9000);
    hintEl.addEventListener("mouseenter", () => hintEl.classList.remove("dim"));
    hintEl.addEventListener("mouseleave", () => hintEl.classList.add("dim"));
  }

  if (submitBtn) {
    submitBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      const raw = window.prompt("Enter your final score for the leaderboard (numbers only):", "0");
      if (raw === null) return;
      const n = parseInt(String(raw).replace(/[^0-9]/g, ""), 10);
      if (!Number.isFinite(n) || n < 0) {
        submitBtn.textContent = "INVALID SCORE";
        setTimeout(() => { submitBtn.textContent = "SUBMIT SCORE"; }, 1500);
        return;
      }
      try {
        window.parent.postMessage({ type: "GAME_OVER_SCORE", score: n }, "*");
        submitBtn.textContent = "SUBMITTED (" + n + ")";
        submitBtn.disabled = true;
        setTimeout(() => {
          submitBtn.textContent = "SUBMIT SCORE";
          submitBtn.disabled = false;
        }, 2500);
      } catch (_) {}
      focusGame();
    });
  }

  window.addEventListener("beforeunload", () => {
    try { window.parent.postMessage({ type: "GAME_OVER_SCORE", score: 0 }, "*"); } catch (_) {}
  });
})();
