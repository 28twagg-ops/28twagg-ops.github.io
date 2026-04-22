(() => {
  "use strict";

  const startOv = document.getElementById("startOv");
  const hintEl = document.getElementById("hint");
  const submitBtn = document.getElementById("submit");

  let overlayDismissed = false;
  let autoStartDone = false;

  function focusGame() {
    try { document.body.focus(); } catch (_) {}
    const canvas = document.querySelector("#game canvas");
    if (canvas && canvas.focus) canvas.focus();
    const iframe = document.querySelector("#game iframe");
    if (iframe && iframe.contentWindow && iframe.contentWindow.focus) {
      try { iframe.contentWindow.focus(); } catch (_) {}
    }
  }

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
    try { document.dispatchEvent(ev); } catch (_) {}
    try { window.dispatchEvent(ev); } catch (_) {}
    const canvas = document.querySelector("#game canvas");
    if (canvas) { try { canvas.dispatchEvent(ev); } catch (_) {} }
    const body = document.body;
    if (body) { try { body.dispatchEvent(ev); } catch (_) {} }
  }

  function pressKey(keyInfo, hold) {
    dispatchKey(keyInfo, true);
    setTimeout(() => dispatchKey(keyInfo, false), hold || 120);
  }

  function emulatorReady() {
    try {
      if (window.EJS_emulator) {
        if (window.EJS_emulator.started) return true;
        if (window.EJS_emulator.gameManager) return true;
      }
    } catch (_) {}
    return !!document.querySelector("#game canvas");
  }

  function runAutoStart() {
    if (autoStartDone) return;
    const seq = window.EMU_AUTOSTART;
    if (!seq || !Array.isArray(seq) || seq.length === 0) return;

    let attempts = 0;
    const maxAttempts = 100; // ~50s headroom

    const kick = () => {
      if (!overlayDismissed) {
        setTimeout(kick, 400);
        return;
      }
      if (!emulatorReady()) {
        if (attempts++ < maxAttempts) { setTimeout(kick, 500); return; }
        return; // give up quietly
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

  if (startOv) {
    startOv.addEventListener("click", () => {
      startOv.classList.add("hidden");
      overlayDismissed = true;
      focusGame();
      runAutoStart();
    });
  } else {
    overlayDismissed = true;
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
