// ================================================================
// PIXEL-NET Shared Wrapper Shell
// ================================================================
// FIREBASE SETUP — Shared cross-device leaderboards (free)
//
// 1. Go to https://console.firebase.google.com → Add project
// 2. Click "Realtime Database" in the left sidebar → Create database
//    → Start in TEST MODE (sets read/write to true)
// 3. Copy your database URL (looks like:
//    https://YOUR-PROJECT-default-rtdb.firebaseio.com)
// 4. Paste it below and replace null:
//
const FIREBASE_DB_URL = "https://pixel-net-arcade-default-rtdb.firebaseio.com";
// example: "https://pixel-net-arcade-default-rtdb.firebaseio.com"
//
// After saving this file and pushing to GitHub, all players on
// all devices will share the same leaderboard per game.
// See PIXEL-NET/wrapper/FIREBASE_SETUP.md for full instructions.
// ================================================================

(() => {
  const CFG = (window.PX_WRAPPER || {});
  const T = CFG.theme || {};
  // Imported third-party titles keep their original score storage. The shared
  // cabinet layout is reused, but these games never access PIXEL-NET Firebase.
  const licensed = CFG.licensed && typeof CFG.licensed === 'object' ? CFG.licensed : null;
  const root = document.documentElement;

  // Apply per-game theme
  if (T.hero)  root.style.setProperty('--hero',  T.hero);
  if (T.hero2) root.style.setProperty('--hero2', T.hero2);
  if (T.bg0)   root.style.setProperty('--bg0',   T.bg0);
  if (T.bg2)   root.style.setProperty('--bg2',   T.bg2);

  const title = CFG.title || 'PIXEL-NET';
  document.title = title + ' — PIXEL-NET';

  const instructions = Array.isArray(CFG.instructions) ? CFG.instructions : [];
  const esc = s => String(s||'')
    .replace(/&/g,'&amp;')
    .replace(/</g,'&lt;')
    .replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;')
    .replace(/'/g,'&#39;');
  const fmt = s => esc(s)
    .replace(/\bArrow Keys\b/gi,'<span class="kbd">↑</span><span class="kbd">↓</span><span class="kbd">←</span><span class="kbd">→</span>')
    .replace(/\bWASD\b/gi,'<span class="kbd">W</span><span class="kbd">A</span><span class="kbd">S</span><span class="kbd">D</span>')
    .replace(/\bSpace\b/gi,'<span class="kbd">SPACE</span>')
    .replace(/\bEnter\b/gi,'<span class="kbd">ENTER</span>');
  const iconFor = s => {
    const t = String(s || '').toLowerCase();
    if (/move|navigate|steer|flap|control|arrow|wasd/.test(t)) return '🎮';
    if (/shoot|fire|bomb|attack|combat/.test(t)) return '⚡';
    if (/objective|goal|collect|cross|clear|survive/.test(t)) return '🎯';
    if (/score|leaderboard|save|submit/.test(t)) return '🏆';
    return '•';
  };
  const buildInstructionCard = line => {
    const raw = String(line || '');
    const parts = raw.split(':');
    if (parts.length > 1) {
      const action = fmt(parts.shift().trim());
      const detail = fmt(parts.join(':').trim());
      const icon = iconFor(raw);
      return `<div class="instrCard"><div class="instrAction"><span class="i">${icon}</span> ${action}</div><div class="instrDetail">${detail}</div></div>`;
    }
    const looksDirectional = /arrow keys|wasd|move|left|right|up|down/i.test(raw);
    if (looksDirectional) {
      return `<div class="instrCard diagramCard"><div class="instrAction"><span class="i">🎮</span> ${fmt(raw)}</div><div class="arrowPad"><span class="kbd up">↑</span><span class="kbd left">←</span><span class="kbd down">↓</span><span class="kbd right">→</span></div></div>`;
    }
    const icon = iconFor(raw);
    return `<div class="instrCard"><div class="instrDetail"><span class="i">${icon}</span> ${fmt(raw)}</div></div>`;
  };

  // Do not assert a global connection until the Firebase read succeeds.
  const globalBadge = !licensed && FIREBASE_DB_URL ? '<span class="badge" data-cloud-status>VERIFYING</span>' : '';
  const verifiedHref=(value,allowLocal=false)=>{
    const url=String(value||'');
    return /^https:\/\//.test(url) || (allowLocal && /^\.\.\/\.\.\/licensed\/vendors\/[a-z0-9/_\-.]+$/i.test(url))
      ? esc(url) : '#';
  };
  const licensedInfo=licensed ? `<div class="licensedInfo" role="region" aria-label="Creator and license">
    <div class="licensedStamp">INDEPENDENT CREATOR · ${esc(licensed.license||'MIT')}</div>
    <div class="licensedCreator">${esc(licensed.creator||'Original creator')}</div>
    <p>This game is an attributed third-party title, not a PIXEL-NET original.</p>
    <p>Scores remain within the original game (on this device where supported). <strong>No PIXEL-NET global score uploads.</strong></p>
    ${licensed.orientation==='landscape'?'<p class="licensedLandscape">↻ Phone: rotate to landscape and turn off portrait lock if necessary.</p>':''}
    <a href="${verifiedHref(licensed.source)}" target="_blank" rel="noopener noreferrer">Original creator &amp; source</a>
    <a href="${verifiedHref(licensed.notice,true)}" target="_blank" rel="noopener noreferrer">Read original ${esc(licensed.license||'license')} notice</a>
  </div>` : '';
  const stepsHTML   = instructions.map(buildInstructionCard).join('');
  const isSpyderCasino = (CFG.slug || '').toLowerCase() === 'spyder-casino';
  const desktopBoardHTML = licensed ? licensedInfo : isSpyderCasino
    ? `<div style="display:grid;grid-template-columns:1fr;gap:10px">
         <div><h3 style="margin:0 0 6px 0;font-size:10px;letter-spacing:.24em;text-transform:uppercase;color:rgba(243,246,255,.60);">Blackjack · Standard ${globalBadge}</h3><div class="boardStack" id="boardDesktopBjStd"></div></div>
         <div><h3 style="margin:0 0 6px 0;font-size:10px;letter-spacing:.24em;text-transform:uppercase;color:rgba(243,246,255,.60);">Blackjack · Analysis ${globalBadge}</h3><div class="boardStack" id="boardDesktopBjAn"></div></div>
         <div><h3 style="margin:0 0 6px 0;font-size:10px;letter-spacing:.24em;text-transform:uppercase;color:rgba(243,246,255,.60);">Hold'em · Standard ${globalBadge}</h3><div class="boardStack" id="boardDesktopHeStd"></div></div>
         <div><h3 style="margin:0 0 6px 0;font-size:10px;letter-spacing:.24em;text-transform:uppercase;color:rgba(243,246,255,.60);">Hold'em · Analysis ${globalBadge}</h3><div class="boardStack" id="boardDesktopHeAn"></div></div>
       </div>`
    : `<div class="boardStack" id="boardDesktop"></div>`;
  const mobileBoardHTML = licensed ? licensedInfo : isSpyderCasino
    ? `<div style="display:grid;grid-template-columns:1fr;gap:10px">
         <div><h3 style="margin:0 0 6px 0;font-size:10px;letter-spacing:.24em;text-transform:uppercase;color:rgba(243,246,255,.60);">Blackjack · Standard ${globalBadge}</h3><div class="boardStack" id="boardMobileBjStd"></div></div>
         <div><h3 style="margin:0 0 6px 0;font-size:10px;letter-spacing:.24em;text-transform:uppercase;color:rgba(243,246,255,.60);">Blackjack · Analysis ${globalBadge}</h3><div class="boardStack" id="boardMobileBjAn"></div></div>
         <div><h3 style="margin:0 0 6px 0;font-size:10px;letter-spacing:.24em;text-transform:uppercase;color:rgba(243,246,255,.60);">Hold'em · Standard ${globalBadge}</h3><div class="boardStack" id="boardMobileHeStd"></div></div>
         <div><h3 style="margin:0 0 6px 0;font-size:10px;letter-spacing:.24em;text-transform:uppercase;color:rgba(243,246,255,.60);">Hold'em · Analysis ${globalBadge}</h3><div class="boardStack" id="boardMobileHeAn"></div></div>
       </div>`
    : `<div class="boardStack" id="boardMobile"></div>`;

  // Inject markup
  document.body.innerHTML = `
    <div class="topbar">
      <div class="top-left"><a class="exit" href="../../index.html" id="exitBtn">✕ EXIT</a></div>
      <div class="gameBadge" id="gameBadge">${title.toUpperCase()}<span class="verTag" id="verTag">version: ...</span></div>
      <div class="playerBtn" id="playerBtn" role="button" aria-label="Set player initials">
        <span class="muted">PLAYER</span><strong id="initials">???</strong>
      </div>
    </div>

    <div class="shell">
      <div class="panel">
        <h3>How To Play</h3>
        <div class="content">
          <div id="instructionsDesktop" class="instructionGrid">${stepsHTML}</div>
        </div>
      </div>
      <div class="center">
        <div class="frame" id="gameFrame">
          <iframe id="gameDesktop" allow="gamepad *; fullscreen *; autoplay"></iframe>
        </div>
      </div>
      <div class="panel leaderboard">
        <h3>${licensed?'Creator &amp; License':'Leaderboard '+globalBadge}</h3>
        <div class="content">${desktopBoardHTML}</div>
      </div>
    </div>

    <div class="mobileWrap">
      <div class="mobileStack">
        <div class="displayZone">
          <div class="displayCard mobileFrame" id="view-game">
            <!-- The sole game iframe is mounted here on narrow viewports. -->
          </div>
          <div class="panel displayCard hidden" id="view-howto">
            <div class="content">
              <div id="instructionsMobile" class="instructionGrid">${stepsHTML}</div>
            </div>
          </div>
          <div class="panel leaderboard displayCard hidden" id="view-board">
            <h3 style="margin:0;padding:11px 14px;font-size:10px;letter-spacing:.24em;text-transform:uppercase;color:rgba(243,246,255,.60);border-bottom:1px solid rgba(255,255,255,.08);">${licensed?'Creator &amp; License':'Leaderboard '+globalBadge}</h3>
            <div class="content">${mobileBoardHTML}</div>
          </div>
        </div>
        <div class="btnbar">
          <button class="tabBtn active" data-tab="game" type="button">▶ Game</button>
          <button class="tabBtn" data-tab="howto" type="button">? How To</button>
          <button class="tabBtn" data-tab="board" type="button">${licensed?'ⓘ Credits':'🏆 Scores'}</button>
        </div>
      </div>
    </div>

    <div class="modalBack" id="modalBack" aria-hidden="true">
      <div class="modalCard" role="dialog" aria-modal="true">
        <button class="modalClose" id="modalClose" type="button">✕</button>
        <div class="modalInner">
          <div class="modalTitle">Enter Initials</div>
          <input class="modalInput" id="initialsInput" maxlength="3" placeholder="— — —" />
          <button class="modalSave" id="saveInitials" type="button">Save</button>
          <div class="modalHint">Press Enter to save</div>
        </div>
      </div>
    </div>
  `;
  async function loadVersionTag() {
    const el = document.getElementById('verTag');
    if (!el) return;
    try {
      const r = await fetch('../../version.json', { cache: 'no-store' });
      if (!r.ok) throw new Error('version missing');
      const d = await r.json();
      const raw = (d && d.version) ? String(d.version).trim() : 'unknown';
      const normalized = raw.replace(/^v/i, '');
      el.textContent = `version: ${normalized}`;
    } catch (_) {
      el.textContent = 'version: n/a';
    }
  }
  loadVersionTag();

  // --- Aspect ratio: prevent game canvas stretching ---
  // CSS aspect-ratio is unreliable on iframes (no intrinsic size).
  // We compute pixel dimensions in JS and re-apply on every resize.
  if (CFG.aspectRatio) {
    const [rw, rh] = CFG.aspectRatio.split('/').map(Number);
    const ratio = rw / rh;

    const fitFrame = (container, frame) => {
      if (!container || !frame) return;
      const availW = container.clientWidth;
      const availH = container.clientHeight;
      if (!availW || !availH) return;
      const w = availW / availH > ratio
        ? Math.floor(availH * ratio)   // height-constrained → width = h × ratio
        : availW;                       // width-constrained  → width = availW
      const h = Math.round(w / ratio);
      frame.style.width  = w + 'px';
      frame.style.height = h + 'px';
      frame.style.flex   = '0 0 auto';
    };

    const desktopFrame  = document.getElementById('gameFrame');
    const desktopCenter = document.querySelector('.center');
    const mobileFrame   = document.getElementById('view-game');
    const mobileZone    = document.querySelector('.displayZone');

    const refit = () => {
      fitFrame(desktopCenter, desktopFrame);
      // Mobile gameplay takes the available zone; the game's own canvas preserves its pixels.
      mobileFrame.style.width = '100%';
      mobileFrame.style.height = '100%';
      mobileFrame.style.flex = '1 1 auto';
    };

    // Run once after layout is ready, then on every resize
    requestAnimationFrame(refit);
    if (window.ResizeObserver) {
      new ResizeObserver(refit).observe(desktopCenter);
      new ResizeObserver(refit).observe(mobileZone);
    } else {
      window.addEventListener('resize', refit);
    }
  }

  // --- Initials (shared across all games, all tabs) ---
  const KEY_MAIN = 'PIXELNET_INITIALS';
  const KEY_ALT  = 'playerInitials';
  const clean = s => (s||'').toString().toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,3);
  const getInitials = () =>
    localStorage.getItem(KEY_MAIN) || localStorage.getItem(KEY_ALT) ||
    sessionStorage.getItem(KEY_ALT) || '???';
  const setInitialsAll = v => {
    localStorage.setItem(KEY_MAIN, v);
    localStorage.setItem(KEY_ALT, v);
    sessionStorage.setItem(KEY_ALT, v);
  };
  const renderInitials = () => {
    const el = document.getElementById('initials');
    if (el) el.textContent = getInitials();
  };
  renderInitials();
  window.addEventListener('storage', e => {
    if (e.key === KEY_MAIN || e.key === KEY_ALT) renderInitials();
  });

  // Exit always returns to this arcade, not an arbitrary browser history page.

  // --- Iframe setup ---
  const entry = CFG.entry || './game.html';
  const gd = document.getElementById('gameDesktop');
  const mobileMount = document.getElementById('view-game');
  const desktopMount = document.getElementById('gameFrame');
  const mobileQuery = matchMedia('(max-width: 1100px)');
  // One running game. Remount only when switching desktop/mobile layouts.
  // Some browsers reload an iframe when adopted into a new parent.
  const mountGame = () => {
    const target = mobileQuery.matches ? mobileMount : desktopMount;
    if (gd.parentElement !== target) target.appendChild(gd);
  };
  mountGame();
  mobileQuery.addEventListener?.('change', mountGame);
  gd.src = entry;

  const focusFrame = el => {
    try { el.focus(); } catch(_) {}
    try { el.contentWindow && el.contentWindow.focus && el.contentWindow.focus(); } catch(_) {}
  };
  gd.addEventListener('load', () => focusFrame(gd));
  document.getElementById('gameFrame')?.addEventListener('pointerdown', () => focusFrame(gd));
  document.getElementById('view-game')?.addEventListener('pointerdown', () => focusFrame(gd));

  // --- Leaderboard: slug + local storage keys ---
  const slug = CFG.slug || (location.pathname.split('/').filter(Boolean).slice(-2,-1)[0] || 'unknown');
  const LB_KEY = `LB_${slug}`;
  const LEGACY_KEYS = [
    `PIXELNET_LB_${slug}_v2_0`,
    `PIXELNET_LB_${slug}_v2_0`.replace(/-/g,'_'),
    `PIXELNET_LB_${slug}`,
  ];

  const lbLoadRaw = k => { try { return JSON.parse(localStorage.getItem(k) || '[]'); } catch(_) { return []; } };
  const lbSave    = arr => { try { localStorage.setItem(LB_KEY, JSON.stringify(arr || [])); } catch(_) {} };

  // Migrate legacy keys on first run
  (function migrate(){
    if (lbLoadRaw(LB_KEY).length) return;
    for (const k of LEGACY_KEYS) {
      const v = lbLoadRaw(k);
      if (Array.isArray(v) && v.length) { lbSave(v); break; }
    }
  })();

  const lbLoad = () => {
    let rows = lbLoadRaw(LB_KEY);
    try {
      if (rows.length >= 5) {
        const ini = rows.map(r => String((r && (r.initials || r.name)) || '').toUpperCase().slice(0,3));
        const allSame = ini.every(x => x && x === ini[0]);
        if ((allSame && ini[0] === 'JRF') || rows.some(r => r && (r.seeded || r.demo))) {
          localStorage.removeItem(LB_KEY);
          rows = [];
        }
      }
    } catch(_) {}
    return Array.isArray(rows) ? rows : [];
  };

  // --- Firebase REST helpers (shared leaderboard) ---
  const FB_BASE = FIREBASE_DB_URL ? `${FIREBASE_DB_URL}/lb/${slug}` : null;

  async function fbFetch(slugOverride) {
    if (licensed) return null;
    const base = FIREBASE_DB_URL
      ? `${FIREBASE_DB_URL}/lb/${slugOverride || slug}`
      : null;
    if (!base) return null;
    try {
      const r = await fetch(`${base}.json`);
      if (!r.ok) return null;
      const data = await r.json();
      if (!data || typeof data !== 'object') return [];
      return Object.values(data)
        .filter(x => x && typeof x.score === 'number')
        .sort((a,b) => (b.score||0)-(a.score||0) || (a.t||0)-(b.t||0))
        .slice(0, 10);
    } catch(_) { return null; }
  }

  async function fbPost(entry, slugOverride) {
    if (licensed) return false;
    const base = FIREBASE_DB_URL
      ? `${FIREBASE_DB_URL}/lb/${slugOverride || slug}`
      : null;
    if (!base) return false;
    try {
      const response = await fetch(`${base}.json`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(entry),
      });
      return response.ok;
    } catch(_) { return false; }
  }

  // --- Render leaderboard rows ---
  function renderBoard(targetId, rows) {
    const el = document.getElementById(targetId);
    if (!el) return;
    el.innerHTML = '';
    if (!rows.length) { el.innerHTML = `<div class="small">No scores yet.</div>`; return; }
    rows.slice(0,10).forEach((r, i) => {
      const name  = (r.initials || r.name || '???').toString().toUpperCase().slice(0,3);
      const score = (r.score ?? r.value ?? 0);
      const row = document.createElement('div');
      row.className = 'boardRow' + (i===0 ? ' top1' : '');
      row.innerHTML = `<div class="rank">${i+1}.</div><div class="name">${name}</div><div class="score">${score}</div>`;
      el.appendChild(row);
    });
  }

  // Refresh both desktop + mobile boards.
  // If Firebase is configured, shows global scores; otherwise falls back to local.
  const isAnalysisMode = r => String((r && r.mode) || '').toUpperCase().startsWith('A');
  const modeSplit = rows => ({
    std: rows.filter(r => !isAnalysisMode(r)).slice(0, 10),
    an:  rows.filter(r =>  isAnalysisMode(r)).slice(0, 10),
  });
  const setCloudStatus = text => document.querySelectorAll('[data-cloud-status]').forEach(el => { el.textContent = text; });
  const refreshBoards = async () => {
    if (licensed) return;
    if (isSpyderCasino) {
      const bjCloud = await fbFetch('spyder-blackjack');
      const heCloud = await fbFetch('spyder-holdem');
      setCloudStatus(bjCloud !== null && heCloud !== null ? 'GLOBAL' : 'LOCAL / OFFLINE');
      const bjRows = (bjCloud !== null ? bjCloud : lbLoadRaw('LB_spyder-blackjack')).slice(0, 100);
      const heRows = (heCloud !== null ? heCloud : lbLoadRaw('LB_spyder-holdem')).slice(0, 100);
      const bj = modeSplit(bjRows);
      const he = modeSplit(heRows);
      renderBoard('boardDesktopBjStd', bj.std);
      renderBoard('boardDesktopBjAn',  bj.an);
      renderBoard('boardDesktopHeStd', he.std);
      renderBoard('boardDesktopHeAn',  he.an);
      renderBoard('boardMobileBjStd', bj.std);
      renderBoard('boardMobileBjAn',  bj.an);
      renderBoard('boardMobileHeStd', he.std);
      renderBoard('boardMobileHeAn',  he.an);
      return;
    }
    const cloud = await fbFetch();
    setCloudStatus(cloud !== null ? 'GLOBAL' : 'LOCAL / OFFLINE');
    const rows  = (cloud !== null ? cloud : lbLoad()).slice(0, 10);
    renderBoard('boardDesktop', rows);
    renderBoard('boardMobile', rows);
  };
  refreshBoards();

  // --- Score intake: only messages from the active game iframe are trusted. ---
  const SPYDER_BOARDS = new Set(['spyder-blackjack', 'spyder-holdem']);
  let lastSig = '', lastAt = 0;
  async function addScore(rawScore, boardSlug, mode) {
    if (licensed || typeof rawScore !== 'number' || !Number.isFinite(rawScore)) return;
    if (!Number.isInteger(rawScore) || rawScore < 0 || rawScore > 10000000) return;
    const score = rawScore;
    const initials = getInitials();
    const now = Date.now();
    const target = isSpyderCasino && SPYDER_BOARDS.has(boardSlug) ? boardSlug : slug;
    const normalizedMode = String(mode || '').toUpperCase().startsWith('A') ? 'Analysis' : 'Standard';
    const sig = `${target}:${normalizedMode}:${initials}:${score}`;
    if (sig === lastSig && now - lastAt < 2000) return;
    lastSig = sig; lastAt = now;
    const entry = { initials, score, t: now, ...(isSpyderCasino ? {mode:normalizedMode} : {}) };
    const key = `LB_${target}`;
    const rows = Array.isArray(lbLoadRaw(key)) ? lbLoadRaw(key) : [];
    rows.push(entry);
    rows.sort((a,b) => (b.score||0)-(a.score||0) || (a.t||0)-(b.t||0));
    try { localStorage.setItem(key, JSON.stringify(rows.slice(0, 10))); } catch (_) {}
    await refreshBoards();
    const uploaded = await fbPost(entry, target);
    if (!uploaded) setCloudStatus('LOCAL ONLY — UPLOAD FAILED');
    else await refreshBoards();
  }
  window.addEventListener('message', e => {
    if (licensed || e.source !== gd.contentWindow) return;
    // Accept the active same-origin game only.
    if (e.origin !== location.origin) return;
    const d = e.data;
    if (!d || typeof d !== 'object') return;
    if (d.type === 'PIXELNET_SET_INITIALS' && d.initials) {
      const v = clean(d.initials);
      if (v) { setInitialsAll(v); renderInitials(); }
      return;
    }
    if (['GAME_OVER_SCORE','GAME_OVER','PIXELNET_SCORE','PIXELNET_SUBMIT_SCORE'].includes(d.type)) {
      const score = d.score ?? d.finalScore ?? d.value;
      addScore(score, d.slug, d.mode);
    }
  });

  // --- Initials modal ---
  const modalBack = document.getElementById('modalBack');
  const input = document.getElementById('initialsInput');
  const openModal = () => {
    modalBack.style.display = 'flex';
    modalBack.setAttribute('aria-hidden','false');
    input.value = getInitials().replace(/\?/g,'');
    input.focus(); input.select();
  };
  const closeModal = () => {
    modalBack.style.display = 'none';
    modalBack.setAttribute('aria-hidden','true');
  };
  document.getElementById('playerBtn').addEventListener('click', openModal);
  document.getElementById('modalClose').addEventListener('click', closeModal);
  modalBack.addEventListener('click', e => { if (e.target === modalBack) closeModal(); });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && modalBack.style.display === 'flex') closeModal();
  });
  function saveNow(){
    const v = clean(input.value);
    if (!v) return;
    setInitialsAll(v); renderInitials(); closeModal();
  }
  document.getElementById('saveInitials').addEventListener('click', saveNow);
  input.addEventListener('keydown', e => { if (e.key === 'Enter') saveNow(); });

  // --- Mobile tab switcher ---
  const btns = document.querySelectorAll('.tabBtn');
  const views = {
    game:  document.getElementById('view-game'),
    howto: document.getElementById('view-howto'),
    board: document.getElementById('view-board'),
  };
  const setTab = tab => {
    Object.keys(views).forEach(k => views[k].classList.toggle('hidden', k !== tab));
    btns.forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
    if (tab === 'game') setTimeout(() => focusFrame(gm), 50);
    if (tab === 'board') refreshBoards();
  };
  btns.forEach(b => b.addEventListener('click', () => setTab(b.dataset.tab)));
})();
