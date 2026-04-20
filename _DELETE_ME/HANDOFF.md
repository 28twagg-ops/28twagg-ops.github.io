# PIXEL-NET Arcade — Handoff Document

**Author of this doc:** Claude (Opus 4.7), 2026-04-17
**Owner:** Tyler (28twagg@gmail.com)
**Repo root:** `C:\Users\28twa\Desktop\Arcade` (GitHub Pages site)
**Purpose of this doc:** Let the next model pick up mid-task without re-reading the whole repo. It contains full context, the approved plan, ready-to-paste code for the shared wrapper shell, all 9 per-game stubs, a checklist, known gotchas, and a free strategy for adding more games.

---

## 1. Project goal (Tyler's words, paraphrased)

Tyler is building an online arcade of retro-style minigames hosted via GitHub Pages. Games are original HTML5 clones (renamed/reskinned to avoid copyright — e.g. "Millipede Chaos" instead of Centipede, "Knight Flight" instead of Joust, "Creek Crosser" instead of Frogger). It runs as a free-to-play game library. Goal is zero cost.

Tyler's current ask:
- Unify the way games are wrapped so one clean UI surrounds every game.
- Desktop: 3-column layout (How-To-Play / Game / Leaderboard).
- Mobile/small-screen: one main display that swaps between Game / How-To / Leaderboard via a 3-button tab bar at the bottom.
- Keep each game's actual game code (`game.html`, `embed.html`, engines) completely untouched.
- Also wants advice on how to add more retro games cheaply/automatically.

---

## 2. Current state of the repo

### Top-level layout

```
Arcade/
├── index.html                      ← home page (loads games from games.json)
├── games/                           ← stub iframe shims (NOT the real games — ignore)
│   └── */wrapper-v2.html           ← 10-line iframe-to-index.html (vestigial, unused by index.html)
├── PIXEL-NET/                       ← real site root
│   ├── games.json                   ← source of truth — 9 games with path/thumb/description
│   ├── index.html
│   ├── assets/                      ← thumbnails
│   ├── js/
│   │   ├── engine.js                ← shared game engine (258 lines)
│   │   ├── leaderboard.js
│   │   ├── golden-leaderboard.js
│   │   ├── mobile-play.js
│   │   └── games/                   ← per-game JS
│   └── games/
│       ├── caked-up-cats/           ← game.html + index.html + wrapper-v2.html
│       ├── creek-crosser__embedA/
│       ├── astrotype-v2/
│       ├── knight-flight-v2/
│       ├── retro-kombat-v2/
│       ├── logic-bomb-v2/
│       ├── neon-chase-v2/
│       ├── robo-arena-v2/
│       ├── millipede-chaos-v3/
│       └── (many other legacy/unused game folders)
├── CHANGELOG.md, LAYOUT_NOTES.txt, PATCH_NOTES.txt
└── .git/  .gitignore  .nojekyll
```

### How the home page finds games

`Arcade/index.html` has this (around line 906 / 965):

```js
const inPixelNet = /* detects if we're already under PIXEL-NET/ */;
const BASE = inPixelNet ? "./" : "./PIXEL-NET/";
const res  = await fetch(`${BASE}games.json`, { cache: 'no-store' });
```

So `PIXEL-NET/games.json` is the single source of truth for what games appear on the home page. Its paths are relative to `PIXEL-NET/`. Example entry:

```json
{ "name": "CAKED UP CATS", "type": "iframe",
  "path": "games/caked-up-cats/wrapper-v2.html",
  "thumb": "assets/caked-up-cats_thumb.png",
  "description": "Garden maze arcade. Eat cake, catch mice, avoid hazards." }
```

Clicking a tile navigates the browser to `PIXEL-NET/games/caked-up-cats/wrapper-v2.html`.

### The 9 games Tyler actually has live

Order matches `games.json`:

| # | Display name   | Folder                         | Entry file      |
|---|----------------|--------------------------------|-----------------|
| 1 | Caked Up Cats  | `caked-up-cats/`               | `game.html`     |
| 2 | Creek Crosser  | `creek-crosser__embedA/`       | `game.html`     |
| 3 | AstroType      | `astrotype-v2/`                | `game.html`     |
| 4 | Knight Flight  | `knight-flight-v2/`            | `embed.html`    |
| 5 | Retro Kombat   | `retro-kombat-v2/`             | `embed.html`    |
| 6 | Logic Bomb     | `logic-bomb-v2/`               | `game.html`     |
| 7 | Neon Chase     | `neon-chase-v2/`               | `game.html`     |
| 8 | Robo-Arena     | `robo-arena-v2/`               | `game.html`     |
| 9 | Millipede Chaos| `millipede-chaos-v3/`          | `game.html`     |

### The core problem

Each of those 9 folders has its own `wrapper-v2.html` that reimplements the chrome (topbar, exit, player initials, leaderboard, iframe, modal, mobile tabs). They've drifted into **three different UI patterns**:

1. **Best pattern — "Caked Up Cats" style** (~632 lines). Used by: caked-up-cats, millipede-chaos-v3, creek-crosser__embedA. CSS Grid desktop shell + a mobile `displayZone` that swaps a single panel with a bottom `.btnbar` (3 `.tabBtn` buttons: Game / How To Play / Leaderboard). Pretty. Consistent. This is the one Tyler likes.

2. **Middle pattern — "Astrotype v2" style** (~540 lines). Used by: astrotype-v2, neon-chase-v2, logic-bomb-v2. Similar but with different CSS class names (`.grid`, `.wrap`, `.mobileWrap`). Also functional but slightly different animations/modal styling.

3. **Legacy pattern — "Knight Flight" style** (~307–423 lines). Used by: knight-flight-v2, retro-kombat-v2, robo-arena-v2. Uses a `.tabs` fixed bottom bar and toggles `.active` class on the panels themselves (game shrinks when panels collapse). Works, but not as clean; iframe height can collapse.

Every wrapper also has its own ~300 lines of near-identical initials/leaderboard/postMessage JS — 9 slightly-drifted copies.

---

## 3. The approved plan

Tyler approved two choices via AskUserQuestion on 2026-04-17:

- **Scope:** Shared shell + stubs (option 1). Build `PIXEL-NET/wrapper/shell.css` and `shell.js`; rewrite each game's `wrapper-v2.html` as a ~30-line config stub.
- **Theming:** Per-game accent colors retained (option 1). Each stub passes its own `hero`/`hero2`/`bg0`/`bg2` palette.

**Approach summary:**

1. Create a new folder `PIXEL-NET/wrapper/` with two files: `shell.css` and `shell.js`.
2. For each of the 9 game folders: rename the existing `wrapper-v2.html` → `wrapper-v2.legacy.html` (backup), and write a new ~30-line `wrapper-v2.html` stub that:
   - Loads `../../wrapper/shell.css`
   - Defines `window.PX_WRAPPER = { title, slug, entry, theme, instructions }`
   - Loads `../../wrapper/shell.js`
   - `shell.js` injects the entire chrome into `<body>` and wires behavior.
3. `games.json` is **unchanged** — paths stay the same, so the home page and every bookmark still works.
4. Game files (`game.html`, `embed.html`, per-game JS) are **not touched**.

**Why this is safe:**
- `games.json` paths stay identical.
- The iframe `src` is `./game.html` or `./embed.html` (relative to the stub, which sits in the same folder as the original wrapper did) → paths stay identical.
- `localStorage` leaderboard keys stay identical (`LB_<slug>`), so existing high scores persist.
- `wrapper-v2.legacy.html` is kept in-place as a 1-step fallback: if something breaks, rename it back to `wrapper-v2.html`.

---

## 4. Ready-to-paste code

### 4.1 `PIXEL-NET/wrapper/shell.css`

Paste verbatim. Based on the Caked-Up-Cats pattern, but with theme-agnostic CSS variables that get set per-game by the stub.

```css
:root{
  /* THEME — overridden per-game by the stub via style="--hero:..." on <html> */
  --bg0:#0c0c16;
  --bg1:#111222;
  --bg2:#1a1a2e;
  --hero:#ff6b6b;
  --hero2:#ffd166;

  /* CONSTANTS */
  --text:#f3f6ff;
  --muted:rgba(243,246,255,.78);
  --border: rgba(255,255,255,.14);
  --panelBg: linear-gradient(180deg, rgba(20,20,32,.92), rgba(14,14,24,.88));
  --uiFont: system-ui,-apple-system,Segoe UI,Roboto,Arial;
  --arcadeFont: ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;

  --leftW: 320px;
  --rightW: 320px;
  --gap: 14px;
  --pad: 14px;
  --shellMaxW: 1720px;
  --centerMaxW: 1200px;
  --topbarH: 58px;
  --mobileBtnH: 58px;
  --mobileBtnGap: 10px;
}

*{box-sizing:border-box}
html,body{height:100%}
body{
  margin:0;
  font-family: var(--uiFont);
  color:var(--text);
  background:
    radial-gradient(1200px 700px at 15% 10%, color-mix(in srgb, var(--hero) 22%, transparent), transparent 56%),
    radial-gradient(1100px 760px at 85% 18%, color-mix(in srgb, var(--hero2) 18%, transparent), transparent 58%),
    radial-gradient(1200px 780px at 55% 108%, color-mix(in srgb, var(--hero) 12%, transparent), transparent 60%),
    linear-gradient(180deg, var(--bg0), var(--bg2));
  overflow:hidden;
}

.topbar{
  height: var(--topbarH);
  position:sticky; top:0; z-index:20;
  display:grid;
  grid-template-columns: auto 1fr auto;
  align-items:center;
  padding: 10px 14px;
  border-bottom:1px solid color-mix(in srgb, var(--hero) 28%, transparent);
  background: rgba(0,0,0,.38);
  backdrop-filter: blur(12px);
}
.top-left{ display:flex; gap:10px; align-items:center; }
.exit{
  display:inline-flex; align-items:center; gap:10px;
  text-decoration:none; color:var(--text);
  border:1px solid rgba(255,255,255,.14);
  padding:8px 12px; border-radius:14px;
  background: rgba(0,0,0,.18);
}
.exit:hover{
  border-color: color-mix(in srgb, var(--hero) 70%, rgba(255,255,255,.14));
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--hero) 18%, transparent);
}
.gameBadge{
  justify-self:center;
  padding:8px 16px;
  border-radius:999px;
  border:1px solid color-mix(in srgb, var(--hero) 52%, rgba(255,255,255,.12));
  background: linear-gradient(90deg,
    color-mix(in srgb, var(--hero) 22%, transparent),
    color-mix(in srgb, var(--hero2) 18%, transparent),
    rgba(0,0,0,.10));
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--hero) 12%, transparent), 0 18px 55px rgba(0,0,0,.30);
  font-weight: 950;
  letter-spacing: .16em;
  text-transform: uppercase;
  user-select:none;
}
.playerBtn{
  justify-self:end;
  display:flex; align-items:center; gap:10px;
  border:1px solid color-mix(in srgb, var(--hero) 42%, rgba(255,255,255,.12));
  padding:8px 12px;
  border-radius:999px;
  background: color-mix(in srgb, var(--hero) 10%, rgba(0,0,0,.22));
  cursor:pointer;
  user-select:none;
}
.playerBtn .muted{ color:rgba(243,246,255,.70); font-size:12px; letter-spacing:.14em; text-transform:uppercase; }
.playerBtn strong{ color:var(--hero); letter-spacing:.14em; font-family:var(--arcadeFont); }

.shell{
  max-width: var(--shellMaxW);
  margin: 0 auto;
  padding: var(--pad);
  height: calc(100vh - var(--topbarH));
  display:grid;
  grid-template-columns: var(--leftW) minmax(0,1fr) var(--rightW);
  gap: var(--gap);
  align-items: stretch;
}
.panel{
  border:1px solid rgba(255,255,255,.12);
  border-radius:18px;
  background: var(--panelBg);
  overflow:hidden;
  height: 100%;
  min-height: 0;
  box-shadow: 0 18px 70px rgba(0,0,0,.35);
  display:flex; flex-direction:column;
}
.panel h3{
  margin:0; padding:12px 14px;
  font-size:12px; letter-spacing:.20em; text-transform:uppercase;
  color:rgba(243,246,255,.78);
  border-bottom:1px solid rgba(255,255,255,.10);
  background: linear-gradient(90deg, color-mix(in srgb, var(--hero) 16%, transparent), rgba(0,0,0,.00));
}
.panel .content{ padding:14px; flex:1; min-height:0; display:flex; flex-direction:column; overflow:hidden; }
.panel.leaderboard .content{ overflow-y:auto; }

.small{ font-size:14px; color:rgba(243,246,255,.82); line-height:1.55 }
.clampList{ margin:0; padding-left:18px; display:flex; flex-direction:column; gap:10px; }
.clampList li{
  margin:0; padding:10px;
  border-radius:14px;
  border:1px solid color-mix(in srgb, var(--hero) 22%, transparent);
  background: rgba(0,0,0,.14);
}
.clampList li::marker{ color: color-mix(in srgb, var(--hero) 90%, #fff); }
.noteLine{ margin-top:12px; font-size:12px; color: rgba(243,246,255,.68); }

.center{ height:100%; min-height:0; display:flex; justify-content:center; }
.frame{
  width:100%; max-width: var(--centerMaxW); height:100%; min-height:0;
  border-radius:22px; overflow:hidden; background:#000;
  border: 1px solid color-mix(in srgb, var(--hero) 28%, transparent);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--hero) 10%, transparent), 0 30px 90px rgba(0,0,0,.52);
}
iframe{ width:100%; height:100%; border:0; display:block; background:#000; }

.boardStack{ display:flex; flex-direction:column; gap:10px; }
.boardRow{
  border:1px solid color-mix(in srgb, var(--hero2) 20%, rgba(255,255,255,.10));
  background:
    linear-gradient(90deg, color-mix(in srgb, var(--hero) 10%, transparent), rgba(0,0,0,.14)),
    linear-gradient(180deg, rgba(0,0,0,.14), rgba(0,0,0,.22));
  border-radius:16px; padding:12px;
  display:flex; align-items:center; justify-content:space-between;
}
.boardRow.top1{
  border-color: color-mix(in srgb, var(--hero) 70%, rgba(255,255,255,.10));
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--hero) 12%, transparent);
}
.rank,.name,.score{ font-family: var(--arcadeFont); }
.rank{ font-weight:950; color: var(--hero); min-width:42px; font-size:16px; letter-spacing:.08em; }
.name{ font-weight:900; color: rgba(243,246,255,.96); font-size:16px; letter-spacing:.12em; }
.score{ color: rgba(243,246,255,.92); font-size:16px; }

/* MOBILE */
.mobileWrap{ display:none; height: calc(100vh - var(--topbarH)); padding: var(--pad); }
.mobileStack{ height:100%; display:flex; flex-direction:column; gap:12px; }
.displayZone{ flex:1; min-height:0; display:flex; justify-content:center; }
.displayCard{ width:100%; max-width: var(--centerMaxW); border-radius:22px; overflow:hidden; height:100%; }
.hidden{ display:none; }
.mobileFrame{ border:1px solid color-mix(in srgb, var(--hero) 28%, transparent); background:#000; }
.btnbar{
  width:100%; max-width: var(--centerMaxW); margin: 0 auto; padding:10px;
  border:1px solid rgba(255,255,255,.12); border-radius:22px;
  background: linear-gradient(90deg, color-mix(in srgb, var(--hero) 10%, transparent), rgba(0,0,0,.18));
  backdrop-filter: blur(10px);
  display:flex; gap: var(--mobileBtnGap);
}
.tabBtn{
  flex:1; height: var(--mobileBtnH);
  border-radius:16px; border:1px solid rgba(255,255,255,.12);
  background: rgba(0,0,0,.18); color: rgba(243,246,255,.92);
  font-weight:900; cursor:pointer; letter-spacing:.02em;
}
.tabBtn.active{
  border-color: color-mix(in srgb, var(--hero) 78%, rgba(255,255,255,.12));
  background: linear-gradient(90deg, color-mix(in srgb, var(--hero) 22%, transparent), color-mix(in srgb, var(--hero2) 12%, transparent));
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--hero) 14%, transparent);
}
@media (max-width: 1100px){
  .shell{ display:none; }
  .mobileWrap{ display:block; }
}

/* MODAL */
.modalBack{
  position:fixed; inset:0; background: rgba(0,0,0,.60);
  display:none; align-items:center; justify-content:center; z-index:60;
}
.modalCard{
  width: min(560px, calc(100vw - 48px));
  border-radius:24px;
  border: 2px solid color-mix(in srgb, var(--hero) 78%, rgba(255,255,255,.10));
  background:
    radial-gradient(900px 420px at 50% 0%, color-mix(in srgb, var(--hero) 18%, transparent), transparent 58%),
    radial-gradient(900px 520px at 25% 85%, color-mix(in srgb, var(--hero2) 14%, transparent), transparent 62%),
    linear-gradient(180deg, rgba(0,0,0,.70), rgba(0,0,0,.78));
  box-shadow: 0 40px 160px rgba(0,0,0,.70);
  overflow:hidden; position:relative;
}
.modalClose{
  position:absolute; top:14px; right:14px;
  width:40px; height:40px; border-radius:999px;
  border:1px solid rgba(255,255,255,.14);
  background: rgba(0,0,0,.20);
  color: var(--text); cursor:pointer;
  display:flex; align-items:center; justify-content:center;
}
.modalInner{ padding: 22px 22px 18px; display:grid; gap:14px; }
.modalTitle{
  font-family: var(--arcadeFont);
  font-size:34px; font-weight:950; letter-spacing:.20em; text-transform:uppercase; text-align:center;
  background: linear-gradient(90deg, var(--hero), var(--hero2), rgba(243,246,255,.92));
  -webkit-background-clip:text; background-clip:text; color: transparent;
}
.modalInput{
  height:64px; border-radius:16px;
  border: 2px solid color-mix(in srgb, var(--hero) 78%, rgba(255,255,255,.10));
  background: rgba(0,0,0,.22); color: rgba(243,246,255,.96);
  font-family: var(--arcadeFont);
  font-size:26px; font-weight:950; letter-spacing:.28em; text-align:center; text-transform:uppercase;
  outline:none;
}
.modalSave{
  height:64px; border-radius:16px; border:0; cursor:pointer;
  font-family: var(--arcadeFont);
  font-size:20px; font-weight:950; letter-spacing:.18em; text-transform:uppercase;
  color: rgba(12,12,12,.94);
  background: linear-gradient(90deg, var(--hero), var(--hero2));
  box-shadow: 0 18px 60px rgba(0,0,0,.45);
}
.modalHint{ text-align:center; color: rgba(243,246,255,.72); font-size:12px; font-style: italic; }
```

### 4.2 `PIXEL-NET/wrapper/shell.js`

Paste verbatim. It is fully self-contained; no external deps required (works without `engine.js`). Reads `window.PX_WRAPPER`, injects markup, wires everything.

```js
(() => {
  const CFG = (window.PX_WRAPPER || {});
  const T = CFG.theme || {};
  const root = document.documentElement;
  // Apply per-game theme
  if (T.hero)  root.style.setProperty('--hero',  T.hero);
  if (T.hero2) root.style.setProperty('--hero2', T.hero2);
  if (T.bg0)   root.style.setProperty('--bg0',   T.bg0);
  if (T.bg2)   root.style.setProperty('--bg2',   T.bg2);

  const title = CFG.title || 'PIXEL-NET';
  document.title = title + ' — PIXEL-NET';

  const instructions = Array.isArray(CFG.instructions) ? CFG.instructions : [];
  const liHTML = instructions.map(x => `<li>${x}</li>`).join('');

  // Inject markup
  document.body.innerHTML = `
    <div class="topbar">
      <div class="top-left"><a class="exit" href="../../index.html" id="exitBtn">✕ EXIT</a></div>
      <div class="gameBadge" id="gameBadge">${title.toUpperCase()}</div>
      <div class="playerBtn" id="playerBtn" role="button" aria-label="Set player initials">
        <span class="muted">PLAYER</span><strong id="initials">???</strong>
      </div>
    </div>

    <div class="shell">
      <div class="panel">
        <h3>How To Play</h3>
        <div class="content">
          <ul id="instructionsDesktop" class="small clampList">${liHTML}</ul>
          <div class="noteLine">No scrolling.</div>
        </div>
      </div>
      <div class="center">
        <div class="frame"><iframe id="gameDesktop" allow="gamepad *; fullscreen *; autoplay"></iframe></div>
      </div>
      <div class="panel leaderboard">
        <h3>Leaderboard</h3>
        <div class="content"><div class="boardStack" id="boardDesktop"></div></div>
      </div>
    </div>

    <div class="mobileWrap">
      <div class="mobileStack">
        <div class="displayZone">
          <div class="displayCard mobileFrame" id="view-game">
            <iframe id="gameMobile" allow="gamepad *; fullscreen *; autoplay"></iframe>
          </div>
          <div class="panel displayCard hidden" id="view-howto">
            <div class="content">
              <ul id="instructionsMobile" class="small clampList">${liHTML}</ul>
              <div class="noteLine">No scrolling.</div>
            </div>
          </div>
          <div class="panel leaderboard displayCard hidden" id="view-board">
            <div class="content"><div class="boardStack" id="boardMobile"></div></div>
          </div>
        </div>
        <div class="btnbar">
          <button class="tabBtn active" data-tab="game" type="button">Game</button>
          <button class="tabBtn" data-tab="howto" type="button">How To Play</button>
          <button class="tabBtn" data-tab="board" type="button">Leaderboard</button>
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

  // --- Initials (shared across all games) ---
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

  // Exit: prefer history.back, fallback to home
  document.getElementById('exitBtn').addEventListener('click', e => {
    if (history.length > 1) { e.preventDefault(); history.back(); }
  });

  // --- Iframe (desktop + mobile share src) ---
  const entry = CFG.entry || './game.html';
  const gd = document.getElementById('gameDesktop');
  const gm = document.getElementById('gameMobile');
  gd.src = entry;
  gm.src = entry;

  const focusFrame = el => {
    try { el.focus(); } catch(_) {}
    try { el.contentWindow && el.contentWindow.focus && el.contentWindow.focus(); } catch(_) {}
  };
  gd.addEventListener('load', () => focusFrame(gd));
  gm.addEventListener('load', () => focusFrame(gm));
  document.querySelector('.center .frame')?.addEventListener('pointerdown', () => focusFrame(gd));
  document.querySelector('#view-game')?.addEventListener('pointerdown', () => focusFrame(gm));

  // --- Leaderboard (localStorage Top-10 per slug) ---
  const slug = CFG.slug || (location.pathname.split('/').filter(Boolean).slice(-2,-1)[0] || 'unknown');
  const LB_KEY = `LB_${slug}`;
  const LEGACY_KEYS = [
    `PIXELNET_LB_${slug}_v2_0`,
    `PIXELNET_LB_${slug}_v2_0`.replace(/-/g,'_'),
    `PIXELNET_LB_${slug}`,
  ];

  const lbLoadRaw = k => { try { return JSON.parse(localStorage.getItem(k) || '[]'); } catch(_) { return []; } };
  const lbSave    = arr => { try { localStorage.setItem(LB_KEY, JSON.stringify(arr || [])); } catch(_) {} };

  // Migrate legacy on first run if new is empty
  (function migrate(){
    if (lbLoadRaw(LB_KEY).length) return;
    for (const k of LEGACY_KEYS) {
      const v = lbLoadRaw(k);
      if (Array.isArray(v) && v.length) { lbSave(v); break; }
    }
  })();

  const lbLoad = () => {
    let rows = lbLoadRaw(LB_KEY);
    // Strip known seeded "JRF" demo rows and any flagged demo entries
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

  function renderBoard(targetId, rows) {
    const el = document.getElementById(targetId);
    if (!el) return;
    el.innerHTML = '';
    if (!rows.length) { el.innerHTML = `<div class="small">No scores yet.</div>`; return; }
    rows.slice(0,10).forEach((r, i) => {
      const name = (r.initials || r.name || '???').toString().toUpperCase().slice(0,3);
      const score = (r.score ?? r.value ?? 0);
      const row = document.createElement('div');
      row.className = 'boardRow' + (i===0 ? ' top1' : '');
      row.innerHTML = `<div class="rank">${i+1}.</div><div class="name">${name}</div><div class="score">${score}</div>`;
      el.appendChild(row);
    });
  }
  const refreshBoards = () => {
    const rows = lbLoad().slice(0,10);
    renderBoard('boardDesktop', rows);
    renderBoard('boardMobile', rows);
  };
  refreshBoards();

  // --- Score intake (dedupe burst) ---
  let lastSig = '', lastAt = 0;
  function addScore(rawScore) {
    const initials = getInitials() || '???';
    const score = Math.max(0, Math.floor(Number(rawScore) || 0));
    const now = Date.now();
    const sig = `${initials}:${score}`;
    if (sig === lastSig && (now - lastAt) < 1200) return;
    lastSig = sig; lastAt = now;
    const rows = lbLoad();
    rows.push({ initials, score, t: now });
    rows.sort((a,b) => (b.score||0)-(a.score||0) || (a.t||0)-(b.t||0));
    lbSave(rows.slice(0,10));
    refreshBoards();
  }

  window.addEventListener('message', e => {
    const d = e.data || {};
    if (!d || !d.type) return;
    if (d.type === 'PIXELNET_SET_INITIALS' && d.initials) {
      const v = clean(d.initials);
      if (v) { setInitialsAll(v); renderInitials(); }
      return;
    }
    if (d.type === 'GAME_OVER_SCORE' || d.type === 'GAME_OVER' ||
        d.type === 'PIXELNET_SCORE' || d.type === 'PIXELNET_SUBMIT_SCORE') {
      const s = d.score != null ? d.score : (d.finalScore != null ? d.finalScore : d.value);
      if (s != null) addScore(s);
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
  };
  btns.forEach(b => b.addEventListener('click', () => setTab(b.dataset.tab)));
})();
```

### 4.3 Stub template (paste into every game's `wrapper-v2.html`)

```html
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>__TITLE__ — PIXEL-NET</title>
<script>
window.PX_WRAPPER = {
  title: "__TITLE__",
  slug: "__SLUG__",
  entry: "__ENTRY__",
  theme: { hero: "__HERO__", hero2: "__HERO2__", bg0: "__BG0__", bg2: "__BG2__" },
  instructions: [ __INSTRUCTIONS__ ]
};
</script>
<link rel="stylesheet" href="../../wrapper/shell.css">
</head>
<body>
<script src="../../wrapper/shell.js"></script>
</body>
</html>
```

---

## 5. Per-game stub config (all 9 — ready to fill the template)

All colors and entry files were extracted from the existing legacy wrappers on 2026-04-17. Use exactly these values.

### 5.1 Caked Up Cats — `games/caked-up-cats/wrapper-v2.html`
```js
title: "Caked Up Cats",
slug:  "caked-up-cats",
entry: "./game.html",
theme: { hero:"#ff6b6b", hero2:"#ffd166", bg0:"#0c1a0f", bg2:"#17461f" },
instructions: [
  "Move with Arrow Keys / WASD.",
  "Navigate the garden maze and collect treats.",
  "Avoid hazards and enemies.",
  "On Game Over, your score is auto-submitted."
]
```

### 5.2 Creek Crosser — `games/creek-crosser__embedA/wrapper-v2.html`
```js
title: "Creek Crosser",
slug:  "creek-crosser",
entry: "./game.html",
theme: { hero:"#f1c40f", hero2:"#ffb86b", bg0:"#1b2a24", bg2:"#2c3e34" },
instructions: [
  "Use Arrow Keys / WASD to move.",
  "Cross roads + rivers without getting hit.",
  "Time moves — patterns matter.",
  "Reach goals repeatedly to build score."
]
```
Note: slug is `creek-crosser` (NOT `creek-crosser__embedA`) to preserve existing leaderboard data.

### 5.3 AstroType — `games/astrotype-v2/wrapper-v2.html`
```js
title: "AstroType",
slug:  "astrotype",
entry: "./game.html",
theme: { hero:"#ffd24a", hero2:"#39ff14", bg0:"#000000", bg2:"#0a0a0a" },
instructions: [
  "Type the falling alien codes to defend the lunar base.",
  "Keyboard: type the code exactly.",
  "Keep streaks for bonus zaps.",
  "On Game Over, your score is auto-submitted."
]
```
Note: slug kept as `astrotype` (not `astrotype-v2`) for leaderboard continuity.

### 5.4 Knight Flight — `games/knight-flight-v2/wrapper-v2.html`
```js
title: "Knight Flight",
slug:  "knight-flight",
entry: "./embed.html",
theme: { hero:"#f5c84c", hero2:"#7aa6ff", bg0:"#05060a", bg2:"#07091a" },
instructions: [
  "Stay high. Joust well.",
  "Arrow keys: move.",
  "Space / Up: flap.",
  "Knock opponents below you to win."
]
```

### 5.5 Retro Kombat — `games/retro-kombat-v2/wrapper-v2.html`
```js
title: "Retro Kombat",
slug:  "retro-kombat",
entry: "./embed.html",
theme: { hero:"#ff2b2b", hero2:"#d0d4da", bg0:"#070508", bg2:"#11060a" },
instructions: [
  "Tournament Edition — placeholder build.",
  "Check back soon for full roster.",
  "Mobile controls will appear automatically."
]
```
Note: only has `embed.html` + `coming-soon.html`, no `game.html`.

### 5.6 Logic Bomb — `games/logic-bomb-v2/wrapper-v2.html`
```js
title: "Logic Bomb",
slug:  "logic-bomb",
entry: "./game.html",
theme: { hero:"#00ff88", hero2:"#00ccff", bg0:"#050510", bg2:"#04040e" },
instructions: [
  "Move: Arrow Keys / WASD.",
  "Bomb: SPACE (place / detonate).",
  "Goal: collect data nodes, avoid sentries.",
  "Defuse fast — timer ticks down."
]
```

### 5.7 Neon Chase — `games/neon-chase-v2/wrapper-v2.html`
```js
title: "Neon Chase",
slug:  "neon-chase",
entry: "./game.html",
theme: { hero:"#00ff6a", hero2:"#4dd7ff", bg0:"#050414", bg2:"#0a0820" },
instructions: [
  "Arrows / WASD: move orb.",
  "Collect bits; avoid drones.",
  "Power-ups let you eat drones.",
  "Score stacks while you stay alive."
]
```

### 5.8 Robo-Arena — `games/robo-arena-v2/wrapper-v2.html`
```js
title: "Robo-Arena",
slug:  "robo-arena",
entry: "./game.html",
theme: { hero:"#00cfff", hero2:"#ff2bd6", bg0:"#05060a", bg2:"#070a12" },
instructions: [
  "Move with WASD.",
  "Shoot with Arrow Keys (twin-stick).",
  "Protect humans and survive escalating waves.",
  "Mobile: on-screen sticks appear automatically."
]
```

### 5.9 Millipede Chaos — `games/millipede-chaos-v3/wrapper-v2.html`
```js
title: "Millipede Chaos",
slug:  "millipede-chaos",
entry: "./game.html",
theme: { hero:"#ff1f1f", hero2:"#7fdf8a", bg0:"#090000", bg2:"#060000" },
instructions: [
  "Move: Arrow Keys / WASD (mobile: drag).",
  "Fire: Space (mobile: tap / hold).",
  "Clear millipede segments, survive spiders and bees.",
  "Game Over: score auto-saves locally."
]
```

---

## 6. Execution checklist

Do these in order. Each step is independent except as noted.

- [ ] **1. Create folder** `PIXEL-NET/wrapper/` (mkdir).
- [ ] **2. Write** `PIXEL-NET/wrapper/shell.css` from §4.1.
- [ ] **3. Write** `PIXEL-NET/wrapper/shell.js` from §4.2.
- [ ] **4. For each of the 9 game folders** (in order, one by one):
  - [ ] 4a. Rename existing `wrapper-v2.html` → `wrapper-v2.legacy.html` (use `git mv` or a plain rename; keep it in the same folder).
  - [ ] 4b. Write a fresh `wrapper-v2.html` using the stub template (§4.3) filled with that game's config from §5.
  - [ ] 4c. Open it locally in a browser to confirm the game loads, leaderboard shows, and the mobile tab bar works when the window is narrowed below 1100px.
- [ ] **5. Verify `games.json` is untouched** — it should not need editing.
- [ ] **6. Smoke test** by opening `index.html` (the home page) and clicking each tile → every game should load with the new unified wrapper.
- [ ] **7. Commit** with a message like `chore(wrapper): unify 9 game wrappers behind shared shell`.
- [ ] **8. Optional cleanup (later):** once everything is verified for a week, delete the `wrapper-v2.legacy.html` backups.

---

## 7. Known gotchas and their fixes

### 7.1 "The iframe won't take keyboard input after I click a tab"
Cause: focus is lost when the mobile view swaps. Fix is already in `shell.js` `setTab()` — it calls `focusFrame(gm)` after switching back to the game tab. If it still happens, also add `pointerdown` handler on `#view-game`.

### 7.2 "Scores from an older leaderboard disappeared"
Cause: the slug changed. Make sure you use the **short slugs** in §5 (`creek-crosser`, not `creek-crosser__embedA`). `shell.js` also auto-migrates from three legacy key formats (see `LEGACY_KEYS`). If you need to force-recover data, check `localStorage` in DevTools for `LB_<anything>`.

### 7.3 "The game iframe shows a blank page"
Causes and fixes, in order:
1. `entry` string is wrong. Some games have `game.html`, others have `embed.html`. Check §5.
2. GitHub Pages is caching. Hard-refresh (Ctrl+Shift+R). Consider adding a `?v=N` query to `shell.js` when you change it, e.g. `<script src="../../wrapper/shell.js?v=2"></script>`.
3. The game itself is broken. Open the game file directly (`PIXEL-NET/games/<folder>/game.html`) to confirm it runs outside the iframe.

### 7.4 "CSS variables don't seem to apply"
Cause: some browsers (very old) don't support `color-mix()`. All modern browsers (2023+) do. If you need an older-browser fallback, add a single background color on the body.

### 7.5 "Exit button goes the wrong place"
It uses `history.back()` when possible, otherwise `../../index.html`. If the user deep-linked directly to a game (no history), they'll land at the PIXEL-NET home page, which is correct.

### 7.6 "A game prompts for its own initials"
A few games (millipede, maybe others) had their own initials system. The shell listens for `PIXELNET_SET_INITIALS` postMessage so the game and wrapper stay in sync. If a game pops its own modal, edit the game's JS to either not prompt when inside an iframe (check `window.parent !== window`) or to send `{type:'PIXELNET_SET_INITIALS', initials}` upward.

### 7.7 "Score isn't saving to the leaderboard"
The shell accepts four postMessage `type` values: `GAME_OVER_SCORE`, `GAME_OVER`, `PIXELNET_SCORE`, `PIXELNET_SUBMIT_SCORE`. The game must do something like:

```js
window.parent.postMessage({ type: 'GAME_OVER_SCORE', score: myFinalScore }, '*');
```

If a legacy game uses a different type, add it to the `if` in `shell.js` line that checks types.

### 7.8 "Looks broken on really tall phones"
`calc(100vh - var(--topbarH))` can be off on iOS Safari because of the URL bar. If you hit this, replace `100vh` with `100svh` (small-viewport height) in `.shell` and `.mobileWrap`.

### 7.9 "GitHub Pages serves an old version"
`.nojekyll` is already in place. For stubborn cache, append `?v=N` to the script/css tags (search-and-replace across all 9 stubs is trivial).

### 7.10 "games.json path 404s"
Remember the path is relative to PIXEL-NET: `games/caked-up-cats/wrapper-v2.html`. It works because `index.html` sets `BASE` correctly. Don't prepend a slash.

---

## 8. Adding more retro games — free and semi-automated

Tyler's big secondary ask: pull in more games without paying, ideally without hand-coding each one. Here's the strategy.

### 8.1 Stay copyright-safe
- **Don't** emulate ROMs of named commercial games (Pac-Man, Donkey Kong, etc.) — even free JS ports are usually infringing on trademarks if names/characters are reused.
- **Do** use open-source HTML5 clones with permissive licenses (MIT, Apache 2.0, BSD, CC0, Unlicense) and rename them into your PIXEL-NET universe (exactly what's already happening — "Joust" → "Knight Flight").
- Games under GPL are fine to host but any changes you make must also be released under GPL. For a free arcade site that's usually okay; just track license files.

### 8.2 Best free sources (all legal to host)

1. **js13kGames archive** — https://js13kgames.com/ . Annual 13-kilobyte JS game jam. Every entry is downloadable and almost all use MIT or similar. ~500+ small retro-style games.
2. **GitHub search with license filter** — https://github.com/search?q=html5+game+retro+license%3Amit&type=repositories . Use the filter `license:mit language:JavaScript` (or `license:apache-2.0`). Clone anything that looks relevant, check the LICENSE file, reskin.
3. **itch.io → filter "free" + "HTML5"** — https://itch.io/games/free/html5 . Many devs explicitly mark their games as free to reuse. Always read the itch page for license / credits.
4. **The opensource-games list** — https://github.com/leereilly/games . Curated list of browser games with source links; easiest to browse.
5. **OpenGameArt.org** — free assets (sprites, music) if you ever want to reskin a game to make it more clearly yours.
6. **Phaser examples** — https://phaser.io/examples . Phaser is MIT. Tons of game-mechanic demos you can combine.

### 8.3 Semi-automated import pipeline (recommended — free, uses Gemini Pro or Claude)

Since Tyler has Gemini Pro, here's the workflow:

**Step 1 — Collect candidates.** Write a small text file `candidates.txt` listing repo URLs / game URLs you want. Either hand-pick from the sources above, or run this Gemini prompt once a month:

> "List 20 open-source HTML5 retro-style minigames on GitHub with MIT/Apache/BSD/CC0 licenses. Prefer single-file or small-codebase games. Output as a markdown table with: name, mechanic, repo URL, license, approx file count, and a 1-sentence description. Exclude anything that includes trademarked names or sprites."

**Step 2 — Clone into staging.** Run a script (Python or Bash) that `git clone`s each repo into `PIXEL-NET/games/_incoming/<slug>/`. Example Python skeleton:

```python
# scripts/import_games.py
import subprocess, os, json, shutil, pathlib
INCOMING = pathlib.Path("PIXEL-NET/games/_incoming")
INCOMING.mkdir(parents=True, exist_ok=True)
with open("candidates.txt") as f:
    for line in f:
        url = line.strip()
        if not url or url.startswith("#"): continue
        slug = url.rstrip("/").split("/")[-1].replace(".git","").lower()
        dest = INCOMING / slug
        if dest.exists():
            print("skip", slug); continue
        subprocess.run(["git","clone","--depth","1", url, str(dest)], check=True)
        # Strip .git so it doesn't become a submodule
        shutil.rmtree(dest/".git", ignore_errors=True)
print("done")
```

**Step 3 — Let the AI write the stub.** For each cloned game, feed the main HTML file into Gemini Pro with this prompt:

> "I have a PIXEL-NET arcade that uses a shared wrapper. Here's the game's entry HTML file. (1) Identify the entry file a wrapper should iframe (`game.html`, `index.html`, or `play.html`). (2) Propose a reskinned PIXEL-NET name that avoids trademarks. (3) Write 3–4 one-sentence How-To-Play lines. (4) Choose a 2-color theme (hero, hero2) + dark background (bg0, bg2) that fits the game's mood. Output as JSON ready to paste into `window.PX_WRAPPER = {...}`."

Paste Gemini's JSON into the template in §4.3 → save as `wrapper-v2.html` in the new game's folder. Add an entry to `games.json`. Done.

**Step 4 — Reskin if needed.** If the game has trademarked art, ask Gemini to generate palette-swap sprites using SVG or a canvas filter. Or use OpenGameArt.org sprites.

**Step 5 — Score-submission retrofit.** Most imported games won't call `postMessage` for scores. Ask the AI: *"Find where this game calls game-over and add `window.parent.postMessage({type:'GAME_OVER_SCORE', score: <variable>}, '*')`"*. It's usually a one-liner edit.

### 8.4 Keeping this zero-cost

- **Hosting:** GitHub Pages (already in use) — free forever for public repos.
- **AI:** Gemini Pro is already paid. Use its free tier limits generously; use Claude/Anthropic API free trial for side-by-side verification.
- **CI:** GitHub Actions has 2000 free minutes/month. If you want auto-import, add a workflow that runs `import_games.py` on a cron schedule.
- **Thumbnails:** Capture with a headless-browser script (Puppeteer, MIT) or generate placeholders with a prompt like *"Generate a retro pixel-art thumbnail, 400×300, for the game 'Creek Crosser'"* via a free image model. Commit to `PIXEL-NET/assets/`.

### 8.5 Things to NEVER import automatically

- Anything with proprietary Nintendo, Sega, Atari, Namco, Konami, Capcom, Taito, etc. sprites/names.
- ROMs or emulator cores (even "freeware" ROMs can be shaky).
- Packages with no license file. If there's no LICENSE, assume "all rights reserved" — skip it.

---

## 9. How to effectively use Gemini Pro for this project

Gemini is great for multi-file edits and large code reviews. Specific prompts that work well:

**A. Migrating one game** (paste this to Gemini and attach the legacy file):

> "Here is `PIXEL-NET/games/<slug>/wrapper-v2.legacy.html`. Based on §5 of my HANDOFF.md, produce the new stub `wrapper-v2.html`. Keep the same color palette it already had. Output only the file content."

**B. Adding a brand-new game** (after cloning):

> "Here is the main HTML file of a newly cloned game at path `<path>`. (1) Pick the iframe entry. (2) Pick slug (kebab-case). (3) Write 3–4 instructions. (4) Extract a 2-accent color palette. (5) Output the stub following HANDOFF.md §4.3. Also tell me what to add to `PIXEL-NET/games.json`."

**C. Score-hook retrofit**:

> "This game doesn't notify the wrapper on game over. Find the line that ends a run and add `window.parent.postMessage({type:'GAME_OVER_SCORE', score: <var>}, '*')`. Return just the unified diff."

**D. Thumbnail naming**:

> "Propose a 400×300 pixel-art thumbnail prompt for a game called '<name>' with mechanic '<one line>'. Output: one sentence."

---

## 10. What Claude already did in this session (as of 2026-04-17)

- Read every wrapper referenced by `games.json` and confirmed the 3 diverging patterns.
- Catalogued entry files and color palettes for all 9 games (table in §5).
- Confirmed `games.json` paths and the `BASE` resolution in the home page.
- Asked Tyler which approach (he picked shared-shell + stubs with per-game colors).
- Authored this handoff document.

**What Claude did NOT write yet** (the next model's job):
- `PIXEL-NET/wrapper/shell.css`
- `PIXEL-NET/wrapper/shell.js`
- The 9 new stub `wrapper-v2.html` files
- The 9 `wrapper-v2.legacy.html` renames

All the code is already in this doc (§4 and §5). The next model can copy-paste without needing to rediscover anything.

---

## 11. Quick reference: commands the next model will likely run

```bash
# Create the wrapper folder
mkdir -p PIXEL-NET/wrapper

# Rename existing wrapper to .legacy.html (do this for each of the 9 folders)
cd PIXEL-NET/games/caked-up-cats && mv wrapper-v2.html wrapper-v2.legacy.html

# Serve locally for a smoke test (Python 3)
cd C:/Users/28twa/Desktop/Arcade && python -m http.server 8080
# then visit http://localhost:8080/

# Commit
git add PIXEL-NET/wrapper PIXEL-NET/games/*/wrapper-v2.html PIXEL-NET/games/*/wrapper-v2.legacy.html
git commit -m "chore(wrapper): unify 9 game wrappers behind shared shell"
git push
```

---

## 12. One-line summary for the next model

> Paste §4.1 and §4.2 into `PIXEL-NET/wrapper/shell.{css,js}`. For each of the 9 games in §5, rename the existing `wrapper-v2.html` to `wrapper-v2.legacy.html` and drop in a new stub built from the §4.3 template filled with that game's config. Do not touch `games.json` or any game's internal code. Smoke-test locally, then commit.

Good luck. — Claude
