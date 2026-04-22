(() => {
  "use strict";

  // ----------------------------------------------------------------
  // Shared EmulatorJS control helpers used by every emu.html loader.
  //
  // Its main jobs:
  //   1. Keep keyboard focus locked on the emulator canvas so the
  //      user's keypresses actually reach the libretro core.
  //   2. Fire an optional EMU_AUTOSTART key sequence after the
  //      emulator reports itself ready, to skip coin/start screens.
  //   3. Wire the "SUBMIT SCORE" button so emulated titles can still
  //      post a score up to the PIXEL-NET leaderboard wrapper.
  // ----------------------------------------------------------------

  const startOv = document.getElementById("startOv");
  const hintEl = document.getElementById("hint");
  const submitBtn = document.getElementById("submit");

  let overlayDismissed = !startOv;
  let autoStartDone = false;
  let cachedCanvas = null;

  // ---- Focus management --------------------------------------------------

  function findCanvas() {
    if (cachedCanvas && document.body.contains(cachedCanvas)) return cachedCanvas;
    const c = document.querySelector("#game canvas") || document.querySelector("canvas");
    if (c) {
      try { c.setAttribute("tabindex", "0"); } catch (_) {}
      cachedCanvas = c;
    }
    return c;
  }

  function focusGame() {
    const c = findCanvas();
    if (c && c.focus) { try { c.focus({ preventScroll: true }); } catch (_) { try { c.focus(); } catch (_) {} } }
    try { window.focus(); } catch (_) {}
    try { document.body && document.body.focus && document.body.focus(); } catch (_) {}
    const iframe = document.querySelector("#game iframe");
    if (iframe && iframe.contentWindow && iframe.contentWindow.focus) {
      try { iframe.contentWindow.focus(); } catch (_) {}
    }
  }

  // ---- Synthetic key dispatch (best-effort autostart) --------------------

  function dispatchKey(keyInfo, down) {
    const props = {
      key: keyInfo.key,
      code: keyInfo.code,
      keyCode: keyInfo.keyCode,
      which: keyInfo.keyCode,
      bubbles: true,
      cancelable: true
    };
    const ev = new KeyboardEvent(down ? "keydown" : "keyup", props);
    const targets = [document, window, document.body, findCanvas()];
    targets.forEach(t => { if (t) { try { t.dispatchEvent(ev); } catch (_) {} } });
  }

  function pressKey(keyInfo, hold) {
    dispatchKey(keyInfo, true);
    setTimeout(() => dispatchKey(keyInfo, false), hold || 120);
  }

  // ---- Emulator readiness detection --------------------------------------

  function emulatorReady() {
    try {
      if (window.EJS_emulator) {
        if (window.EJS_emulator.started === true) return true;
        if (window.EJS_emulator.gameManager) return true;
      }
    } catch (_) {}
    return !!findCanvas();
  }

  function runAutoStart() {
    if (autoStartDone) return;
    const seq = window.EMU_AUTOSTART;
    if (!seq || !Array.isArray(seq) || seq.length === 0) return;

    let attempts = 0;
    const maxAttempts = 120; // ~60s headroom while emulator downloads + boots

    const kick = () => {
      if (!overlayDismissed) { setTimeout(kick, 400); return; }
      if (!emulatorReady()) {
        if (attempts++ < maxAttempts) { setTimeout(kick, 500); return; }
        return;
      }
      autoStartDone = true;
      focusGame();
      const initDelay = window.EMU_AUTOSTART_INIT || 2500;
      setTimeout(() => {
        let acc = 0;
        seq.forEach(step => {
          acc += step.delay || 400;
          setTimeout(() => {
            focusGame();
            pressKey(step, step.hold || 140);
          }, acc);
        });
      }, initDelay);
    };

    kick();
  }

  // ---- EmulatorJS hooks -------------------------------------------------

  // EJS fires EJS_ready when its UI is mounted and a game is loaded.
  // Chain our handler alongside any existing callback the page set.
  const prevReady = window.EJS_ready;
  window.EJS_ready = function EJS_ready_chain() {
    try { if (typeof prevReady === "function") prevReady(); } catch (_) {}
    findCanvas();
    focusGame();
    // Kick a few more times while EJS finalises its DOM.
    setTimeout(focusGame, 300);
    setTimeout(focusGame, 1200);
    setTimeout(focusGame, 3000);
    if (overlayDismissed) runAutoStart();
  };

  // Some EJS builds expose EJS_onGameStart — chain it the same way.
  const prevGameStart = window.EJS_onGameStart;
  window.EJS_onGameStart = function EJS_onGameStart_chain() {
    try { if (typeof prevGameStart === "function") prevGameStart(); } catch (_) {}
    focusGame();
    if (overlayDismissed) runAutoStart();
  };

  // ---- Click-to-start overlay -------------------------------------------

  if (startOv) {
    startOv.addEventListener("click", () => {
      startOv.classList.add("hidden");
      overlayDismissed = true;
      focusGame();
      runAutoStart();
    });
  }

  // ---- Global focus keepers ---------------------------------------------

  const refocus = () => { focusGame(); };
  document.addEventListener("pointerdown", refocus, true);
  document.addEventListener("click", refocus, true);
  document.addEventListener("touchstart", refocus, { passive: true, capture: true });
  window.addEventListener("focus", refocus);
  setInterval(() => {
    // Only re-focus when nothing interactive currently holds focus.
    const ae = document.activeElement;
    if (!ae || ae === document.body || ae.tagName === "CANVAS") focusGame();
  }, 1500);
  setTimeout(focusGame, 800);
  setTimeout(focusGame, 2500);
  setTimeout(focusGame, 5000);

  // ---- Auto-dim hint bar after a few seconds ----------------------------

  if (hintEl) {
    setTimeout(() => hintEl.classList.add("dim"), 9000);
    hintEl.addEventListener("mouseenter", () => hintEl.classList.remove("dim"));
    hintEl.addEventListener("mouseleave", () => hintEl.classList.add("dim"));
  }

  // ---- Manual score submission (emulated titles can't auto-report) ------

  if (submitBtn) {
    submitBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      const raw = window.prompt("Enter your final score for the leaderboard (numbers only):", "0");
      if (raw === null) { focusGame(); return; }
      const n = parseInt(String(raw).replace(/[^0-9]/g, ""), 10);
      if (!Number.isFinite(n) || n < 0) {
        submitBtn.textContent = "INVALID SCORE";
        setTimeout(() => { submitBtn.textContent = "SUBMIT SCORE"; }, 1500);
        focusGame();
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
})();
