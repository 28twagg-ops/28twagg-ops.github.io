(() => {
  "use strict";

  // ----------------------------------------------------------------
  // Shared EmulatorJS helpers
  //
  // Responsibilities:
  //   1. Force keyboard focus onto the emulator canvas at all times,
  //      so real keypresses reach the libretro core.
  //   2. Provide an on-screen action bar (coin, start, reset, space…)
  //      that invokes EJS's internal simulateInput() when available
  //      and falls back to synthetic KeyboardEvents otherwise. This
  //      bypasses the isTrusted problem some cores enforce.
  //   3. Wire up the SUBMIT SCORE button for leaderboard posting.
  // ----------------------------------------------------------------

  const hintEl   = document.getElementById("hint");
  const submitBtn = document.getElementById("submit");
  const actionBar = document.getElementById("actions");
  const errorOv   = document.getElementById("errorOv");

  let cachedCanvas = null;

  // ---- Focus management --------------------------------------------------

  function findCanvas() {
    if (cachedCanvas && document.body.contains(cachedCanvas)) return cachedCanvas;
    const c = document.querySelector("#game canvas") || document.querySelector("canvas");
    if (c) {
      try { c.setAttribute("tabindex", "0"); } catch (_) {}
      try { c.style.outline = "none"; } catch (_) {}
      cachedCanvas = c;
    }
    return c;
  }

  function focusGame() {
    const c = findCanvas();
    if (c && c.focus) { try { c.focus({ preventScroll: true }); } catch (_) { try { c.focus(); } catch (_) {} } }
    try { window.focus(); } catch (_) {}
  }

  // ---- Synthetic key dispatch (fallback for simulated inputs) ------------

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
    setTimeout(() => dispatchKey(keyInfo, false), hold || 140);
  }

  // ---- EJS direct button simulation (bypasses isTrusted rejection) -------
  //
  // EmulatorJS exposes gameManager.simulateInput(player, button, value).
  // Button IDs correspond to libretro RETRO_DEVICE_ID_JOYPAD_* values:
  //   0=B, 1=Y, 2=SELECT, 3=START, 4=UP, 5=DOWN, 6=LEFT, 7=RIGHT,
  //   8=A, 9=X, 10=L, 11=R
  // For arcade/coin insertion libretro uses the standard SELECT (2) and
  // START (3) buttons along with credit inputs.
  //
  function simulateButton(btn, duration) {
    duration = duration || 180;
    try {
      const e = window.EJS_emulator;
      if (e && e.gameManager && typeof e.gameManager.simulateInput === "function") {
        e.gameManager.simulateInput(0, btn, 1);
        setTimeout(() => {
          try { e.gameManager.simulateInput(0, btn, 0); } catch (_) {}
        }, duration);
        return true;
      }
    } catch (_) {}
    return false;
  }

  // Press an action: try EJS simulate first, fall back to keyboard events.
  function triggerAction(action) {
    focusGame();
    if (action.btn !== undefined && simulateButton(action.btn, action.hold || 180)) return;
    if (action.keys && Array.isArray(action.keys)) {
      let acc = 0;
      action.keys.forEach(k => {
        setTimeout(() => pressKey(k, k.hold || 140), acc);
        acc += (k.delay || 200);
      });
    } else if (action.key) {
      pressKey(action, action.hold);
    }
  }

  // ---- Emulator readiness hooks -----------------------------------------

  function emulatorReady() {
    try {
      if (window.EJS_emulator) {
        if (window.EJS_emulator.started === true) return true;
        if (window.EJS_emulator.gameManager) return true;
      }
    } catch (_) {}
    return !!findCanvas();
  }

  // Chain EJS_ready/onGameStart without clobbering anything set by the page.
  const prevReady = window.EJS_ready;
  window.EJS_ready = function EJS_ready_chain() {
    try { if (typeof prevReady === "function") prevReady(); } catch (_) {}
    findCanvas();
    focusGame();
    setTimeout(focusGame, 300);
    setTimeout(focusGame, 1200);
    setTimeout(focusGame, 3000);
    runAutoStart();
  };

  const prevGameStart = window.EJS_onGameStart;
  window.EJS_onGameStart = function EJS_onGameStart_chain() {
    try { if (typeof prevGameStart === "function") prevGameStart(); } catch (_) {}
    focusGame();
    runAutoStart();
  };

  // ---- Auto-start sequence ----------------------------------------------

  let autoStartDone = false;
  function runAutoStart() {
    if (autoStartDone) return;
    const seq = window.EMU_AUTOSTART;
    if (!seq || !Array.isArray(seq) || seq.length === 0) return;
    let attempts = 0;
    const maxAttempts = 120;
    const kick = () => {
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
          setTimeout(() => triggerAction(step), acc);
        });
      }, initDelay);
    };
    kick();
  }

  // ---- Global focus keepers ---------------------------------------------

  document.addEventListener("pointerdown", focusGame, true);
  document.addEventListener("click", focusGame, true);
  document.addEventListener("touchstart", focusGame, { passive: true, capture: true });
  window.addEventListener("focus", focusGame);
  setInterval(() => {
    const ae = document.activeElement;
    if (!ae || ae === document.body || ae.tagName === "CANVAS" || ae.tagName === "IFRAME") focusGame();
  }, 1500);
  setTimeout(focusGame, 800);
  setTimeout(focusGame, 2500);
  setTimeout(focusGame, 5000);
  setTimeout(runAutoStart, 4000);

  // ---- On-screen action bar buttons -------------------------------------

  if (actionBar) {
    actionBar.addEventListener("click", (e) => {
      const btn = e.target.closest("button[data-act]");
      if (!btn) return;
      e.stopPropagation();
      const act = btn.getAttribute("data-act");
      const defs = (window.EMU_ACTIONS || {});
      const action = defs[act];
      if (action) triggerAction(action);
      // Visual feedback
      btn.classList.add("pressed");
      setTimeout(() => btn.classList.remove("pressed"), 220);
      focusGame();
    });
  }

  // ---- Hint dim --------------------------------------------------------

  if (hintEl) {
    setTimeout(() => hintEl.classList.add("dim"), 9000);
    hintEl.addEventListener("mouseenter", () => hintEl.classList.remove("dim"));
    hintEl.addEventListener("mouseleave", () => hintEl.classList.add("dim"));
  }

  // ---- Manual score submission -----------------------------------------

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

  // ---- Error surfacing --------------------------------------------------
  //
  // If EJS fails to boot within 25 seconds, show a friendly message with
  // the details so the user knows WHY the screen is blank.
  //
  if (errorOv) {
    setTimeout(() => {
      if (!emulatorReady()) {
        errorOv.classList.remove("hidden");
        const msgEl = errorOv.querySelector(".msg");
        if (msgEl && !msgEl.textContent) {
          msgEl.textContent =
            "The emulator didn't boot within 25s. Most common cause: your ROM file isn't compatible with this core's CRC list. " +
            "If you refresh and still see this, the ROM needs to be replaced with a matching set.";
        }
      }
    }, 25000);
  }

  // Log console errors visibly for user-friendly debugging
  window.addEventListener("error", (e) => {
    console.error("[emu-controls] unhandled error:", e.message, e.error || "");
  });
})();
